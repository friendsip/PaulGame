# Phase 1 — Golden-Hour Graphics Implementation Spec

**Target:** `/Users/marktrudinger/ntgame/src/main.js` (single file, three@0.160 via importmap) + `/Users/marktrudinger/ntgame/index.html`.
**Method:** Implement in the numbered order below. After **every** step, take a headless screenshot and compare against the per-step checklist in §9. Do NOT batch steps — the black-sky and stall regressions are caught only by screenshotting between edits.

**Non-negotiable invariants (the history bugs):**
- **Exactly ONE tone-map + sRGB encode in the whole frame.** After Phase 1 that single encode lives in `OutputPass`. The renderer keeps `toneMapping = ACESFilmicToneMapping` (OutputPass *reads* it) — do **NOT** set `NoToneMapping` (that makes OutputPass a no-op → flat/over-bright). The inline `pow(aces(col),0.4545)` in the sky/water shaders must be **removed** (else double tone-map + double gamma → washed sky/sea, and clamped HDR → no bloom).
- **No NaN/Inf into the HalfFloat buffer.** A NaN through HalfFloat→bloom manifests as the classic black sky. Keep the sky `dir.y` clamp; clamp the final grade output.
- **Headless software renderer can stall on heavy frames.** Keep `pixelRatio` capped, default quality = **Med** (not High) on first paint, and the foam/glitter math must stay cheap (no loops over all towns per-pixel — pass the nearest town as a uniform from JS).

---

## Step 1 — index.html importmap additions

These addon files all `import { ... } from 'three'` (bare specifier) and resolve their *own* deps with relative paths, so the **only** mandatory new line is the `three/addons/` prefix (trailing slash on BOTH sides is required, else the prefix silently fails). All URLs below were verified HTTP 200 for `three@0.160.0`.

**BEFORE** (`index.html` lines 333–339):
```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
  }
}
</script>
```

**AFTER:**
```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>
```

Then add the imports at the top of `src/main.js`, right after line 6 (`import * as THREE from 'three';`):
```js
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';
```

**Verify after Step 1:** game still boots, no console error, image unchanged (no pipeline wired yet). A 404 / unresolved-specifier error here means the trailing slash is wrong.

---

## Step 2 — Renderer + color pipeline (shader edits)

### 2a. Renderer config — KEEP AS-IS (lines 31–33)
```js
renderer.outputColorSpace   = THREE.SRGBColorSpace;        // line 31 — keep
renderer.toneMapping        = THREE.ACESFilmicToneMapping; // line 32 — keep (OutputPass reads it)
renderer.toneMappingExposure = 1.05;                       // line 33 — retuned in Step 4 to 1.0
```
Do **not** set `NoToneMapping`. Do **not** pass a custom render target to the composer — the r160 `EffectComposer` default target is already `HalfFloatType`, giving HDR headroom for bloom for free.

### 2b. Sky fragment shader — remove inline tone-map + aces, output LINEAR HDR

**BEFORE** (lines 90–101):
```glsl
    uniform vec3 topColor, midColor, botColor, sunColor, sunDir;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
    void main(){
      vec3 dir = normalize(vRay);
      float h = clamp(dir.y, -0.1, 1.0);
      vec3 col = mix(botColor, midColor, smoothstep(0.0, 0.25, h));
      col = mix(col, topColor, smoothstep(0.18, 0.75, h));
      float s = max(dot(dir, normalize(sunDir)), 0.0);
      col += sunColor * pow(s, 220.0) * 1.6;            // sun disc
      col += sunColor * pow(s, 8.0) * 0.18;             // sun glow
      col = pow(aces(col), vec3(0.4545));               // tone-map + sRGB (match scene)
      gl_FragColor = vec4(col, 1.0);
```

**AFTER** (delete the `aces` helper on line 91 and the tone-map on line 100; push sun terms a touch since the old `aces()` used to lift them; guard against NaN):
```glsl
    uniform vec3 topColor, midColor, botColor, sunColor, sunDir;
    void main(){
      vec3 dir = normalize(vRay);
      float h = clamp(dir.y, -0.1, 1.0);
      vec3 col = mix(botColor, midColor, smoothstep(0.0, 0.25, h));
      col = mix(col, topColor, smoothstep(0.18, 0.75, h));
      float s = max(dot(dir, normalize(sunDir)), 0.0);
      col += sunColor * pow(s, 220.0) * 2.4;            // sun disc (HDR, will bloom)
      col += sunColor * pow(s, 8.0)   * 0.28;           // sun glow (HDR)
      col = max(col, 0.0);                               // NaN/negativity guard before HDR buffer
      gl_FragColor = vec4(col, 1.0);                     // LINEAR HDR — OutputPass encodes once
```

### 2c. Ocean fragment shader — same removal, keep specular unclamped

**BEFORE** (lines 173–199):
```glsl
    uniform vec3 uSunDir, uSunColor, uDeep, uShallow, uFogColor, uCamPos;
    uniform float uFogNear, uFogFar;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
    ...
      // sun specular (Blinn-Phong)
      vec3 H = normalize(uSunDir + V);
      float spec = pow(max(dot(N, H), 0.0), 220.0);
      col += uSunColor * spec * 1.4;
      // soft diffuse sparkle
      col += uSunColor * max(dot(N, uSunDir), 0.0) * 0.05;
      float dist = length(uCamPos - vWorld);
      float fog = smoothstep(uFogNear, uFogFar, dist);
      col = mix(col, uFogColor, fog);
      col = pow(aces(col), vec3(0.4545));               // tone-map + sRGB (match scene)
      gl_FragColor = vec4(col, 1.0);
```

**AFTER** (delete the `aces` helper on line 175 and the tone-map on line 198; brighten glitter — full Step 8 glitter block replaces these specular lines, shown here minimal):
```glsl
    uniform vec3 uSunDir, uSunColor, uDeep, uShallow, uFogColor, uCamPos;
    uniform float uFogNear, uFogFar;
    ...
      // sun specular (Blinn-Phong) — unclamped so it exceeds 1.0 and blooms
      vec3 H = normalize(uSunDir + V);
      float spec = pow(max(dot(N, H), 0.0), 220.0);
      col += uSunColor * spec * 2.2;
      // soft diffuse sparkle
      col += uSunColor * max(dot(N, uSunDir), 0.0) * 0.06;
      float dist = length(uCamPos - vWorld);
      float fog = smoothstep(uFogNear, uFogFar, dist);
      col = mix(col, uFogColor, fog);
      col = max(col, 0.0);                               // guard
      gl_FragColor = vec4(col, 1.0);                     // LINEAR HDR
```

### 2d. Color-space of the hex uniform colors — DO NOT convert (Verify correction)

The sky/water color uniforms (`topColor`, `midColor`, `botColor`, `sunColor`, `uDeep`, `uShallow`, `uSunColor`, `uFogColor`) are authored as sRGB hex and used directly in shader math. One Verify pass argued to call `.convertSRGBToLinear()` on each; the adversarial Verify **rejected** that. **Do NOT add `convertSRGBToLinear()`.** Reason: it changes two coupled things at once (color management *and* the look) and makes the black-sky/wash regression hard to bisect. Instead, treat these hex values as the **artistic linear palette**, leave them as-is, and re-tune their *look* by eye in Step 4 against the final OutputPass-encoded image. If after Step 4 the blue sky/water read too bright or desaturated, darken/saturate the **hex literals** directly — keep the encode count at one and the conversion count at zero.

**Verify after Step 2:** This step is wired together with Step 3 (the shaders now output linear and *require* the composer). Do them as one commit but screenshot after Step 3. Expected once both are in: sky/sea look the same or slightly punchier than before — **NOT** milky/grey (milky ⇒ a `pow(0.4545)` was left in, or `aces()` not deleted), **NOT** black (NaN ⇒ check the `max(col,0.0)` guards and `dir.y` clamp).

---

## Step 3 — EffectComposer wiring

Add this block immediately after the scene/camera/lights/ocean are created and after `updateSky` is defined (e.g. just before the `animate()` definition, so all referenced objects exist). The `gradeVignettePass` and `bloomPass` here are referenced by Steps 5/6/7 — declare them at module scope so the quality switch can reach them.

```js
// ----------------------------------------------------------------------------
//  Post-processing composer  (RenderPass -> Bloom -> Grade/Vignette -> Output)
// ----------------------------------------------------------------------------
const composer = new EffectComposer(renderer);      // default RT is HalfFloatType (HDR)
composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55,   // strength  (Step 6)
  0.75,   // radius
  0.85    // threshold
);
composer.addPass(bloomPass);

const gradeVignettePass = new ShaderPass(GradeVignetteShader);  // GradeVignetteShader from Step 5
composer.addPass(gradeVignettePass);

const outputPass = new OutputPass();                // tone-map + sRGB encode, LAST
composer.addPass(outputPass);
```

> Order is load-bearing: **RenderPass → UnrealBloomPass → GradeVignette ShaderPass → OutputPass**. The grade pass runs in **linear** space (before OutputPass) so its clamp must NOT crush HDR before bloom — but bloom already ran, so a gentle clamp here is fine. (Grain/lift read fine in linear at these subtle amounts; if the faded-film look reads weak, that's expected — Phase 1 keeps the grade gentle.)

### 3a. Swap the draw call (line 1864)
**BEFORE:** `renderer.render(scene, camera);`
**AFTER:** `composer.render();`

Add the grade time uniform update inside `animate()`, in both the active and the "world-keepalive" branches (so the grade animates even while paused/reading), right before `applyShake()`:
```js
gradeVignettePass.uniforms.uTime.value = t;
```

### 3b. Resize handler (lines 1871–1876)
**BEFORE:**
```js
addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (mazeActive) resizeMaze();
});
```
**AFTER:**
```js
addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, currentQuality.pixelRatioCap)); // before setSize
  composer.setSize(w, h);                 // pass CSS px; composer multiplies by pixelRatio
  bloomPass.setSize(w, h);                // rebuild bloom mip chain
  if (mazeActive) resizeMaze();
});
```
(`currentQuality` is defined in Step 7; until then hard-code `1.5`.)

**Verify after Step 3:** full pipeline live. Image present and color-correct (see §9 step-3 row). Resize the window — no aliasing-only changes are expected here; bloom should track the new size (no smeared/half-res bloom).

---

## Step 4 — Golden-hour lighting retune

All in `src/main.js`. Apply, screenshot, eyeball.

| Line | What | BEFORE | AFTER |
|---|---|---|---|
| 33 | exposure | `renderer.toneMappingExposure = 1.05;` | `renderer.toneMappingExposure = 1.0;` (warm color reads instead of clipping white) |
| 20 | fog/horizon | `const FOG_COLOR = 0xbfe0ef;` | `const FOG_COLOR = 0xf0d8b8;` (warm peach haze — also warms sky horizon band + ocean fog via shared `horizonColor`) |
| 38 | fog distance | `scene.fog = new THREE.Fog(FOG_COLOR, 600, 3200);` | `scene.fog = new THREE.Fog(FOG_COLOR, 400, 3200);` (hazier, more atmospheric) |
| 45 | sun direction | `const sunDir = new THREE.Vector3(0.55, 0.6, 0.35).normalize();` | `const sunDir = new THREE.Vector3(0.7, 0.18, 0.35).normalize();` (low raking golden-hour sun) |
| 46 | sun color+intensity | `const sun = new THREE.DirectionalLight(0xfff3d6, 2.0);` | `const sun = new THREE.DirectionalLight(0xffc98a, 1.6);` (amber key, softer) |
| 52 | shadow frustum | `const sc = 420;` | `const sc = 600;` (low sun ⇒ long shadows; widen so they don't clip) |
| 55 | shadow bias | `sun.shadow.bias = -0.0004;` | `sun.shadow.bias = -0.0006;` (grazing angle ⇒ more acne; nudge) |
| 59 | hemisphere | `new THREE.HemisphereLight(0xcfe8ff, 0x8a7a55, 0.85)` | `new THREE.HemisphereLight(0x9fc1ff, 0x8a7a55, 1.0)` (bluer sky fill ⇒ blue shadows; keep warm olive ground) |
| 60 | ambient | `new THREE.AmbientLight(0xffffff, 0.18)` | `new THREE.AmbientLight(0x6f86b8, 0.12)` (cool, low — reinforces blue-shadow split instead of washing it) |
| 71 | sky mid | `midColor: { value: new THREE.Color(0x8fc3e8) }` | `midColor: { value: new THREE.Color(0xa9c8e6) }` (slightly warmer/lighter mid sky) |
| 74 | sky sun tint | `sunColor: { value: new THREE.Color(0xfff6e0) }` | `sunColor: { value: new THREE.Color(0xffe0a8) }` (amber sun disc/glow) |
| 126 | water sun tint | `uSunColor: { value: new THREE.Color(0xfff2d0) }` | `uSunColor: { value: new THREE.Color(0xffdca0) }` (amber glitter, matches sky/sun) |

> `sunDir` is shared by `sun` (light), `skyMat.sunDir` (line 73), and `waterUniforms.uSunDir` (line 125): lowering it automatically drops the sun disc toward the horizon and slides the water specular streak — desired. The sky frag clamps `dir.y` to `-0.1` (line 94), so the disc won't vanish below the horizon. `topColor` (0x2b6fb0) stays — deep zenith blue is correct at golden hour.

**Verify after Step 4:** Warm key on lit faces, cool/blue shadow cores, peachy horizon haze, long shadows that do NOT pop/clip at the island edges (if they clip, raise `sc` or `sun.shadow.camera.far` line 51). Sun disc sits low near the horizon. NOT orange-everywhere (that's exposure too high or fog too saturated).

---

## Step 5 — Color-grade + vignette ShaderPass (GLSL)

Define this **above** the composer block in Step 3 (the `ShaderPass` reference needs it). Phase 1 keeps it gentle: warm highlights / cool shadows split, mild vignette, very light grain. Final `clamp` guards against any stray HDR/NaN reaching OutputPass.

```js
const GradeVignetteShader = {
  uniforms: {
    tDiffuse:    { value: null },
    uTime:       { value: 0 },
    uVignette:   { value: 0.42 },                          // edge darkening strength
    uVigSoft:    { value: 0.55 },                          // feather start radius
    uGrain:      { value: 0.035 },                         // film grain amount
    uLift:       { value: 0.015 },                         // raise blacks (faded film)
    uWarmHi:     { value: new THREE.Vector3(1.05, 1.01, 0.95) }, // highlight tint (warm)
    uCoolShadow: { value: new THREE.Vector3(0.96, 1.00, 1.06) }, // shadow tint (cool/teal)
    uSaturation: { value: 1.06 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uVigSoft, uGrain, uLift, uSaturation;
    uniform vec3  uWarmHi, uCoolShadow;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));

      float shadowMask    = 1.0 - smoothstep(0.0, 0.55, luma);
      float highlightMask = smoothstep(0.45, 1.0, luma);

      // faded-film lift, then warm/cool split
      col = col + uLift * (1.0 - col);
      col *= mix(vec3(1.0), uCoolShadow, shadowMask);
      col *= mix(vec3(1.0), uWarmHi,     highlightMask);

      // gentle saturation around luma
      col = mix(vec3(luma), col, uSaturation);

      // radial vignette (centered, smooth)
      vec2 d = vUv - 0.5;
      float r = length(d) * 1.41421356;                    // 0 center .. ~1 corner
      float vig = 1.0 - uVignette * smoothstep(uVigSoft, 1.0, r);
      col *= vig;

      // subtle animated film grain, weighted toward darks
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 100.0) - 0.5;
      col += g * uGrain * mix(1.0, 0.35, luma);

      gl_FragColor = vec4(clamp(col, 0.0, 4.0), 1.0);      // guard; keep some HDR for OutputPass
    }`,
};
```

> Clamp top is `4.0` not `1.0` on purpose: this pass runs **before** OutputPass (linear space). Clamping to 1.0 here would crush the HDR highlights the bloom already used and OutputPass still wants to tone-map. `4.0` kills NaN/Inf without flattening the look.

**Verify after Step 5:** Subtle vignette in corners, faint grain visible only on a still frame at the shadows, no banding, no green/magenta cast (a cast ⇒ a tint vector typo). Center of frame essentially unchanged in hue.

---

## Step 6 — Bloom params

`UnrealBloomPass(resolution, strength, radius, threshold)`. Because tone mapping is deferred to OutputPass, the bloom sees **true linear HDR**, so a high-ish threshold isolates only the genuinely bright emitters. Tuned values:

```js
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55,   // strength  (0.4–0.7; the main wash-out lever — keep ≤0.6)
  0.75,   // radius     (0.6–0.9; soft dreamy falloff)
  0.85    // threshold  (0.8–0.95; only >~0.85 linear blooms)
);
```

What blooms at these values, and the HDR sources that make it bloom:
- **Sun disc/glow** — sky frag `* 2.4` / `* 0.28` (Step 2b) push well past 1.0. Tasteful halo around the low sun.
- **Sun glitter on water** — ocean specular `* 2.2` (Step 2c / Step 8). Sparkles streak-bloom along the sun reflection.
- **Monument orbs** — `MeshStandardMaterial({ emissive:0xffb347, emissiveIntensity:1.4 })` (line 509). Already >1 emissive ⇒ blooms. If too weak, raise to `2.0`.
- **Lit lamps** — lamp heads start at `emissiveIntensity:0.5` (line 560, unlit) — these **won't** bloom until lit. Wherever a lamp is set "lit", bump its head `emissiveIntensity` to **`2.5`** so lit lamps glow at dusk. (Search the lamp-lighting code path that flips `lit:true` and set `head.material.emissiveIntensity = 2.5`.)
- **Relic scroll** — `emissive:0xffcf6e, emissiveIntensity:0.9` (line 521). Bump to `1.8` for a collectible glow.

### The "Damascus flash" — IMPORTANT correction
The Damascus conversion "light from heaven" is **NOT a WebGL object** — it is a DOM overlay: `convEl.style.background = '#ffffff'` (line 1149) on the `#conversion` div, and the `flashScreen()` helper drives the `#flashFx` DOM layer (lines 875–879). **DOM overlays sit above the canvas and never pass through the composer, so bloom cannot touch them.** Do not expect the flash to bloom. Two options:
- **Phase 1 (do this):** Leave the DOM flash as-is — it already reads as a full-white blast. No code change. Note in the verify checklist that the flash is intentionally outside the bloom path.
- **Fast-follow (optional, riskier):** To make the flash bloom, replace the DOM flash with a fullscreen additive WebGL quad (emissive >1) rendered into the scene, animated by the same timer. Deferred — out of Phase 1 scope.

**Verify after Step 6:** Soft glow on the low sun and on the sun's water reflection; monument orb glows; NO global haze/milkiness (milky ⇒ strength too high or threshold too low). White marble walls at ~1.0 should NOT bloom.

---

## Step 7 — Low / Med / High quality setting

### 7a. Quality tiers (module scope, near the renderer)
```js
const QUALITY = {
  low:  { pixelRatioCap: 1.0, shadowMapSize: 1024, shadowType: THREE.PCFShadowMap,     bloom: false, bloomResScale: 0.5, grain: 0.0   },
  med:  { pixelRatioCap: 1.5, shadowMapSize: 2048, shadowType: THREE.PCFSoftShadowMap, bloom: true,  bloomResScale: 0.5, grain: 0.035 },
  high: { pixelRatioCap: 2.0, shadowMapSize: 4096, shadowType: THREE.PCFSoftShadowMap, bloom: true,  bloomResScale: 1.0, grain: 0.045 },
};
const QUALITY_ORDER = ['low', 'med', 'high'];
let qualityName = 'med';                 // DEFAULT = Med (headless-safe; not High)
let currentQuality = QUALITY[qualityName];
```

### 7b. Apply function (define after composer + bloomPass + gradeVignettePass exist)
```js
function applyQuality(name){
  qualityName = name;
  currentQuality = QUALITY[name];
  const c = currentQuality;
  const w = window.innerWidth, h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio, c.pixelRatioCap);

  renderer.setPixelRatio(pr);
  renderer.setSize(w, h);
  renderer.shadowMap.type = c.shadowType;

  composer.setPixelRatio(pr);
  composer.setSize(w, h);

  // shadow map size — must dispose+null to force a rebuild
  if (sun.shadow.mapSize.width !== c.shadowMapSize) {
    sun.shadow.mapSize.set(c.shadowMapSize, c.shadowMapSize);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }

  // bloom on/off + resolution
  bloomPass.enabled = c.bloom;
  bloomPass.setSize(Math.max(1, Math.floor(w * c.bloomResScale)),
                    Math.max(1, Math.floor(h * c.bloomResScale)));

  // grain
  gradeVignettePass.uniforms.uGrain.value = c.grain;

  if (typeof updateQualityBtn === 'function') updateQualityBtn();
}
applyQuality('med');     // call once after the composer is built
```

### 7c. Cycle function + button wiring (follow the `#musicBtn` pattern exactly)

Add a button to the pause menu in `index.html`, after `#musicBtn` (line 298):
```html
      <button id="musicBtn" class="ghost">🎵 Music: On</button>
      <button id="qualityBtn" class="ghost">🎚 Quality: Med</button>   <!-- NEW -->
```

Wire it in `src/main.js`, mirroring the `updateMusicBtn`/`$('musicBtn')` pattern at lines 1477–1478:
```js
function updateQualityBtn(){
  const label = qualityName[0].toUpperCase() + qualityName.slice(1);
  $('qualityBtn').textContent = '🎚 Quality: ' + label;
}
function cycleQuality(){
  const i = QUALITY_ORDER.indexOf(qualityName);
  applyQuality(QUALITY_ORDER[(i + 1) % QUALITY_ORDER.length]);   // applyQuality calls updateQualityBtn
}
$('qualityBtn').addEventListener('click', () => cycleQuality());
updateQualityBtn();
```

### 7d. 'L' hotkey (easy — add to the existing keydown handler)
In the keydown block (lines 690–694, alongside `KeyM`/`KeyJ`/`KeyH`/`KeyN`), add:
```js
  if (e.code === 'KeyL') cycleQuality();
```
(`L` is currently unbound — confirmed; no conflict.)

**Verify after Step 7:** Open pause menu (Esc) → "🎚 Quality: Med" button present, styled like the others. Click it → cycles Med→High→Low→Med, label updates, image visibly changes (Low = no bloom, softer shadows, chunkier pixels). Press `L` in-game → same cycle. No stall when switching to High in headless (if it stalls, headless should stay on Med/Low — default is already Med).

---

## Step 8 — Phase-1 water beautification (LOW RISK)

Two cheap, robust additions to the **ocean fragment shader**. Both avoid per-pixel loops by passing the **nearest town** as uniforms from JS (the game already computes nearest-town logic; reuse the cheap signed-distance-to-shore = `hypot(x−townx, z−townz) − radius`).

### 8a. New uniforms (add to `waterUniforms`, lines 123–133)
```js
  uNearIsland: { value: new THREE.Vector3() },  // (x, z, radius) of nearest town
  uFoamColor:  { value: new THREE.Color(0xf2efe6) },
```
Update them each frame wherever `waterUniforms.uCamPos`/`uTime` are set (in `update()` and the keepalive branch). Cheap nearest-town pick (reuse existing data shape `town.pos=[x,z]`, `town.radius`):
```js
{
  let best = null, bd = Infinity;
  for (const tn of TOWNS){
    const d = Math.hypot(camera.position.x - tn.pos[0], camera.position.z - tn.pos[1]) - tn.radius;
    if (d < bd){ bd = d; best = tn; }
  }
  if (best) waterUniforms.uNearIsland.value.set(best.pos[0], best.pos[1], best.radius);
}
```
> This loop is over ~14 towns per **frame** (JS side), not per-pixel — negligible, headless-safe.

### 8b. Shoreline foam band + brighter glitter (ocean fragment shader)
Add the uniforms to the declaration line, and insert the foam just before the fog mix. Replace the specular block from Step 2c with this fuller version:
```glsl
    uniform vec3 uSunDir, uSunColor, uDeep, uShallow, uFogColor, uCamPos;
    uniform float uFogNear, uFogFar;
    uniform vec3 uNearIsland, uFoamColor;        // (x, z, radius), foam tint
    ...
      // --- sun specular + brighter glitter (HDR, blooms) ---
      vec3 H = normalize(uSunDir + V);
      float spec = pow(max(dot(N, H), 0.0), 220.0);
      col += uSunColor * spec * 2.2;
      // sharper secondary glint for sparkle on the streak
      float glint = pow(max(dot(N, H), 0.0), 900.0);
      col += uSunColor * glint * 3.0;
      col += uSunColor * max(dot(N, uSunDir), 0.0) * 0.06;

      // --- shoreline foam band (signed distance to nearest island shore) ---
      float shore = length(vWorld.xz - uNearIsland.xy) - uNearIsland.z;   // <0 inside, >0 outside
      float foam = smoothstep(14.0, 2.0, shore) * (1.0 - smoothstep(2.0, -6.0, shore));
      foam *= 0.6 + 0.4 * sin(vWorld.x * 0.6 + vWorld.z * 0.6 + uFogNear); // gentle ripple break-up
      col = mix(col, uFoamColor, clamp(foam, 0.0, 0.85));

      float dist = length(uCamPos - vWorld);
      float fog = smoothstep(uFogNear, uFogFar, dist);
      col = mix(col, uFogColor, fog);
      col = max(col, 0.0);
      gl_FragColor = vec4(col, 1.0);
```
> `uNearIsland.xy` holds `(townX, townZ)` and `uNearIsland.z` the radius — that matches `Vector3.set(x, z, radius)` above. The foam band hugs the coast (≈2–14 units out), breaks up with a cheap sine, and fades. No texture, no loop, no new pass.

### Fast-follow (riskier — DEFER past Phase 1)
- **Planar sky reflection** of the actual sky gradient on the water (needs a second render or a reflection matrix) — risk of cost/stall + color-management re-entry. Defer.
- **Boat wake / foam trail** behind the ship (needs ship velocity + a trail buffer or decal) — defer.

**Verify after Step 8:** A bright thin foam ring traces each island's waterline; it moves correctly as the ship sails (foam follows the nearest island, no foam in open water far from land). Sun glitter is brighter/sparklier and blooms. No foam flicker/z-fight, no foam appearing mid-ocean (⇒ `uNearIsland` not updated, or `.xy` vs radius mismatch).

---

## Step 9 — Per-step screenshot-verification checklist

Take a headless screenshot after each step. Compare against the prior screenshot AND the expectation. Use a fixed camera/spawn so frames are comparable.

| Step | What to confirm in the screenshot | Red flag |
|---|---|---|
| 1 (importmap) | Game boots, frame identical to baseline | Blank page / console specifier error ⇒ trailing-slash wrong |
| 2+3 (shaders + composer) | Sky & sea color-correct, slightly punchier; lit objects unchanged | **Black sky** (NaN), or **milky/grey wash** (double encode left in) |
| 4 (lighting) | Warm key, blue shadows, peachy horizon, low sun, long un-clipped shadows | Orange-everywhere (exposure/fog too hot); shadows popping at island edges (frustum clip) |
| 5 (grade/vignette) | Subtle corner vignette + faint grain; center hue unchanged | Color cast (tint typo); heavy/visible grain; banding |
| 6 (bloom) | Glow on sun, sun-on-water, monument orb only | Global milkiness (strength↑/threshold↓); white walls blooming |
| 7 (quality) | Pause menu has Quality button; cycles & changes image; `L` works | Stall on High in headless (stay on Med); button unstyled |
| 8 (water) | Foam ring at each shore, follows ship; brighter sparkle glitter | Foam mid-ocean / flickers; glitter not blooming |

**Headless command reference (adapt to your harness):** render one frame at a fixed spawn, dump PNG, and inspect both a sky pixel and a water pixel programmatically — a sky pixel reading `(0,0,0)` is the black-sky regression; a sky/water pixel near mid-grey with low saturation is the double-encode wash.

### TOP 3 FAILURE MODES (and how to detect each in a screenshot)

1. **Black sky (NaN/Inf through HalfFloat→bloom).**
   *Cause:* a NaN in the sky ray, or a missing `max(col,0.0)` guard, or a negative feeding bloom.
   *Detect:* sample the top-center pixel — pure `(0,0,0)` or NaN-grey across the whole upper frame. The sea may also go black if its guard is missing.
   *Fix:* confirm the `dir.y` clamp (sky line 94) and the `col = max(col, 0.0);` guards in both shaders and the grade pass clamp `clamp(col,0.0,4.0)`.

2. **Milky / washed-out, desaturated whole frame (double tone-map + double gamma).**
   *Cause:* an inline `pow(aces(col),0.4545)` or an `aces()` call was left in the sky/water shader, OR `renderer.toneMapping` was set to `NoToneMapping` (so OutputPass tone-maps nothing and everything reads flat/bright), OR a second encode pass was added.
   *Detect:* sky/sea look pale grey-blue with crushed contrast; black point is lifted everywhere; bloom looks like uniform fog. Sample a deep-water pixel — it reads much lighter than the authored deep-blue.
   *Fix:* ensure exactly the two inline tone-map lines (sky 100, ocean 198) and the two `aces()` helpers (sky 91, ocean 175) are deleted, and `renderer.toneMapping = ACESFilmicToneMapping` is kept.

3. **No bloom (HDR clamped before bloom).**
   *Cause:* a custom non-HalfFloat composer target was passed (clamps to [0,1]), OR the sun/specular multipliers are ≤1.0, OR threshold too high, OR (for lamps) emissive never raised on "lit".
   *Detect:* the low sun and its water reflection have a hard edge with no halo; monument orb is flat. Compare a 5px-wide band across the sun edge — no gradient falloff means no bloom.
   *Fix:* do NOT pass a custom RT to `EffectComposer` (default is HalfFloat); confirm sun disc `*2.4`, ocean spec `*2.2`, threshold `0.85`, and `bloomPass.enabled` true on Med/High.

---

## One-screen change inventory (for the implementer)

- **index.html:** add `three/addons/` importmap line (Step 1); add `#qualityBtn` after `#musicBtn` (Step 7c).
- **src/main.js:**
  - imports for 5 addons (Step 1)
  - exposure 1.05→1.0; FOG_COLOR; fog near; sunDir; sun color/intensity; `sc`; bias; hemisphere; ambient; sky midColor/sunColor; water uSunColor (Step 4)
  - delete sky `aces()` (91) + inline tonemap (100); bump sun disc/glow; add guard (Step 2b)
  - delete ocean `aces()` (175) + inline tonemap (198); bump specular; add glitter + foam + guard (Steps 2c, 8b)
  - `GradeVignetteShader` object (Step 5)
  - composer block: composer/renderPass/bloomPass/gradeVignettePass/outputPass (Step 3)
  - `QUALITY`/`applyQuality`/`cycleQuality`/`updateQualityBtn` + button + `L` hotkey (Step 7)
  - `uNearIsland`/`uFoamColor` uniforms + per-frame nearest-town update (Step 8a)
  - line 1864 `renderer.render` → `composer.render`; add `gradeVignettePass.uniforms.uTime` update (Step 3a)
  - resize handler: composer.setPixelRatio/setSize + bloomPass.setSize (Step 3b)
  - bump emissive on lit lamps (→2.5), relic scroll (→1.8) (Step 6)
