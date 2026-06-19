# The Voyages of Paul — Graphics & Beauty Plan

> Goal: make the game noticeably more beautiful while staying **browser-playable**
> (60 fps target on a laptop) and **asset-light** (procedural first; small textures
> / one HDR only where they earn their keep). Lean into a cohesive art direction
> rather than chasing photorealism.

## Decisions locked (2026-06-19)

- **Art direction:** ✅ **Golden-hour Mediterranean** — warm key light + cool blue
  shadows, glowing bloom highlights, hazy atmospheric horizon, deep saturated sea.
- **Asset budget:** ✅ **A few small assets allowed** — stay mostly procedural, but a
  handful of small textures (noise / normal maps) **plus one small HDR environment**
  for nicer water & material reflections are in scope.
- **Status:** Plan only for now — no code changes yet. Build when ready, starting at
  **Phase 1 (post-processing + golden-hour lighting)** per §5.

## 0. The north star — art direction

Commit to one look so every change pulls the same way:

**"Warm Mediterranean storybook."** Stylized low-poly forms, but lit like a painting
at **golden hour** — long warm light, deep blue sea, soft haze on the horizon, glowing
highlights. Think *Journey* / *Sailing-era indie* more than realism. This flatters the
low-poly geometry we already have and is deeply thematic (the eastern Mediterranean).

Three levers define it: **a colour-grade (LUT/tone curve)**, **a key light colour &
angle**, and **bloom**. Get those three right and the whole game transforms before we
touch a single model.

---

## 1. Phase 1 — "Free" beauty (light & atmosphere, no new geometry)

The highest impact-to-effort work. All low-risk, all toggleable.

### 1a. Post-processing stack  ★ biggest single upgrade
Add an `EffectComposer` pipeline (Three.js addons):
- **Bloom** (`UnrealBloomPass`) — the sun, the glowing monument orbs, the conversion
  flash, the lamps, sun-glints on water all gain a luminous glow. This alone reads as
  "high production value."
- **Colour grading / tone curve** — a warm filmic LUT (or an inline grade pass):
  lift shadows slightly blue, push highlights warm. Instantly cinematic.
- **Vignette** + very subtle **film grain** — frames the image, hides banding.
- (Optional) **SMAA** anti-aliasing for clean edges once post-processing is on.

*Cost:* a few extra full-screen passes. Cap at devicePixelRatio ≤ 1.5; expose a
quality toggle. Risk: low (well-trodden Three.js path).

### 1b. Golden-hour lighting
- Re-angle and warm the key (sun) light; cooler sky-fill from the hemisphere light so
  shadows read blue against warm light (the classic "golden hour" contrast).
- Tune exposure (`toneMappingExposure`) and the existing ACES curve.
- Slightly denser, warmer **horizon haze** (fog colour graded to the sky) so distant
  islands melt into atmosphere — "atmospheric perspective" is most of what makes
  landscapes feel deep and pretty.

### 1c. A richer sky
- Upgrade the gradient sky to a **Rayleigh-scattering sky** (Three's `Sky` shader or a
  custom one) for a believable sun, horizon glow, and sky colour that responds to sun
  angle. Keeps the sun disc + glow we already draw.
- Add a few soft **billboard/scrolling-noise clouds** near the horizon for depth
  (cheap, no volumetrics yet).

### 1d. Water — the signature surface
The ocean is what players stare at, so it pays off most:
- **Shoreline foam** — a foam band where water meets each island (depth/edge based),
  plus foam on wave crests. Huge "alive" factor.
- **Ship wake + bow spray** — a trailing wake ribbon and a little spray at the bow
  (particles or a scrolling foam texture). Makes sailing feel real.
- **Reflection of sky & sun** — even a cheap planar/`Reflector` of the sky and a
  brighter sun-glitter path across the water.
- Subtle **normal-map ripples** layered on the Gerstner waves for sparkle.

➡ **Result of Phase 1:** the same world, but it looks like a different game — warm,
glowing, with living water — for relatively little code and no art assets.

---

## 2. Phase 2 — Surfaces & life (some geometry / textures)

### 2a. Terrain & shoreline
- **Slope/height material blending** (triplanar or vertex-weighted): wet darkened sand
  at the waterline → dry sand → grass → rock, instead of flat vertex colours.
- **Wet-sand foam line** that animates with the tide.
- More **organic island silhouettes** (noise-perturbed rims instead of circles).

### 2b. Vegetation
- **Instanced grass tufts** with gentle wind sway (vertex shader), scattered on the
  plateaus.
- Better, more varied **trees** (cypress, olive, palm) with a touch of wind motion;
  optionally a few small glTF tree models, instanced.
- Distance **billboard** swap so density stays cheap.

### 2c. Models & materials (PBR pass)
- Give marble/wood/roof materials proper **roughness/normal maps** so light catches
  them (procedural noise normals are enough to start).
- More refined **Greco-Roman architecture** (fluted columns, pediments, steps) — a
  small handful of nicer building variants, instanced across towns.
- **Sails that billow** and **flags that wave** (cloth-ish vertex animation).

### 2d. Atmosphere & particles
- **Birds / gulls** wheeling over islands, **chimney smoke**, **lamp embers**, dust
  motes in light — small particle systems that add enormous life for little cost.
- **Soft contact shadows / SSAO** to ground objects and add depth.

---

## 3. Phase 3 — Mood & showpieces

- **Day/night cycle** (already floated in `PLAN.md`): a moving sun, golden sunsets,
  night with stars and a glowing **harbour lighthouse** + lit town windows/lamps.
  Pairs perfectly with the Damascus flash and the Spread-the-Light lamps.
- **God rays / volumetric light shafts** from the sun (and through the Damascus
  flash) via a radial-blur pass.
- **HDR image-based lighting (IBL)** — one small HDR environment for realistic
  reflections on water and marble.
- **Weather** — drifting clouds, a rain/storm mode (ties into the Acts 27 shipwreck
  set-piece), lightning.
- **Underwater tint & caustics** near shores; jumping fish; sea-floor hint in shallows.

---

## 4. Cross-cutting — performance & options (do alongside Phase 1)

Beauty that drops the frame-rate isn't beauty. Build these in from the start:
- A **graphics quality setting** (Low / Medium / High) in the pause menu: scales
  pixel ratio, shadow map size, bloom/SSAO on-off, reflection resolution, particle
  counts, draw distance/fog.
- **Auto-detect** a sensible default from a quick frame-time probe at startup.
- Keep `devicePixelRatio` capped; use **instancing** for repeated meshes (trees,
  columns, lamps, grass); frustum-cull aggressively; reuse geometries/materials.
- Budget: every effect must hold the fps target on Medium, or it ships off-by-default.

---

## 5. Recommendation & sequencing

| Step | What | Effort | Visual payoff |
|------|------|--------|---------------|
| **1** | Post-processing (bloom + colour grade + vignette) | Low–Med | ★★★★★ |
| **2** | Golden-hour lighting + horizon haze | Low | ★★★★ |
| **3** | Richer sky (+ a few clouds) | Med | ★★★ |
| **4** | Water foam + wake + sun-glitter | Med | ★★★★ |
| **5** | Quality settings + perf pass | Med | (enables the rest) |
| 6 | Terrain blending + wind grass | Med | ★★★ |
| 7 | Day/night + lighthouses | Med–High | ★★★★ |
| 8 | PBR materials + nicer buildings + NPCs | High | ★★★ |
| 9 | God rays / IBL / weather | High | ★★★ |

**Start with steps 1–2** (post-processing + golden-hour light). They're the cheapest,
lowest-risk changes and they transform the entire game's look in one sitting — then
we judge from there whether to push into water (4) and sky (3) next.

### Choices — resolved
- **Art direction:** ✅ Golden-hour Mediterranean (see "Decisions locked" above).
- **Asset budget:** ✅ Mostly procedural + a few small textures + one HDR.
- **Day/night:** still open — a fixed golden-hour time first (Phase 1), with a full
  moving cycle + sunsets considered in Phase 3. Decide when we reach it.

When we build, Phase 1 lands as one coherent change: an `EffectComposer` (bloom +
warm grade + vignette), the golden-hour key/fill lighting, warm horizon haze, and a
**Low/Med/High quality toggle** in the pause menu so it stays playable.
