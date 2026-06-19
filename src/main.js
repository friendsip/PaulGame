// ============================================================================
//  The Voyages of Paul — A 3D open-world exploration game (browser / Three.js)
//  Sail the seas of the eastern Mediterranean, land at the towns of the book of
//  Acts, and explore them on foot.
// ============================================================================
import * as THREE from 'three';
import { TOWNS, THEMES, JOURNEY_ORDER, EPISTLES, LIGHT_TOWNS } from './data.js';

// ----------------------------------------------------------------------------
//  Constants
// ----------------------------------------------------------------------------
const SEA_LEVEL   = 0;
const EYE_HEIGHT  = 1.7;     // first-person eye height on foot
const DECK_HEIGHT = 3.2;     // camera height while sailing
const WALK_SPEED  = 9;
const RUN_SPEED   = 17;
const SHIP_ACCEL  = 26;
const SHIP_MAXSPD = 95;
const SHIP_TURN   = 1.25;     // radians/sec
const FOG_COLOR   = 0xbfe0ef;

const horizonColor = new THREE.Color(FOG_COLOR);

// ----------------------------------------------------------------------------
//  Renderer / Scene / Camera
// ----------------------------------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, 600, 3200);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 8000);

// ----------------------------------------------------------------------------
//  Lighting
// ----------------------------------------------------------------------------
const sunDir = new THREE.Vector3(0.55, 0.6, 0.35).normalize();
const sun = new THREE.DirectionalLight(0xfff3d6, 2.0);
sun.position.copy(sunDir).multiplyScalar(600);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 1400;
const sc = 420;
sun.shadow.camera.left = -sc; sun.shadow.camera.right = sc;
sun.shadow.camera.top = sc;   sun.shadow.camera.bottom = -sc;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x8a7a55, 0.85));
scene.add(new THREE.AmbientLight(0xffffff, 0.18));

// ----------------------------------------------------------------------------
//  Sky dome
// ----------------------------------------------------------------------------
// A full-screen quad that reconstructs the world view-ray per pixel and paints
// the sky gradient. This always fills the viewport (no dome/clipping issues).
const skyMat = new THREE.ShaderMaterial({
  depthWrite: false, depthTest: false,
  uniforms: {
    topColor:    { value: new THREE.Color(0x2b6fb0) },
    midColor:    { value: new THREE.Color(0x8fc3e8) },
    botColor:    { value: horizonColor.clone() },
    sunDir:      { value: sunDir.clone() },
    sunColor:    { value: new THREE.Color(0xfff6e0) },
    uProjInv:    { value: new THREE.Matrix4() },
    uCamRot:     { value: new THREE.Matrix3() },
  },
  vertexShader: `
    varying vec3 vRay;
    uniform mat4 uProjInv;
    uniform mat3 uCamRot;
    void main(){
      // reconstruct the view-space ray (no translation → no divide-by-zero on the horizon)
      vec4 view = uProjInv * vec4(position.xy, 1.0, 1.0);
      vRay = uCamRot * (view.xyz / view.w);
      gl_Position = vec4(position.xy, 1.0, 1.0);   // fill the whole screen
    }`,
  fragmentShader: `
    varying vec3 vRay;
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
    }`,
});
const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat);
sky.renderOrder = -10;       // paint as background, before everything
sky.frustumCulled = false;
scene.add(sky);
const _camRot = new THREE.Matrix3();
function updateSky() {
  camera.updateMatrixWorld();
  skyMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
  _camRot.setFromMatrix4(camera.matrixWorld);       // camera world rotation
  skyMat.uniforms.uCamRot.value.copy(_camRot);
}

// ----------------------------------------------------------------------------
//  Ocean — animated sum-of-sines water with fresnel + sun specular + fog
// ----------------------------------------------------------------------------
const OCEAN_SIZE = 9000;
const waterGeo = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, 360, 360);
waterGeo.rotateX(-Math.PI / 2);

const waterUniforms = {
  uTime:      { value: 0 },
  uSunDir:    { value: sunDir.clone() },
  uSunColor:  { value: new THREE.Color(0xfff2d0) },
  uDeep:      { value: new THREE.Color(0x06283e) },
  uShallow:   { value: new THREE.Color(0x1a6f93) },
  uFogColor:  { value: horizonColor.clone() },
  uFogNear:   { value: scene.fog.near },
  uFogFar:    { value: scene.fog.far },
  uCamPos:    { value: new THREE.Vector3() },
};

const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  vertexShader: `
    uniform float uTime;
    varying vec3 vWorld;
    varying vec3 vNormal;

    // four travelling waves
    const vec2 D0 = vec2( 1.0,  0.0);
    const vec2 D1 = vec2( 0.6,  0.8);
    const vec2 D2 = vec2(-0.7,  0.5);
    const vec2 D3 = vec2( 0.2, -0.95);

    float wave(vec2 p, vec2 d, float freq, float amp, float speed, out vec2 deriv){
      float ph = dot(d, p) * freq + uTime * speed;
      deriv = d * (freq * amp * cos(ph));
      return amp * sin(ph);
    }

    void main(){
      vec3 pos = position;
      vec2 p = pos.xz;
      vec2 dx, dz, dt;
      float h = 0.0; vec2 dsum = vec2(0.0);
      h += wave(p, normalize(D0), 0.012, 1.7, 1.1, dt); dsum += dt;
      h += wave(p, normalize(D1), 0.021, 0.9, 1.6, dt); dsum += dt;
      h += wave(p, normalize(D2), 0.045, 0.45, 2.3, dt); dsum += dt;
      h += wave(p, normalize(D3), 0.080, 0.22, 3.0, dt); dsum += dt;
      pos.y += h;
      vec4 wp = modelMatrix * vec4(pos, 1.0);
      vWorld = wp.xyz;
      vNormal = normalize(vec3(-dsum.x, 1.0, -dsum.y));
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    precision highp float;
    varying vec3 vWorld;
    varying vec3 vNormal;
    uniform vec3 uSunDir, uSunColor, uDeep, uShallow, uFogColor, uCamPos;
    uniform float uFogNear, uFogFar;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }

    void main(){
      vec3 N = normalize(vNormal);
      vec3 V = normalize(uCamPos - vWorld);
      float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
      fres = clamp(0.02 + 0.7 * fres, 0.0, 0.72);

      vec3 water = mix(uDeep, uShallow, pow(max(N.y, 0.0), 1.5));
      vec3 skyish = mix(uShallow * 1.25, uFogColor, 0.35);   // reflected sky keeps blue
      vec3 col = mix(water, skyish, fres);

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
    }`,
});
const ocean = new THREE.Mesh(waterGeo, waterMat);
ocean.renderOrder = -1;
scene.add(ocean);

// Sample the water height analytically (must match the vertex shader)
function waterHeightAt(x, z, t) {
  const waves = [
    [1, 0, 0.012, 1.7, 1.1],
    [0.6, 0.8, 0.021, 0.9, 1.6],
    [-0.7, 0.5, 0.045, 0.45, 2.3],
    [0.2, -0.95, 0.080, 0.22, 3.0],
  ];
  let h = 0;
  for (const [dxr, dzr, f, a, s] of waves) {
    const len = Math.hypot(dxr, dzr);
    const dx = dxr / len, dz = dzr / len;
    h += a * Math.sin((dx * x + dz * z) * f + t * s);
  }
  return h;
}

// ----------------------------------------------------------------------------
//  Island terrain — a radial plateau with a sloping beach into the sea
// ----------------------------------------------------------------------------
// Height profile for a town's island (local coords relative to island centre).
function islandHeight(town, lx, lz) {
  const d = Math.hypot(lx, lz);
  const R = town.radius;
  if (d > R) return -8;                       // underwater shelf
  const t = d / R;                            // 0 centre .. 1 edge
  // plateau in the middle, beach slope near the rim
  const plateau = 14;
  let h;
  if (t < 0.62) {
    h = plateau;
  } else {
    const k = (t - 0.62) / (0.38);            // 0..1 across the beach
    h = plateau * (1 - smooth(k)) - 9 * smooth(k);
  }
  // gentle rolling noise for natural look (deterministic, cheap)
  const n = Math.sin(lx * 0.06 + town.order) * Math.cos(lz * 0.05 - town.order) * 2.2
          + Math.sin((lx + lz) * 0.13) * 1.0;
  return h + n * (1 - t * 0.7);
}
function smooth(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }

function buildIsland(town) {
  const theme = THEMES[town.theme];
  const grp = new THREE.Group();
  const [cx, cz] = town.pos;
  grp.position.set(cx, 0, cz);
  town._group = grp;

  // terrain mesh
  const span = town.radius * 2.3;
  const seg = 72;
  const geo = new THREE.PlaneGeometry(span, span, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const cSand = new THREE.Color(theme.sand);
  const cGrass = new THREE.Color(theme.grass);
  const cRock = new THREE.Color(theme.rock);
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), lz = pos.getZ(i);
    const h = islandHeight(town, lx, lz);
    pos.setY(i, h);
    let c;
    if (h < 1.2) c = cSand;
    else if (h < 9) c = cSand.clone().lerp(cGrass, smooth((h - 1.2) / 8));
    else c = cGrass.clone().lerp(cRock, smooth((h - 12) / 8));
    // tiny variation
    const v = 0.92 + (Math.sin(lx * 0.3 + lz * 0.2) * 0.08);
    colors.push(c.r * v, c.g * v, c.b * v);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0, flatShading: false });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  grp.add(ground);

  // scatter decorations on the plateau
  decorateIsland(town, grp, theme);

  // landmark building near the centre
  const lm = buildLandmark(town.landmark, theme);
  lm.position.set(0, plateauY(town, 0, 0), 0);
  grp.add(lm);

  // a few houses around the landmark
  const ringR = town.radius * 0.45;
  const nHouses = 7;
  for (let i = 0; i < nHouses; i++) {
    const a = (i / nHouses) * Math.PI * 2 + town.order;
    const r = ringR * (0.6 + 0.5 * pseudo(i + town.order));
    const hx = Math.cos(a) * r, hz = Math.sin(a) * r;
    const house = buildHouse(theme);
    house.position.set(hx, plateauY(town, hx, hz), hz);
    house.rotation.y = -a + Math.PI / 2;
    grp.add(house);
  }

  // dock + welcome monument on the seaward (toward map-centre) side
  const dockDir = new THREE.Vector2(-cx, -cz).normalize();
  const dockAng = Math.atan2(dockDir.y, dockDir.x);
  buildDock(town, grp, dockAng);
  buildMonument(town, grp, dockAng);
  buildRelic(town, grp, dockAng);
  buildLamps(town, grp);
  if (town.conversion) buildRoad(town, grp, dockAng);

  scene.add(grp);
}

function plateauY(town, lx, lz) { return Math.max(0.2, islandHeight(town, lx, lz)); }
function pseudo(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ---- decorations: trees & rocks (moderate counts for performance) ----------
const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 6, 6);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 });
const foliageGeo = new THREE.ConeGeometry(3.2, 8, 7);
const palmTrunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 8, 6);
const frondGeo = new THREE.ConeGeometry(0.6, 5.5, 4);
const rockGeo = new THREE.DodecahedronGeometry(2, 0);
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8276, roughness: 1, flatShading: true });

function decorateIsland(town, grp, theme) {
  const foliageMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(theme.grass).multiplyScalar(0.8), roughness: 1, flatShading: true });
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 1, flatShading: true });
  const nTrees = 16;
  for (let i = 0; i < nTrees; i++) {
    const a = pseudo(i * 3 + town.order) * Math.PI * 2;
    const r = town.radius * (0.2 + 0.62 * pseudo(i * 7 + town.order));
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = islandHeight(town, x, z);
    if (y < 1.5) continue;                       // keep trees off the beach
    const tree = new THREE.Group();
    if (pseudo(i + 5) > 0.55) {                   // palm
      const tr = new THREE.Mesh(palmTrunkGeo, trunkMat);
      tr.position.y = 4; tr.rotation.z = (pseudo(i) - 0.5) * 0.3; tr.castShadow = true;
      tree.add(tr);
      for (let f = 0; f < 6; f++) {
        const fr = new THREE.Mesh(frondGeo, palmMat);
        fr.position.y = 8;
        fr.rotation.z = Math.PI / 2.4;
        fr.rotation.y = (f / 6) * Math.PI * 2;
        fr.castShadow = true;
        tree.add(fr);
      }
    } else {                                      // cypress / olive
      const tr = new THREE.Mesh(trunkGeo, trunkMat); tr.position.y = 3; tr.castShadow = true;
      const fo = new THREE.Mesh(foliageGeo, foliageMat); fo.position.y = 9; fo.castShadow = true;
      tree.add(tr, fo);
    }
    tree.position.set(x, y, z);
    const s = 0.7 + pseudo(i * 2) * 0.7;
    tree.scale.setScalar(s);
    grp.add(tree);
  }
  // a few rocks near the shore
  for (let i = 0; i < 8; i++) {
    const a = pseudo(i * 11 + town.order) * Math.PI * 2;
    const r = town.radius * (0.72 + 0.2 * pseudo(i * 5));
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = islandHeight(town, x, z);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, y + 0.5, z);
    rock.scale.setScalar(0.6 + pseudo(i) * 1.3);
    rock.rotation.set(pseudo(i) * 3, pseudo(i + 1) * 3, pseudo(i + 2) * 3);
    rock.castShadow = true; rock.receiveShadow = true;
    grp.add(rock);
  }
}

// ---- buildings -------------------------------------------------------------
const marble = new THREE.MeshStandardMaterial({ color: 0xece7da, roughness: 0.6, metalness: 0.0 });
const marbleWarm = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0xa1452f, roughness: 0.9 });
const colGeo = new THREE.CylinderGeometry(0.7, 0.8, 12, 12);

function columnRing(rx, rz, n, h, material) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const col = new THREE.Mesh(colGeo, material);
    col.scale.y = h / 12;
    col.position.set(Math.cos(a) * rx, h / 2, Math.sin(a) * rz);
    col.castShadow = true;
    g.add(col);
  }
  return g;
}

function buildLandmark(type, theme) {
  const g = new THREE.Group();
  if (type === 'temple') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(34, 3, 22), marble);
    base.position.y = 1.5; base.receiveShadow = true; base.castShadow = true; g.add(base);
    const cols = new THREE.Group();
    const rows = [[-14], [14]];
    for (let xi = -1; xi <= 1; xi += 2) {
      for (let i = 0; i < 6; i++) {
        const c = new THREE.Mesh(colGeo, marble);
        c.position.set(xi * 15, 9, -9 + i * 3.6); c.castShadow = true; cols.add(c);
      }
    }
    for (let i = 0; i < 6; i++) {
      for (const zside of [-9, 9]) {
        const c = new THREE.Mesh(colGeo, marble);
        c.position.set(-15 + i * 6, 9, zside); c.castShadow = true; cols.add(c);
      }
    }
    g.add(cols);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(36, 2.5, 24), marbleWarm);
    arch.position.y = 16.5; arch.castShadow = true; g.add(arch);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 13, 6, 4), roofMat);
    roof.rotation.y = Math.PI / 4; roof.scale.set(1.4, 1, 0.92); roof.position.y = 21; roof.castShadow = true; g.add(roof);
  } else if (type === 'theater') {
    // semicircular tiered seating
    for (let row = 0; row < 9; row++) {
      const r = 10 + row * 2.4;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 1.1, 6, 24, Math.PI), marble);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1 + row * 1.6;
      ring.castShadow = true; ring.receiveShadow = true;
      g.add(ring);
    }
    const stage = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 7), marbleWarm);
    stage.position.set(0, 1, -2); g.add(stage);
    g.add(columnRing(9, 2, 5, 8, marble).translateZ(-4));
  } else if (type === 'acropolis') {
    const hill = new THREE.Mesh(new THREE.CylinderGeometry(20, 26, 10, 24), new THREE.MeshStandardMaterial({ color: theme.rock, roughness: 1 }));
    hill.position.y = 5; hill.receiveShadow = true; g.add(hill);
    const temple = buildLandmark('temple', theme); temple.scale.setScalar(0.7); temple.position.y = 10; g.add(temple);
  } else if (type === 'harbor') {
    const light = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 26, 16), marbleWarm);
    tower.position.y = 13; tower.castShadow = true; light.add(tower);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3, 5, 12), marble); top.position.y = 28; light.add(top);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
    flame.position.y = 31.5; light.add(flame);
    const fl = new THREE.PointLight(0xffa040, 2.2, 220, 1.6); fl.position.y = 31.5; light.add(fl);
    g.add(light);
    g.add(columnRing(16, 16, 10, 7, marble));
  } else { // forum: open colonnaded square
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(44, 1, 44), marbleWarm);
    plaza.position.y = 0.5; plaza.receiveShadow = true; g.add(plaza);
    g.add(columnRing(20, 20, 18, 9, marble));
    const rostra = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 6), marble); rostra.position.set(0, 2.5, 0); rostra.castShadow = true; g.add(rostra);
    const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 6, 8), marble); statue.position.set(0, 8, 0); g.add(statue);
  }
  return g;
}

const houseMats = [0xe7d8b8, 0xddc9a0, 0xe9e0cf, 0xd6c19a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
function buildHouse(theme) {
  const g = new THREE.Group();
  const w = 5 + pseudo(Math.random()) * 3;
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 6), houseMats[Math.floor(Math.random() * houseMats.length)]);
  base.position.y = 2.5; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 3, 4), roofMat);
  roof.rotation.y = Math.PI / 4; roof.position.y = 6.5; roof.castShadow = true; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.3), new THREE.MeshStandardMaterial({ color: 0x5b3d23 }));
  door.position.set(0, 1.3, 3.05); g.add(door);
  return g;
}

function buildDock(town, grp, ang) {
  const dock = new THREE.Group();
  const dirx = Math.cos(ang), dirz = Math.sin(ang);
  // start near the beach line and run out over the water
  const startR = town.radius * 0.92;
  const length = 34;
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x6e4a2c, roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const r = startR + i * (length / 7);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, length / 7 + 0.4), plankMat);
    plank.position.set(dirx * r, 1.2, dirz * r);
    plank.rotation.y = ang;
    plank.castShadow = true; plank.receiveShadow = true;
    dock.add(plank);
    if (i % 2 === 0) {
      for (const side of [-3, 3]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 6), plankMat);
        const px = dirx * r - dirz * side, pz = dirz * r + dirx * side;
        post.position.set(px, -0.4, pz); dock.add(post);
      }
    }
  }
  // remember the dock-end position in WORLD space (where the ship parks)
  const endR = startR + length;
  town._dock = new THREE.Vector3(town.pos[0] + dirx * endR, 1.5, town.pos[1] + dirz * endR);
  town._landSpot = new THREE.Vector3(town.pos[0] + dirx * (startR - 6), 0, town.pos[1] + dirz * (startR - 6));
  town._dockAng = ang;
  grp.add(dock);
}

function buildMonument(town, grp, ang) {
  const m = new THREE.Group();
  const dirx = Math.cos(ang), dirz = Math.sin(ang);
  const r = town.radius * 0.78;
  const lx = dirx * r, lz = dirz * r;
  const y = plateauY(town, lx, lz);
  const stele = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 1.2), marble);
  stele.position.y = 4; stele.castShadow = true;
  m.add(stele);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffd27f, emissive: 0xffb347, emissiveIntensity: 1.4 }));
  orb.position.y = 9; m.add(orb);
  const pl = new THREE.PointLight(0xffc060, 1.6, 60, 2); pl.position.y = 9; m.add(pl);
  m.position.set(lx, y, lz);
  m.rotation.y = -ang;
  grp.add(m);
  town._orb = orb;
  // world-space marker for proximity checks
  town._monument = new THREE.Vector3(town.pos[0] + lx, y, town.pos[1] + lz);
}

// A floating glowing scroll/letter to collect on each island.
const relicScrollMat = new THREE.MeshStandardMaterial({ color: 0xf5ead0, emissive: 0xffcf6e, emissiveIntensity: 0.9, roughness: 0.6 });
const relicRodMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3a, roughness: 0.6 });
function buildRelic(town, grp, ang) {
  const a = ang + 2.5;                          // away from the dock/monument
  const r = town.radius * 0.5;
  const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
  const groundY = plateauY(town, lx, lz);
  const g = new THREE.Group();
  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.6, 14), relicScrollMat);
  scroll.rotation.z = Math.PI / 2; g.add(scroll);
  for (const x of [-1.35, 1.35]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.32, 14), relicRodMat);
    rod.rotation.z = Math.PI / 2; rod.position.x = x; g.add(rod);
  }
  const halo = new THREE.PointLight(0xffd27f, 2.0, 45, 2); g.add(halo);
  const baseY = groundY + 3.6;
  g.position.set(lx, baseY, lz);
  grp.add(g);
  town._relicObj = g;
  town._relicBaseY = baseY;
  town._relicPos = new THREE.Vector3(town.pos[0] + lx, groundY, town.pos[1] + lz);
  town._relicCollected = false;
}

// Spread the Light — unlit lamps scattered on a town; light them all on foot.
const lampPostGeo = new THREE.CylinderGeometry(0.22, 0.34, 5, 8);
const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 1 });
const lampHeadGeo = new THREE.SphereGeometry(0.65, 12, 12);
function buildLamps(town, grp) {
  const n = LIGHT_TOWNS[town.id];
  if (!n) { town._lamps = null; return; }
  town._lamps = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + town.order * 0.7;
    const r = town.radius * (0.28 + 0.42 * pseudo(i * 13 + town.order));
    const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
    const y = plateauY(town, lx, lz);
    const g = new THREE.Group();
    const post = new THREE.Mesh(lampPostGeo, lampPostMat); post.position.y = 2.5; post.castShadow = true; g.add(post);
    const head = new THREE.Mesh(lampHeadGeo, new THREE.MeshStandardMaterial({ color: 0x6a5a3a, emissive: 0x3a2a12, emissiveIntensity: 0.5, roughness: 0.5 }));
    head.position.y = 5.3; g.add(head);
    g.position.set(lx, y, lz);
    grp.add(g);
    // emissive-only (no extra real-time light — keeps the scene's light count sane)
    town._lamps.push({ head, lit: false, pos: new THREE.Vector3(town.pos[0] + lx, y, town.pos[1] + lz) });
  }
  town._lampsLit = 0;
  town._lit = false;
}

// A stone road from the shore to the city centre (the road to Damascus). The
// player lands at the seaward end and walks inland along it toward the city.
const roadSlabMat = new THREE.MeshStandardMaterial({ color: 0xbcab86, roughness: 1 });
const roadEdgeMat = new THREE.MeshStandardMaterial({ color: 0x8a7a58, roughness: 1 });
function buildRoad(town, grp, ang) {
  const dirx = Math.cos(ang), dirz = Math.sin(ang);
  const r0 = town.radius * 0.86, r1 = town.radius * 0.10;   // shore end → city end
  const steps = 16, seg = (r0 - r1) / steps;
  const yaw = Math.atan2(dirx, dirz);                       // align slab length along the road
  for (let i = 0; i < steps; i++) {
    const r = r0 - seg * i;
    const lx = dirx * r, lz = dirz * r;
    const y = plateauY(town, lx, lz);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, seg + 1.2), roadSlabMat);
    slab.position.set(lx, y + 0.12, lz); slab.rotation.y = yaw; slab.receiveShadow = true;
    grp.add(slab);
    if (i % 2 === 0) {                                       // low kerb stones along the edges
      for (const s of [-5, 5]) {
        const kx = lx - dirz * s, kz = lz + dirx * s;
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, seg + 1.2), roadEdgeMat);
        kerb.position.set(kx, plateauY(town, kx, kz) + 0.3, kz);
        kerb.rotation.y = yaw; grp.add(kerb);
      }
    }
  }
  // city gate — two pillars at the inner end marking Damascus
  for (const s of [-6, 6]) {
    const gx = dirx * (r1 + 4) - dirz * s, gz = dirz * (r1 + 4) + dirx * s;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 12, 12), marbleWarm);
    pillar.position.set(gx, plateauY(town, gx, gz) + 6, gz); pillar.castShadow = true; grp.add(pillar);
  }
}

// build all islands
TOWNS.forEach(buildIsland);

// ----------------------------------------------------------------------------
//  The Ship
// ----------------------------------------------------------------------------
const ship = new THREE.Group();
(function buildShip() {
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 });
  const woodLight = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.9 });
  // hull from an extruded boat outline
  const shape = new THREE.Shape();
  shape.moveTo(-9, -3); shape.quadraticCurveTo(0, -5, 9, -3);
  shape.lineTo(11, 2); shape.quadraticCurveTo(0, 4, -10, 2); shape.lineTo(-9, -3);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false }), woodDark);
  hull.rotation.x = Math.PI / 2; hull.position.y = 1.2; hull.position.z = 0; hull.scale.set(1, 1, 1);
  hull.castShadow = true; ship.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 7.5), woodLight);
  deck.position.y = 3.6; deck.castShadow = true; ship.add(deck);
  // bow rail
  const rail = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 6, 12), woodLight);
  // mast + sail
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 22, 10), woodLight);
  mast.position.set(-1, 14, 0); mast.castShadow = true; ship.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 16, 8), woodLight);
  yard.rotation.z = Math.PI / 2; yard.position.set(-1, 21, 0); ship.add(yard);
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xf3ead6, roughness: 1, side: THREE.DoubleSide });
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(15, 13, 8, 8), sailMat);
  sail.position.set(-1, 14.5, 0.1); sail.rotation.y = Math.PI / 2; sail.castShadow = true; ship.add(sail);
  ship.userData.sail = sail;
  // a red stripe on the sail
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(15, 2.4), new THREE.MeshStandardMaterial({ color: 0xb23a2e, side: THREE.DoubleSide }));
  stripe.position.set(-1, 14.5, 0.2); stripe.rotation.y = Math.PI / 2; ship.add(stripe);
  // little flag
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.6), new THREE.MeshStandardMaterial({ color: 0x2e6fb0, side: THREE.DoubleSide }));
  flag.position.set(-1, 24.5, 0); ship.add(flag);
})();
// start out in open water to the east; the first objective is Damascus
ship.position.set(1500, 0, 180);
scene.add(ship);
const shipState = { heading: Math.PI, speed: 0 };

// ----------------------------------------------------------------------------
//  Player state machine + first-person controls
// ----------------------------------------------------------------------------
const MODE = { SAIL: 'sail', FOOT: 'foot' };
const player = {
  mode: MODE.SAIL,
  pos: new THREE.Vector3(),       // on-foot position
  yaw: Math.PI,
  pitch: 0,
  currentTown: null,              // town the player is docked at
};

// mouse look
let locked = false;
function onMouseMove(e) {
  if (!locked) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch -= e.movementY * 0.0022;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
}
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });

// keyboard
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (conversionActive) {                           // Damascus road sequence
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!mazeActive && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) {
      const st = convSteps[convIdx];
      if (st && (st.k === 'v' || st.k === 'n' || st.k === 'heal')) convNext();
    }
    return;                                         // (maze movement reads keys[] directly)
  }
  if (cineOpen) {                                   // a scene is playing
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); advanceCine(); }
    return;
  }
  if (epistleOpen) return;                          // the word puzzle is mouse-driven
  if (pauseOpen) {                                  // pause menu is up
    if (e.code === 'Escape') { if (quitConfirmOpen) hideQuitConfirm(); else togglePause(); }
    return;
  }
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'KeyM') toggleMap();
  if (e.code === 'KeyJ') toggleJournal();
  if (e.code === 'KeyH') toggleHelp();
  if (e.code === 'KeyN') toggleMusic();
  if (e.code === 'Escape') {                         // close the top overlay, else open the menu
    if (panelOpen) closePanel();
    else if (journalOpen) toggleJournal();
    else if (helpOpen) toggleHelp();
    else if (started) togglePause();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });

// ----------------------------------------------------------------------------
//  Interaction
// ----------------------------------------------------------------------------
const visited = new Set();
let panelOpen = false;

const LAND_RANGE = 45;   // how close to shore you may step off the ship
const BOARD_RANGE = 26;  // how close to the landing spot you may re-board

// Nearest island by distance from the ship to the island's *shore* (edge).
function nearestTown() {
  let best = null, bd = Infinity;
  for (const t of TOWNS) {
    const d = Math.hypot(ship.position.x - t.pos[0], ship.position.z - t.pos[1]) - t.radius;
    if (d < bd) { bd = d; best = t; }
  }
  return { town: best, edgeDist: bd };
}

function tryInteract() {
  if (panelOpen) { closePanel(); return; }
  if (player.mode === MODE.SAIL) {
    const { town, edgeDist } = nearestTown();
    if (edgeDist < LAND_RANGE) disembark(town);
  } else {
    // read monument?
    const dm = player.pos.distanceTo(player.currentTown._monument);
    if (dm < 15) { openPanel(player.currentTown); return; }
    // re-board ship?
    const db = player.pos.distanceTo(player.boardPos);
    if (db < BOARD_RANGE) embark();
  }
}

function disembark(town) {
  player.mode = MODE.FOOT;
  player.currentTown = town;
  setMusicMood('town');
  // step ashore on the side of the island the ship sailed up to
  const cx = town.pos[0], cz = town.pos[1];
  const dir = new THREE.Vector2(ship.position.x - cx, ship.position.z - cz);
  if (dir.lengthSq() < 1e-4) dir.set(Math.cos(town._dockAng), Math.sin(town._dockAng));
  dir.normalize();
  // the road to Damascus: land at the road's seaward end and walk inland to the city
  const onRoad = town.conversion && !converted;
  if (onRoad) dir.set(Math.cos(town._dockAng), Math.sin(town._dockAng));
  const lx = dir.x * town.radius * 0.72, lz = dir.y * town.radius * 0.72;   // land a bit inland
  player.pos.set(cx + lx, Math.max(0, islandHeight(town, lx, lz)), cz + lz);
  // the shore landing where the ship waits — walk back here to re-board
  const bx = dir.x * town.radius * 0.92, bz = dir.y * town.radius * 0.92;
  player.boardPos = new THREE.Vector3(cx + bx, Math.max(0, islandHeight(town, bx, bz)), cz + bz);
  // face inland (toward the town centre / monument)
  player.yaw = Math.atan2(dir.x, dir.y);
  player.pitch = 0;
  if (onRoad) {                                   // defer the conversion — walk the road first
    awaitingConversion = { town };
    flash('The road to Damascus stretches ahead. Walk it toward the city…');
    return;
  }
  flash(`You step ashore at ${town.name}.`);
  if (!visited.has(town.id)) {
    const wasObjective = objectiveTown() && objectiveTown().id === town.id;
    visited.add(town.id);
    updateHUD(); refreshJournal();
    // celebrate any objective + open the history (the final step)
    const finish = () => {
      if (wasObjective) flash(`✦ Objective reached: ${town.name}!`);
      updateHUD(); refreshJournal();
      setTimeout(() => openPanel(town), 250);
    };
    // after the dramatic event, write the town's epistle if it has one
    const afterEvent = () => {
      if (EPISTLES[town.id] && !epistlesWritten.has(town.id)) startEpistle(town, finish);
      else finish();
    };
    playEvent(town, afterEvent);                  // (Damascus's conversion is deferred — see updateFoot)
  } else {
    updateHUD();
  }
}

function embark() {
  player.mode = MODE.SAIL;
  shipState.speed = 0;
  player.yaw = -shipState.heading - Math.PI / 2;   // look forward over the bow
  player.pitch = 0;
  flash('You board the ship and put out to sea.');
  player.currentTown = null;
  setMusicMood('sea');
  updateHUD();
}

// ----------------------------------------------------------------------------
//  UI / HUD
// ----------------------------------------------------------------------------
const $ = id => document.getElementById(id);
const promptEl = $('prompt');
const flashEl = $('flash');
const panelEl = $('panel');
const objEl = $('objective');
let flashTimer = 0;

function flash(msg) { flashEl.textContent = msg; flashEl.style.opacity = '1'; flashTimer = 3.2; }

function openPanel(town) {
  panelOpen = true;
  document.exitPointerLock();
  $('panelTitle').textContent = town.name;
  $('panelTag').textContent = town.tagline;
  $('panelBody').textContent = town.history;
  $('panelWorld').textContent = town.world;
  const got = relics.has(town.id);
  $('panelRelic').innerHTML = got
    ? `📜 <b>${town.relic.name}</b> — collected. <span style="color:#7a5a30;">${town.relic.found}</span>`
    : `📜 <b>${town.relic.name}</b> — a glowing letter waits somewhere on this island. Find it and walk into it.`;
  $('panelOrder').textContent = town.order === 0
    ? 'The road to Damascus — where the story begins'
    : `Stop ${town.order} of ${TOWNS.length - 1} on the voyages`;
  panelEl.classList.add('show');
}
function closePanel() {
  if (!panelOpen) return;
  panelOpen = false;
  panelEl.classList.remove('show');
}
$('panelClose').addEventListener('click', () => { closePanel(); canvas.requestPointerLock(); });

let helpOpen = false;
function toggleHelp() { helpOpen = !helpOpen; $('help').classList.toggle('show', helpOpen); }

// ----------------------------------------------------------------------------
//  Progress tracking
// ----------------------------------------------------------------------------
const eventsSeen = new Set();
const relics = new Set();
const epistlesWritten = new Set();      // ports whose letter you've written (Epistle puzzle)
const litTowns = new Set();             // towns you've filled with light (Spread the Light)
const N_EPISTLES = Object.keys(EPISTLES).length;
const N_LIGHT = Object.keys(LIGHT_TOWNS).length;

// The objective is the lowest-order port not yet reached. You may roam anywhere,
// but the journey only advances by reaching ports in order.
const byId = id => TOWNS.find(t => t.id === id);
function objectiveTown() {
  for (const id of JOURNEY_ORDER) if (!visited.has(id)) return byId(id);
  return null;
}

function updateHUD() {
  const v = visited.size, r = relics.size, n = TOWNS.length;
  const o = objectiveTown();
  objEl.innerHTML =
    `<b>Voyages of Paul</b> &nbsp; Ports ${v}/${n} · 📜 ${r}/${n} · ✍ ${epistlesWritten.size}/${N_EPISTLES} · ☀ ${litTowns.size}/${N_LIGHT}<br>` +
    (o ? `<span style="color:#ffd27f">⚓ Objective: reach <b>${o.name}</b></span>`
       : `<span style="color:#ffd27f">🎉 <b>The voyage is complete!</b></span>`);
}
updateHUD();

// ----------------------------------------------------------------------------
//  Screen shake + full-screen flash effects
// ----------------------------------------------------------------------------
let shake = 0;
function applyShake() {
  if (shake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    camera.position.z += (Math.random() - 0.5) * shake;
    shake *= 0.9;
  } else shake = 0;
}
const flashFxEl = $('flashFx');
function flashScreen(color, strength) {
  flashFxEl.style.background = color;
  flashFxEl.style.opacity = String(strength);
  clearTimeout(flashFxEl._t);
  flashFxEl._t = setTimeout(() => { flashFxEl.style.opacity = '0'; }, 90);
}

// ----------------------------------------------------------------------------
//  Cinematic event system
// ----------------------------------------------------------------------------
let cineOpen = false;
const cine = { town: null, lines: [], idx: 0, fx: null, big: '', acc: 0, onDone: null };
const cineBase = new THREE.Vector3();
const cineEl = $('cinematic'), cineBigEl = $('cineBig');

function playEvent(town, onDone) {
  cineOpen = true;
  document.exitPointerLock();
  cineBase.copy(camera.position);
  Object.assign(cine, { town, lines: town.event.lines, idx: 0, fx: town.event.fx, big: town.event.big || '', acc: 0, onDone });
  $('cineTitle').textContent = town.event.title;
  cineBigEl.textContent = cine.big;
  cineBigEl.style.opacity = '0';
  $('cineText').textContent = cine.lines[0];
  cineEl.classList.add('show');
  setMusicMood('event');
}
function advanceCine() {
  if (!cineOpen) return;
  cine.idx++;
  if (cine.idx >= cine.lines.length) { endCine(); return; }
  $('cineText').textContent = cine.lines[cine.idx];
  if (cine.fx === 'quake') sfxRumble();
  if (cine.fx === 'mob' || cine.fx === 'chant') sfxCrowd();
  if (cine.fx === 'stones') { sfxImpact(); flashScreen('#d8b0a0', 0.3); }
}
function endCine() {
  cineOpen = false;
  cineEl.classList.remove('show');
  shake = 0; flashFxEl.style.opacity = '0';
  eventsSeen.add(cine.town.id);
  refreshJournal();
  setMusicMood('town');
  const cb = cine.onDone; cine.onDone = null;
  if (cb) cb();
}
// drive ongoing effects while a scene is showing
function updateCine(dt, t) {
  camera.position.copy(cineBase);     // hold position; shake jitters around it
  cine.acc += dt;
  const f = cine.fx; let s = 0; let bigOp = 0.85;
  if (f === 'quake')       { s = 1.3; if (cine.acc > 0.55) { cine.acc = 0; sfxRumble(); flashScreen('#caa890', 0.18); } }
  else if (f === 'stones') { s = 0.5; bigOp = 0.85 + 0.1 * Math.sin(t * 18); if (cine.acc > 0.4) { cine.acc = 0; sfxImpact(); flashScreen('#d8b0a0', 0.22); } }
  else if (f === 'chant')  { s = 0.35; bigOp = 0.45 + 0.5 * Math.abs(Math.sin(t * 3.2)); if (cine.acc > 0.95) { cine.acc = 0; sfxCrowd(); } }
  else if (f === 'mob')    { s = 0.28; if (cine.acc > 0.7) { cine.acc = 0; sfxCrowd(); flashScreen('#b04030', 0.16); } }
  else if (f === 'snake')  { s = 0.14; if (cine.acc > 1.0) { cine.acc = 0; flashScreen('#3aa060', 0.18); } }
  else if (f === 'appeal' || f === 'arrive' || f === 'commission') { s = 0.05; if (cine.acc > 1.4) { cine.acc = 0; flashScreen('#ffd27f', 0.14); } }
  else if (f === 'vision') { s = 0.04; bigOp = 0.4 + 0.4 * Math.abs(Math.sin(t * 1.5)); }
  else                     { s = 0.04; }  // debate, farewell, depart, blind
  shake = Math.max(shake, s);
  if (cine.big) cineBigEl.style.opacity = String(bigOp);
}
cineEl.addEventListener('click', advanceCine);

// ----------------------------------------------------------------------------
//  Journal
// ----------------------------------------------------------------------------
let journalOpen = false;
function toggleJournal() {
  journalOpen = !journalOpen;
  if (journalOpen) { refreshJournal(); document.exitPointerLock(); }
  $('journal').classList.toggle('show', journalOpen);
}
function refreshJournal() {
  const n = TOWNS.length;
  $('jcount').innerHTML = `Ports ${visited.size}/${n} · ★ ${eventsSeen.size}/${n} · 📜 ${relics.size}/${n} · ✍ ${epistlesWritten.size}/${N_EPISTLES} · ☀ ${litTowns.size}/${N_LIGHT}`;
  const ordered = TOWNS.slice().sort((a, b) => a.order - b.order);
  const obj = objectiveTown();
  const badge = (on, icon, off, tip) => `<span class="badge ${on ? 'on' : 'off'}" title="${tip}">${on ? icon : off}</span>`;
  $('jlist').innerHTML = ordered.map((t, i) => {
    const v = visited.has(t.id);
    const isObj = obj && t.id === obj.id;
    const nm = v ? t.name : `<span style="color:${isObj ? '#c8941f' : '#b0a079'}">${i}. ${isObj ? '◆ ' + t.name + ' (objective)' : '? ? ?'}</span>`;
    let badges = badge(eventsSeen.has(t.id), '★', '·', 'event witnessed') + badge(relics.has(t.id), '📜', '·', 'letter found');
    if (EPISTLES[t.id]) badges += badge(epistlesWritten.has(t.id), '✍', '·', 'epistle written');
    if (LIGHT_TOWNS[t.id]) badges += badge(litTowns.has(t.id), '☀', '·', 'town filled with light');
    return `<div class="jrow ${v ? 'visited done' : ''}">
      <span class="dot"></span>
      <span class="nm">${nm}</span>${badges}
    </div>`;
  }).join('');
  const logs = ordered.filter(t => visited.has(t.id)).map(t => `<p>${t.log}</p>`);
  if (visited.size === 0) logs.push('<p class="pending">The voyage has not yet begun. Set sail and make your first landfall…</p>');
  else if (visited.size < n) logs.push('<p class="pending">…the voyage continues. Many ports still lie ahead.</p>');
  else logs.push('<p class="pending">…and so we came to the end of the voyage, the gospel sounding out unhindered.</p>');
  $('jlog').innerHTML = logs.join('');
}
$('journalClose').addEventListener('click', toggleJournal);
refreshJournal();

// ----------------------------------------------------------------------------
//  Epistle word puzzle — reorder the scrambled words of a real verse
// ----------------------------------------------------------------------------
let epistleOpen = false;
const epState = { town: null, done: null, target: [], chips: [], answer: [], pool: [] };
const epEl = $('epistle');

function shuffleNotIdentity(n) {                  // shuffled [0..n-1], never the identity order
  let idx;
  do {
    idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  } while (n > 1 && idx.every((v, i) => v === i));
  return idx;
}
function startEpistle(town, done) {
  const e = EPISTLES[town.id];
  epistleOpen = true;
  document.exitPointerLock();
  epState.town = town; epState.done = done;
  epState.target = e.text.split(' ');
  epState.chips = epState.target.map((w, i) => ({ id: i, word: w }));   // chip id i == correct position i
  epState.pool = shuffleNotIdentity(epState.target.length);
  epState.answer = [];
  $('epHead').textContent = `Write to the believers — ${town.name}`;
  $('epRef').textContent = e.ref;
  epEl.classList.add('show');
  renderEpistle();
}
function renderEpistle() {
  const word = id => epState.chips[id].word;
  const ans = $('epAnswer'), pool = $('epPool');
  ans.innerHTML = ''; pool.innerHTML = '';
  epState.answer.forEach(id => {
    const b = document.createElement('button'); b.className = 'chip placed'; b.textContent = word(id);
    b.onclick = () => { epState.answer = epState.answer.filter(x => x !== id); epState.pool.push(id); renderEpistle(); };
    ans.appendChild(b);
  });
  epState.pool.forEach(id => {
    const b = document.createElement('button'); b.className = 'chip'; b.textContent = word(id);
    b.onclick = () => { epState.pool = epState.pool.filter(x => x !== id); epState.answer.push(id); renderEpistle(); checkEpistle(); };
    pool.appendChild(b);
  });
}
function checkEpistle() {
  if (epState.answer.length !== epState.chips.length) return;
  const got = epState.answer.map(id => epState.chips[id].word).join(' ');
  if (got === epState.target.join(' ')) winEpistle();
  else { const a = $('epAnswer'); a.classList.add('wrong'); setTimeout(() => a.classList.remove('wrong'), 450); }
}
function winEpistle() {
  const town = epState.town, done = epState.done;
  epistleOpen = false; epEl.classList.remove('show');
  epistlesWritten.add(town.id);
  sfxChime();
  flash(`✍ You wrote the letter — ${EPISTLES[town.id].ref}`);
  updateHUD(); refreshJournal();
  if (done) done();
}
$('epClear').addEventListener('click', () => { epState.pool = epState.pool.concat(epState.answer); epState.answer = []; renderEpistle(); });
$('epHint').addEventListener('click', () => {            // guarantees progress to a full solution
  let i = 0;
  while (i < epState.answer.length && epState.chips[epState.answer[i]].word === epState.target[i]) i++;
  if (i < epState.answer.length) {                       // return the wrong tail to the pool
    epState.pool = epState.pool.concat(epState.answer.slice(i));
    epState.answer = epState.answer.slice(0, i);
  }
  if (i < epState.target.length) {                       // place the next correct word
    const need = epState.target[i];
    const pIdx = epState.pool.findIndex(id => epState.chips[id].word === need);
    if (pIdx >= 0) { const id = epState.pool[pIdx]; epState.pool.splice(pIdx, 1); epState.answer.push(id); }
  }
  renderEpistle(); checkEpistle();
});

// collect a relic when the player walks into it
function checkRelicPickup() {
  const town = player.currentTown;
  if (!town || town._relicCollected) return;
  const dx = player.pos.x - town._relicPos.x, dz = player.pos.z - town._relicPos.z;
  if (dx * dx + dz * dz < 7 * 7) {
    town._relicCollected = true;
    relics.add(town.id);
    if (town._relicObj) town._relicObj.visible = false;
    flash(`📜 You found: ${town.relic.name}`);
    sfxChime();
    updateHUD(); refreshJournal();
  }
}

// Spread the Light — light any lamp you walk up to
function checkLampLighting() {
  const town = player.currentTown;
  if (!town || !town._lamps || town._lit) return;
  for (const L of town._lamps) {
    if (L.lit) continue;
    const dx = player.pos.x - L.pos.x, dz = player.pos.z - L.pos.z;
    if (dx * dx + dz * dz < 6 * 6) {
      L.lit = true; town._lampsLit++;
      L.head.material.emissive.setHex(0xffce7a); L.head.material.emissiveIntensity = 2.4;
      sfxChime();
      if (town._lampsLit >= town._lamps.length) {
        town._lit = true; litTowns.add(town.id);
        flash(`☀ The good news spreads — ${town.name} is filled with light!`);
      } else {
        flash(`You share the good news… (${town._lampsLit}/${town._lamps.length} lamps lit)`);
      }
      updateHUD(); refreshJournal();
    }
  }
}

// The road to Damascus — as you near the city, the light from heaven strikes
function checkDamascusApproach() {
  if (!awaitingConversion || conversionActive) return;
  const town = awaitingConversion.town;
  if (player.currentTown !== town) return;
  const dx = player.pos.x - town.pos[0], dz = player.pos.z - town.pos[1];
  if (dx * dx + dz * dz < 30 * 30) {              // close to the city — it happens here
    awaitingConversion = null;
    const wasObjective = objectiveTown() && objectiveTown().id === town.id;
    visited.add(town.id);
    updateHUD(); refreshJournal();
    startConversion(town, () => {                 // flash → darkness → the Lord's voice → Ananias
      if (wasObjective) flash(`✦ Objective reached: ${town.name}!`);
      updateHUD(); refreshJournal();
      setTimeout(() => openPanel(town), 250);
    });
  }
}

// ============================================================================
//  The Damascus Road — conversion sequence + the Ananias maze minigame
// ============================================================================
let converted = false;
let conversionActive = false;
let awaitingConversion = null;     // {town}: landed at Damascus, walking the road to the city
let mazeActive = false;
const convEl = $('conversion'), convTextEl = $('convText');
let convSteps = [], convIdx = 0, convOnDone = null;

function startConversion(town, onDone) {
  conversionActive = true;
  convOnDone = onDone;
  document.exitPointerLock();
  setMusicMood('sacred');
  // a sequence of screens: f = flash, v = the Lord's voice (italic), n = narration, maze = minigame
  convSteps = [
    { k: 'flash' },
    { k: 'n', t: 'As you near Damascus, a light from heaven suddenly blazes around you. You fall to the ground.' },
    { k: 'v', t: '“Saul, Saul, why do you persecute me?”' },
    { k: 'n', t: 'Trembling, you answer: “Who are you, Lord?”' },
    { k: 'v', t: '“I am Jesus, whom you are persecuting.”' },
    { k: 'v', t: '“Rise and enter the city, and you will be told what you must do.”' },
    { k: 'n', t: 'You rise — but though your eyes are open, you can see nothing. They lead you by the hand into Damascus. For three days you are blind.' },
    { k: 'n', t: 'In the city, the Lord calls a disciple named Ananias: “Go to the street called Straight, and ask for a man of Tarsus named Saul.”' },
    { k: 'maze' },
    { k: 'heal', t: 'Ananias lays his hands on you: “Brother Saul, the Lord Jesus has sent me, that you may regain your sight.”' },
    { k: 'flashHeal' },
    { k: 'n', t: 'Immediately something like scales falls from your eyes — and you can see. You rise and are baptised. Saul the persecutor is now Paul, a chosen instrument.' },
    { k: 'end' },
  ];
  convIdx = -1;
  convEl.classList.add('show');
  convEl.style.background = '#000';
  convNext();
}

function convNext() {
  convIdx++;
  const step = convSteps[convIdx];
  if (!step) return endConversion();
  if (step.k === 'flash') {                          // the light from heaven
    convTextEl.textContent = '';
    convEl.style.transition = 'background .12s'; convEl.style.background = '#ffffff';
    setTimeout(() => {
      if (!conversionActive) return;
      convEl.style.transition = 'background 1.1s'; convEl.style.background = '#000';
      convNext();
    }, 620);
  } else if (step.k === 'flashHeal') {               // light returning to the eyes
    convEl.style.transition = 'background .12s'; convEl.style.background = '#fff4d8';
    setTimeout(() => {
      if (!conversionActive) return;
      convEl.style.transition = 'background 1.0s'; convEl.style.background = '#000';
      convNext();
    }, 560);
  } else if (step.k === 'v') {
    convTextEl.className = 'voice';
    convTextEl.textContent = step.t;
  } else if (step.k === 'n' || step.k === 'heal') {
    convTextEl.className = '';
    convTextEl.textContent = step.t;
  } else if (step.k === 'maze') {
    convTextEl.textContent = '';
    startMaze();          // pauses the sequence until Ananias reaches Saul
  } else if (step.k === 'end') {
    endConversion();
  }
}

function endConversion() {
  converted = true;
  conversionActive = false;
  convEl.classList.remove('show');
  flash('Your sight returns. Rise, Paul — your journey begins.');
  setMusicMood('town');
  const cb = convOnDone; convOnDone = null;
  if (cb) cb();
}

convEl.addEventListener('click', () => { if (conversionActive && !mazeActive) convNext(); });

// ----------------------------------------------------------------------------
//  Ananias maze (2D top-down)
// ----------------------------------------------------------------------------
const mazeEl = $('maze'), mazeCanvas = $('mazeCanvas'), mctx2 = mazeCanvas.getContext('2d');
const maze = { grid: null, W: 0, H: 0, ana: { x: 0, y: 0 }, saul: { x: 0, y: 0 }, tile: 0, ox: 0, oy: 0, won: false };

function genMaze(cw, ch) {
  const cells = Array.from({ length: ch }, () => Array.from({ length: cw }, () => ({ n: 1, s: 1, e: 1, w: 1, v: 0 })));
  const stack = [[0, 0]]; cells[0][0].v = 1;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const nb = [];
    if (y > 0 && !cells[y - 1][x].v) nb.push([x, y - 1, 'n']);
    if (y < ch - 1 && !cells[y + 1][x].v) nb.push([x, y + 1, 's']);
    if (x > 0 && !cells[y][x - 1].v) nb.push([x - 1, y, 'w']);
    if (x < cw - 1 && !cells[y][x + 1].v) nb.push([x + 1, y, 'e']);
    if (nb.length) {
      const [nx, ny, d] = nb[Math.floor(Math.random() * nb.length)];
      if (d === 'n') { cells[y][x].n = 0; cells[ny][nx].s = 0; }
      if (d === 's') { cells[y][x].s = 0; cells[ny][nx].n = 0; }
      if (d === 'e') { cells[y][x].e = 0; cells[ny][nx].w = 0; }
      if (d === 'w') { cells[y][x].w = 0; cells[ny][nx].e = 0; }
      cells[ny][nx].v = 1; stack.push([nx, ny]);
    } else stack.pop();
  }
  const W = 2 * cw + 1, H = 2 * ch + 1;
  const grid = Array.from({ length: H }, () => Array(W).fill(1));
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const tx = 2 * x + 1, ty = 2 * y + 1; grid[ty][tx] = 0;
    if (!cells[y][x].n) grid[ty - 1][tx] = 0;
    if (!cells[y][x].s) grid[ty + 1][tx] = 0;
    if (!cells[y][x].e) grid[ty][tx + 1] = 0;
    if (!cells[y][x].w) grid[ty][tx - 1] = 0;
  }
  return { grid, W, H };
}

function startMaze() {
  mazeActive = true;
  maze.won = false;
  const m = genMaze(10, 7);
  maze.grid = m.grid; maze.W = m.W; maze.H = m.H;
  maze.ana = { x: 1.5, y: 1.5 };
  maze.saul = { x: m.W - 1.5, y: m.H - 1.5 };
  resizeMaze();
  mazeEl.classList.add('show');
  requestAnimationFrame(mazeLoop);
}

function resizeMaze() {
  mazeCanvas.width = window.innerWidth;
  mazeCanvas.height = window.innerHeight;
  const pad = 60;
  maze.tile = Math.min((mazeCanvas.width - pad * 2) / maze.W, (mazeCanvas.height - pad * 2) / maze.H);
  maze.ox = (mazeCanvas.width - maze.tile * maze.W) / 2;
  maze.oy = (mazeCanvas.height - maze.tile * maze.H) / 2;
}

function isWall(x, y) {
  const gx = Math.floor(x), gy = Math.floor(y);
  if (gx < 0 || gy < 0 || gx >= maze.W || gy >= maze.H) return true;
  return maze.grid[gy][gx] === 1;
}
// circle (radius r) vs wall tiles — block per-axis
function mazeBlocked(x, y, r) {
  return isWall(x - r, y - r) || isWall(x + r, y - r) || isWall(x - r, y + r) || isWall(x + r, y + r);
}

let mazePrev = 0;
function mazeLoop(ts) {
  if (!mazeActive) return;
  const dt = Math.min(0.05, (ts - mazePrev) / 1000 || 0.016); mazePrev = ts;
  const sp = 5.2, r = 0.32;
  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  if (dx || dy) { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
  const a = maze.ana;
  const nx = a.x + dx * sp * dt;
  if (!mazeBlocked(nx, a.y, r)) a.x = nx;
  const ny = a.y + dy * sp * dt;
  if (!mazeBlocked(a.x, ny, r)) a.y = ny;
  // reached Saul?
  if (!maze.won && Math.hypot(a.x - maze.saul.x, a.y - maze.saul.y) < 0.7) {
    maze.won = true;
    sfxChime();
    setTimeout(endMaze, 700);
  }
  drawMaze(ts);
  requestAnimationFrame(mazeLoop);
}

function drawMaze(ts) {
  const c = mctx2, T = maze.tile, ox = maze.ox, oy = maze.oy;
  c.fillStyle = '#1a130c'; c.fillRect(0, 0, mazeCanvas.width, mazeCanvas.height);
  for (let y = 0; y < maze.H; y++) for (let x = 0; x < maze.W; x++) {
    const px = ox + x * T, py = oy + y * T;
    if (maze.grid[y][x] === 1) {
      c.fillStyle = '#6e4a2c'; c.fillRect(px, py, T + 1, T + 1);
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(px, py + T * 0.7, T + 1, T * 0.3);
    } else {
      c.fillStyle = '#d9c08a'; c.fillRect(px, py, T + 1, T + 1);
    }
  }
  const t = ts * 0.004;
  // Saul (goal) — glowing
  const sx = ox + maze.saul.x * T, sy = oy + maze.saul.y * T;
  const halo = 0.6 + 0.25 * Math.sin(t * 2);
  c.beginPath(); c.arc(sx, sy, T * (0.7 + halo * 0.3), 0, 7);
  c.fillStyle = `rgba(255,200,90,${0.18 + halo * 0.12})`; c.fill();
  c.beginPath(); c.arc(sx, sy, T * 0.32, 0, 7); c.fillStyle = '#ffd27f'; c.fill();
  label(c, 'Saul', sx, sy - T * 0.7, '#ffe6a8');
  // Ananias (player)
  const ax = ox + maze.ana.x * T, ay = oy + maze.ana.y * T;
  c.beginPath(); c.arc(ax, ay, T * 0.30, 0, 7); c.fillStyle = '#7fc4ff'; c.fill();
  c.lineWidth = 2; c.strokeStyle = '#dff0ff'; c.stroke();
  label(c, 'Ananias', ax, ay - T * 0.65, '#cfe8ff');
  if (maze.won) {
    c.fillStyle = 'rgba(255,244,216,0.5)'; c.fillRect(0, 0, mazeCanvas.width, mazeCanvas.height);
  }
}
function label(c, txt, x, y, col) {
  c.font = '600 13px Georgia, serif'; c.textAlign = 'center';
  c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(txt, x + 1, y + 1);
  c.fillStyle = col; c.fillText(txt, x, y);
}

function endMaze() {
  mazeActive = false;
  mazeEl.classList.remove('show');
  if (conversionActive) convNext();    // resume the conversion (healing)
}

// ---- minimap ----
const mapCanvas = $('minimap');
const mctx = mapCanvas.getContext('2d');
let mapVisible = true;
function toggleMap() { mapVisible = !mapVisible; mapCanvas.style.display = mapVisible ? 'block' : 'none'; }

function drawMinimap() {
  if (!mapVisible) return;
  const W = mapCanvas.width, H = mapCanvas.height;
  mctx.clearRect(0, 0, W, H);
  mctx.fillStyle = 'rgba(20,60,90,0.55)';
  mctx.fillRect(0, 0, W, H);
  // world bounds
  const minX = -1350, maxX = 1620, minZ = -760, maxZ = 760;
  const sx = x => ((x - minX) / (maxX - minX)) * W;
  const sz = z => ((z - minZ) / (maxZ - minZ)) * H;
  // towns
  const obj = objectiveTown();
  for (const t of TOWNS) {
    const x = sx(t.pos[0]), z = sz(t.pos[1]);
    if (obj && t.id === obj.id) {                 // pulsing ring on the current objective
      const pr = 6 + 2.5 * Math.sin(clock.elapsedTime * 4);
      mctx.beginPath(); mctx.arc(x, z, pr, 0, 7);
      mctx.strokeStyle = '#ff7a3c'; mctx.lineWidth = 2; mctx.stroke();
    }
    mctx.beginPath();
    mctx.arc(x, z, 4, 0, 7);
    mctx.fillStyle = visited.has(t.id) ? '#ffd27f' : (obj && t.id === obj.id ? '#ff9a4c' : '#cfe8ff');
    mctx.fill();
  }
  // ship / player
  const px = player.mode === MODE.SAIL ? ship.position.x : player.pos.x;
  const pz = player.mode === MODE.SAIL ? ship.position.z : player.pos.z;
  mctx.save();
  mctx.translate(sx(px), sz(pz));
  // facing direction in world (x,z): heading while sailing, camera-forward on foot
  let fX, fZ;
  if (player.mode === MODE.SAIL) { fX = Math.cos(shipState.heading); fZ = Math.sin(shipState.heading); }
  else { fX = -Math.sin(player.yaw); fZ = -Math.cos(player.yaw); }
  mctx.rotate(Math.atan2(fZ, fX) + Math.PI / 2);   // +z maps to screen-down, so use atan2 directly
  mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6); mctx.closePath();
  mctx.fillStyle = '#ff5c5c'; mctx.fill();
  mctx.restore();
}

// ----------------------------------------------------------------------------
//  Start overlay
// ----------------------------------------------------------------------------
let started = false;
$('startBtn').addEventListener('click', () => {
  started = true;
  $('start').style.display = 'none';
  canvas.requestPointerLock();
  startAudio();
});
canvas.addEventListener('click', () => { if (started && !panelOpen && !pauseOpen && !journalOpen && !epistleOpen) canvas.requestPointerLock(); });

// ----------------------------------------------------------------------------
//  Pause / quit menu + save & load (local file)
// ----------------------------------------------------------------------------
let pauseOpen = false;
let quitConfirmOpen = false;

function togglePause() {
  pauseOpen = !pauseOpen;
  $('pause').classList.toggle('show', pauseOpen);
  if (pauseOpen) { document.exitPointerLock(); }
  else { hideQuitConfirm(); if (started) canvas.requestPointerLock(); }
}
function showQuitConfirm() { quitConfirmOpen = true; $('quitConfirm').classList.add('show'); }
function hideQuitConfirm() { quitConfirmOpen = false; $('quitConfirm').classList.remove('show'); }
function quitToTitle() {
  pauseOpen = false; $('pause').classList.remove('show'); hideQuitConfirm();
  started = false;
  shipState.speed = 0;
  document.exitPointerLock();
  $('startBtn').textContent = '⛵ Continue Voyage';
  $('start').style.display = 'flex';
}

function saveGame() {
  const data = {
    game: 'voyages-of-paul', version: 1,
    savedAt: new Date().toISOString(),
    converted,
    visited: [...visited], eventsSeen: [...eventsSeen], relics: [...relics],
    epistles: [...epistlesWritten], lit: [...litTowns],
    ship: { x: ship.position.x, z: ship.position.z, heading: shipState.heading },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url; a.download = `voyages-of-paul-${stamp}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  const btn = $('saveBtn');                        // visible confirmation on the button itself
  btn.textContent = '✓ Saved to your downloads';
  setTimeout(() => { btn.textContent = '💾 Save progress (download)'; }, 2200);
}

function applyState(d) {
  converted = !!d.converted;
  awaitingConversion = null;                     // resume cleanly at sea
  visited.clear(); (d.visited || []).forEach(id => byId(id) && visited.add(id));
  eventsSeen.clear(); (d.eventsSeen || []).forEach(id => eventsSeen.add(id));
  relics.clear(); (d.relics || []).forEach(id => relics.add(id));
  epistlesWritten.clear(); (d.epistles || []).forEach(id => epistlesWritten.add(id));
  litTowns.clear(); (d.lit || []).forEach(id => litTowns.add(id));
  for (const t of TOWNS) {                       // restore collected-letter state
    t._relicCollected = relics.has(t.id);
    if (t._relicObj) t._relicObj.visible = !t._relicCollected;
    if (t._lamps) {                              // restore Spread-the-Light state
      const fullyLit = litTowns.has(t.id);
      t._lit = fullyLit; t._lampsLit = fullyLit ? t._lamps.length : 0;
      for (const L of t._lamps) {
        L.lit = fullyLit;
        L.head.material.emissive.setHex(fullyLit ? 0xffce7a : 0x3a2a12);
        L.head.material.emissiveIntensity = fullyLit ? 2.4 : 0.5;
      }
    }
  }
  if (d.ship) { ship.position.set(d.ship.x, 0, d.ship.z); shipState.heading = d.ship.heading ?? Math.PI; }
  shipState.speed = 0;
  player.mode = MODE.SAIL;                        // always resume at sea, at the saved ship
  player.currentTown = null;
  closePanel();
  updateHUD(); refreshJournal();
}
function loadGameFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (d.game !== 'voyages-of-paul') throw new Error('not a save');
      applyState(d);
      enterGameAfterLoad();                        // resume (from menu) or start (from title)
      flash('Progress loaded.');
    } catch (e) { flash('Could not load that file — is it a Voyages of Paul save?'); }
  };
  reader.readAsText(file);
}

function enterGameAfterLoad() {
  if (pauseOpen) { togglePause(); return; }        // loaded from the in-game menu → resume
  if (!started) {                                  // loaded from the title screen → begin
    started = true;
    $('start').style.display = 'none';
    startAudio();
    canvas.requestPointerLock();
  }
}

$('titleLoadBtn').addEventListener('click', () => $('loadFile').click());
function updateMusicBtn() { $('musicBtn').textContent = music.on ? '🎵 Music: On' : '🔇 Music: Off'; }
$('musicBtn').addEventListener('click', () => { toggleMusic(); });
$('resumeBtn').addEventListener('click', () => togglePause());
$('saveBtn').addEventListener('click', () => saveGame());
$('loadBtn').addEventListener('click', () => $('loadFile').click());
$('loadFile').addEventListener('change', e => { if (e.target.files[0]) loadGameFile(e.target.files[0]); e.target.value = ''; });
$('quitBtn').addEventListener('click', () => showQuitConfirm());
$('quitNo').addEventListener('click', () => hideQuitConfirm());
$('quitYes').addEventListener('click', () => quitToTitle());

// ----------------------------------------------------------------------------
//  Ambient procedural ocean sound (optional, generated — no assets)
// ----------------------------------------------------------------------------
let audioCtx = null;
function startAudio() {
  if (audioCtx) return;          // don't re-create on Continue
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    audioCtx = ctx;
    const bufSize = 2 * ctx.sampleRate;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource(); noise.buffer = noiseBuf; noise.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 450;
    const gain = ctx.createGain(); gain.gain.value = 0.06;
    // slow swell via LFO on gain
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(); lfo.start();
    startMusic();                                  // begin the procedural soundbed
    setMusicMood(player.mode === MODE.FOOT ? 'town' : 'sea');
  } catch (e) { /* audio is a nice-to-have */ }
}

// --- one-shot sound effects for the cinematic events -----------------------
function sfxRumble() {                         // deep earthquake / thunder
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const o = audioCtx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(60, now);
  o.frequency.exponentialRampToValueAtTime(28, now + 0.9);
  const g = audioCtx.createGain(); g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.6, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  o.connect(g); g.connect(audioCtx.destination); o.start(now); o.stop(now + 1.05);
}
function noiseBurst(dur, cutoff, vol) {
  if (!audioCtx) return;
  const n = Math.floor(audioCtx.sampleRate * dur);
  const b = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.6);
  const s = audioCtx.createBufferSource(); s.buffer = b;
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = audioCtx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(audioCtx.destination); s.start();
}
function sfxImpact() { noiseBurst(0.18, 1400, 0.4); }      // a thrown stone
function sfxCrowd()  { noiseBurst(0.5, 700, 0.32); }       // a roaring crowd
function sfxChime() {                                       // collecting a relic
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [523.25, 783.99].forEach((fr, i) => {
    const o = audioCtx.createOscillator(); o.type = 'triangle'; o.frequency.value = fr;
    const g = audioCtx.createGain(); g.gain.setValueAtTime(0.0001, now + i * 0.09);
    g.gain.linearRampToValueAtTime(0.22, now + i * 0.09 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.5);
    o.connect(g); g.connect(audioCtx.destination); o.start(now + i * 0.09); o.stop(now + i * 0.09 + 0.55);
  });
}

// ============================================================================
//  Procedural music — a calm, vaguely Middle-Eastern soundbed (WebAudio, no
//  assets). Built on the Hijaz maqam; layers a drone, a plucked oud-ish line,
//  a breathy ney lead, and (in towns) a soft frame-drum. Cross-fades by mood.
// ============================================================================
const HIJAZ = [0, 1, 4, 5, 7, 8, 10];            // Hijaz scale (semitone steps)
const ROOT_HZ = 146.83;                          // D3
const semi = n => ROOT_HZ * Math.pow(2, n / 12);
function scaleHz(deg, oct) {                      // deg into the Hijaz scale, octave offset
  const i = ((deg % HIJAZ.length) + HIJAZ.length) % HIJAZ.length;
  return semi(HIJAZ[i] + 12 * oct);
}

const music = {
  on: true, started: false, mood: 'sea',
  master: null, drone: null, droneGain: null, melGain: null, drumGain: null,
  reverb: null, nextBeat: 0, beat: 0, timer: null, density: 0.35, drums: false,
};

function buildReverb(ctx) {                       // tiny impulse-response for warmth
  const len = ctx.sampleRate * 1.6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  const conv = ctx.createConvolver(); conv.buffer = buf; return conv;
}

function startMusic() {
  if (!audioCtx || music.started) return;
  music.started = true;
  const ctx = audioCtx;
  music.master = ctx.createGain(); music.master.gain.value = music.on ? 0.0 : 0.0;
  music.reverb = buildReverb(ctx);
  const revGain = ctx.createGain(); revGain.gain.value = 0.35;
  music.reverb.connect(revGain); revGain.connect(music.master);
  music.master.connect(ctx.destination);
  // gentle fade-in
  music.master.gain.setValueAtTime(0.0001, ctx.currentTime);
  music.master.gain.linearRampToValueAtTime(music.on ? 0.5 : 0.0001, ctx.currentTime + 4);

  // --- drone (root + fifth), continuous ---
  music.droneGain = ctx.createGain(); music.droneGain.gain.value = 0.12;
  music.droneGain.connect(music.master);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
  lp.connect(music.droneGain);
  [ROOT_HZ, ROOT_HZ * 1.5, ROOT_HZ * 2].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    o.detune.value = (i - 1) * 5;
    const g = ctx.createGain(); g.gain.value = i === 2 ? 0.25 : 0.5;
    o.connect(g); g.connect(lp); o.start();
  });

  music.melGain = ctx.createGain(); music.melGain.gain.value = 0.5;
  music.melGain.connect(music.reverb); music.melGain.connect(music.master);
  music.drumGain = ctx.createGain(); music.drumGain.gain.value = 0.0;
  music.drumGain.connect(music.master);

  music.nextBeat = ctx.currentTime + 0.2; music.beat = 0;
  music.timer = setInterval(musicScheduler, 60);
}

function pluck(time, freq, dur, peak, type) {     // oud/ney-like note
  const ctx = audioCtx;
  const o = ctx.createOscillator(); o.type = type || 'triangle'; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(peak, time + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.connect(g); g.connect(music.melGain);
  o.start(time); o.stop(time + dur + 0.05);
}
function frameDrum(time, accent) {
  const ctx = audioCtx;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(accent ? 130 : 90, time);
  o.frequency.exponentialRampToValueAtTime(50, time + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(accent ? 0.5 : 0.28, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  o.connect(g); g.connect(music.drumGain);
  o.start(time); o.stop(time + 0.2);
}

function musicScheduler() {
  if (!audioCtx) return;
  const ctx = audioCtx, spb = 0.5;               // seconds per beat (~120bpm half-time feel)
  while (music.nextBeat < ctx.currentTime + 0.25) {
    const t = music.nextBeat, b = music.beat;
    if (music.drums) {                            // frame-drum pattern in towns
      if (b % 4 === 0) frameDrum(t, true);
      else if (b % 4 === 2) frameDrum(t, false);
      else if (b % 8 === 5) frameDrum(t, false);
    }
    // sparse, improvisatory melody on the Hijaz scale
    if (Math.random() < music.density) {
      const deg = Math.floor(Math.random() * 7);
      const oct = Math.random() < 0.3 ? 1 : 0;
      const ney = Math.random() < 0.35;
      pluck(t, scaleHz(deg, oct), ney ? 1.4 : 0.7, ney ? 0.18 : 0.22, ney ? 'sine' : 'triangle');
    }
    music.nextBeat += spb; music.beat++;
  }
}

// mood cross-fades (called as the player's situation changes)
function setMusicMood(mood) {
  if (!audioCtx || !music.started || mood === music.mood) return;
  music.mood = mood;
  const ctx = audioCtx, T = 1.5;
  const ramp = (param, v) => { param.cancelScheduledValues(ctx.currentTime); param.setTargetAtTime(v, ctx.currentTime, T / 3); };
  if (mood === 'sea')        { music.density = 0.30; music.drums = false; ramp(music.drumGain.gain, 0.0);  ramp(music.melGain.gain, 0.5);  ramp(music.droneGain.gain, 0.12); }
  else if (mood === 'town')  { music.density = 0.45; music.drums = true;  ramp(music.drumGain.gain, 0.32); ramp(music.melGain.gain, 0.55); ramp(music.droneGain.gain, 0.12); }
  else if (mood === 'event') { music.density = 0.12; music.drums = true;  ramp(music.drumGain.gain, 0.5);  ramp(music.melGain.gain, 0.25); ramp(music.droneGain.gain, 0.18); }
  else if (mood === 'sacred'){ music.density = 0.05; music.drums = false; ramp(music.drumGain.gain, 0.0);  ramp(music.melGain.gain, 0.5);  ramp(music.droneGain.gain, 0.22); }
}

function toggleMusic() {
  music.on = !music.on;
  if (music.master) {
    music.master.gain.cancelScheduledValues(audioCtx.currentTime);
    music.master.gain.setTargetAtTime(music.on ? 0.5 : 0.0001, audioCtx.currentTime, 0.4);
  }
  if (typeof updateMusicBtn === 'function') updateMusicBtn();
  flash(music.on ? '🎵 Music on' : '🔇 Music off');
}

// ----------------------------------------------------------------------------
//  Main loop
// ----------------------------------------------------------------------------
const clock = new THREE.Clock();
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();

function update(dt, t) {
  // --- water + sun uniforms ---
  waterUniforms.uTime.value = t;
  waterUniforms.uCamPos.value.copy(camera.position);

  // pulse the town orbs and bob/spin the relic scrolls
  for (const town of TOWNS) {
    if (town._orb) town._orb.material.emissiveIntensity = 1.1 + Math.sin(t * 3 + town.order) * 0.5;
    if (town._relicObj && !town._relicCollected) {
      town._relicObj.rotation.y = t * 1.1 + town.order;
      town._relicObj.position.y = town._relicBaseY + Math.sin(t * 2 + town.order) * 0.35;
    }
  }

  if (player.mode === MODE.SAIL) updateSailing(dt, t);
  else updateFoot(dt, t);

  // keep the ocean centred on camera; refresh the sky's view-ray matrix
  ocean.position.x = camera.position.x;
  ocean.position.z = camera.position.z;
  updateSky();

  // sun shadow follows player
  const focus = player.mode === MODE.SAIL ? ship.position : player.pos;
  sun.position.copy(sunDir).multiplyScalar(600).add(focus);
  sun.target.position.copy(focus);

  // flash fade
  if (flashTimer > 0) { flashTimer -= dt; if (flashTimer <= 0) flashEl.style.opacity = '0'; }

  updatePrompt();
}

function updateSailing(dt, t) {
  // steering — A/D turn the ship left/right; the locked camera turns with it
  const turnRate = SHIP_TURN * dt * (0.4 + Math.min(1, Math.abs(shipState.speed) / 40) * 0.6);
  if (keys['KeyA'] || keys['ArrowLeft'])  shipState.heading -= turnRate;   // turn left
  if (keys['KeyD'] || keys['ArrowRight']) shipState.heading += turnRate;   // turn right
  // throttle
  if (keys['KeyW'] || keys['ArrowUp'])   shipState.speed += SHIP_ACCEL * dt;
  else if (keys['KeyS'] || keys['ArrowDown']) shipState.speed -= SHIP_ACCEL * dt;
  else shipState.speed *= (1 - 0.6 * dt);   // drag
  shipState.speed = Math.max(-SHIP_MAXSPD * 0.4, Math.min(SHIP_MAXSPD, shipState.speed));

  const hx = Math.cos(shipState.heading), hz = Math.sin(shipState.heading);
  // intended velocity this frame
  let vx = hx * shipState.speed, vz = hz * shipState.speed;
  let nxp = ship.position.x + vx * dt, nzp = ship.position.z + vz * dt;

  // slide along island shores so you glide around the coast and never get stuck
  for (const town of TOWNS) {
    const ddx = nxp - town.pos[0], ddz = nzp - town.pos[1];
    const d = Math.hypot(ddx, ddz) || 1e-4;
    const keep = town.radius + 18;
    if (d < keep) {
      const nx = ddx / d, nz = ddz / d;            // outward normal
      const vn = vx * nx + vz * nz;                // inward velocity component
      if (vn < 0) {                                // heading into the shore → slide
        vx -= vn * nx; vz -= vn * nz;              // cancel the inward part (keep tangential)
        const sp = Math.abs(shipState.speed);
        if (Math.hypot(vx, vz) < sp * 0.25 && sp > 1) {   // nearly head-on → curve around the coast
          const side = (hx * nz - hz * nx) >= 0 ? 1 : -1;
          vx += -nz * side * sp * 0.7;
          vz += nx * side * sp * 0.7;
        }
        shipState.speed *= 0.99;                   // a whisper of drag, never a dead stop
      }
      nxp = town.pos[0] + nx * keep + vx * dt;     // ride the boundary, moving tangentially
      nzp = town.pos[1] + nz * keep + vz * dt;
    }
  }
  ship.position.x = nxp; ship.position.z = nzp;

  // gentle bob for the hull only — the camera stays level so the horizon is steady
  const wy = waterHeightAt(ship.position.x, ship.position.z, t);
  ship.position.y = wy * 0.35;
  ship.rotation.y = -shipState.heading;     // bow (+x) points along the heading
  ship.rotation.z = Math.sin(t * 1.3) * 0.03 + (keys['KeyA'] ? -0.05 : keys['KeyD'] ? 0.05 : 0);
  ship.rotation.x = Math.sin(t * 1.1 + 1) * 0.025 - Math.min(0.06, shipState.speed / SHIP_MAXSPD * 0.05);

  // camera: near the bow, looking forward along the heading. Its height and look
  // target are kept LEVEL (independent of the wave bob) so the water line is stable.
  const camBob = Math.sin(t * 0.7) * 0.25;
  camera.position.set(ship.position.x + hx * 2.0, DECK_HEIGHT + 3.0 + camBob, ship.position.z + hz * 2.0);
  camera.lookAt(ship.position.x + hx * 40, 2.0, ship.position.z + hz * 40);
}

function updateFoot(dt, t) {
  const town = player.currentTown;
  const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? RUN_SPEED : WALK_SPEED;
  fwd.set(Math.sin(player.yaw), 0, Math.cos(player.yaw)).multiplyScalar(-1);
  right.set(fwd.z, 0, -fwd.x);
  const move = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp'])    move.add(fwd);
  if (keys['KeyS'] || keys['ArrowDown'])  move.sub(fwd);
  if (keys['KeyD'] || keys['ArrowRight']) move.add(right);
  if (keys['KeyA'] || keys['ArrowLeft'])  move.sub(right);
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * dt);
    player.pos.x += move.x;
    player.pos.z += move.z;
  }
  // clamp to island so you can't walk off into the sea
  const lx = player.pos.x - town.pos[0], lz = player.pos.z - town.pos[1];
  const d = Math.hypot(lx, lz);
  const maxR = town.radius * 0.96;
  if (d > maxR) {
    player.pos.x = town.pos[0] + (lx / d) * maxR;
    player.pos.z = town.pos[1] + (lz / d) * maxR;
  }
  // follow terrain height
  const gy = islandHeight(town, player.pos.x - town.pos[0], player.pos.z - town.pos[1]);
  player.pos.y = Math.max(0, gy);

  checkRelicPickup();
  checkLampLighting();
  checkDamascusApproach();

  // head bob
  const bob = (move.lengthSq() > 0) ? Math.sin(t * 11) * 0.08 : 0;
  camera.position.set(player.pos.x, player.pos.y + EYE_HEIGHT + bob, player.pos.z);
  applyLook();
}

function applyLook() {
  const q = new THREE.Quaternion();
  const e = new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ');
  q.setFromEuler(e);
  camera.quaternion.copy(q);
}

function updatePrompt() {
  let msg = '';
  if (player.mode === MODE.SAIL) {
    const { town, edgeDist } = nearestTown();
    const obj = objectiveTown();
    if (edgeDist < LAND_RANGE) {
      const isObj = obj && town.id === obj.id;
      msg = `Press <b>E</b> to step ashore at <b>${town.name}</b>` + (isObj ? ' &nbsp;⚓<b>(your objective)</b>' : '');
    } else if (obj) {
      const ed = Math.max(0, Math.round(Math.hypot(ship.position.x - obj.pos[0], ship.position.z - obj.pos[1]) - obj.radius));
      msg = `⚓ Make for <b>${obj.name}</b> — ${ed}m &nbsp;·&nbsp; follow the pulsing marker on the map`;
    } else {
      msg = `The voyage is complete — sail the seas freely.`;
    }
  } else if (awaitingConversion && awaitingConversion.town === player.currentTown) {
    msg = `Follow the <b>road</b> toward the city of <b>Damascus</b>…`;
  } else {
    const town = player.currentTown;
    const dm = player.pos.distanceTo(town._monument);
    const db = player.pos.distanceTo(player.boardPos);
    const letterLeft = !relics.has(town.id);
    const lampsLeft = town._lamps && !town._lit;
    if (dm < 15) msg = `Press <b>E</b> to read the history of <b>${town.name}</b>`;
    else if (db < BOARD_RANGE) msg = `Press <b>E</b> to board your ship and sail on`;
    else if (lampsLeft) msg = `<b>Spread the good news</b> — walk up to the dark <b>☀ lamps</b> to light them ` +
      `(${town._lampsLit}/${town._lamps.length})` +
      (letterLeft ? ' · find the <b>📜 letter</b>' : '');
    else msg = `Explore <b>${town.name}</b> · read the <b>monument</b>` +
      (letterLeft ? ' · find the glowing <b>📜 letter</b>' : ' · 📜 letter found') +
      ' · return to shore to sail on';
  }
  promptEl.innerHTML = msg;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (started && !panelOpen && !cineOpen && !journalOpen && !conversionActive && !mazeActive && !pauseOpen && !epistleOpen) {
    update(dt, t);
  } else if (started) {         // paused (reading / scene / journal / conversion) — keep world alive
    waterUniforms.uTime.value = t;
    waterUniforms.uCamPos.value.copy(camera.position);
    updateSky();
    if (cineOpen) updateCine(dt, t);
  }
  applyShake();
  drawMinimap();
  renderer.render(scene, camera);
}
animate();

// ----------------------------------------------------------------------------
//  Resize
// ----------------------------------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (mazeActive) resizeMaze();
});

// position camera initially so the first frame looks right (bow view, looking forward)
{
  const hx0 = Math.cos(shipState.heading), hz0 = Math.sin(shipState.heading);
  camera.position.set(ship.position.x + hx0 * 2.0, DECK_HEIGHT + 3.0, ship.position.z + hz0 * 2.0);
  camera.lookAt(ship.position.x + hx0 * 40, 2.0, ship.position.z + hz0 * 40);
}
updateSky();
