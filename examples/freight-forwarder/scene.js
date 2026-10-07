/*
 * Northline's voyage: one container ship, built in code, sailing from Yangshan
 * to Maasvlakte as the page scrolls. The ship stays at the origin (bow toward
 * +z); the water flows past it and the two ports slide in and out along z.
 *
 * Each section names a shot with data-shot. A shot holds while its section
 * fills the screen and blends to the next only near the boundary, and the
 * live state eases toward the target so it settles in about 0.6 s.
 * Drawing stops whenever no .window section is on screen.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
const layer = document.querySelector('.scene-layer');
const canvas = layer && layer.querySelector('canvas');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/* ---------- Shots: one per section ---------- */
// cam/look in metres around the ship; sun is the direction toward the sun (or the moon);
// shift moves the subject right (+) or left (-) as a share of the width, clearing room for the copy.
const SHOTS = {
  dock: {
    cam: [-60, 15, -66], look: [6, 13, 10], shift: 0.17, fov: 36,
    top: '#2b3858', horizon: '#e7a07a', sun: [-0.62, 0.1, 0.78], sunColor: '#ffb27d', sunI: 2.8,
    hemiSky: '#93a2c6', hemiGround: '#3b2c2a', hemiI: 0.9, deep: '#152a3b', fog: 0.0011,
    night: 0.12, load: 0.72, speed: 0, wake: 0, shanghai: 0, rotterdam: 1500, plane: 0, exposure: 1,
  },
  services: {
    cam: [14, 34, -120], look: [0, 8, 24], shift: 0, fov: 38,
    top: '#40618f', horizon: '#e6c4a6', sun: [-0.4, 0.35, 0.83], sunColor: '#ffd2a8', sunI: 2.9,
    hemiSky: '#a8bad6', hemiGround: '#3f3a36', hemiI: 0.95, deep: '#14324a', fog: 0.001,
    night: 0, load: 1, speed: 7, wake: 0.8, shanghai: -650, rotterdam: 1500, plane: 0, exposure: 1,
  },
  sea: {
    cam: [64, 40, -26], look: [0, 6, 16], shift: 0.15, fov: 38,
    top: '#3a6c9c', horizon: '#cddbe2', sun: [0.32, 0.86, 0.38], sunColor: '#fff3df', sunI: 3.3,
    hemiSky: '#bcd2ea', hemiGround: '#45505a', hemiI: 1, deep: '#10364f', fog: 0.0009,
    night: 0, load: 1, speed: 9, wake: 1, shanghai: -1500, rotterdam: 1500, plane: 0, exposure: 1,
  },
  lanes: {
    cam: [-72, 22, 40], look: [0, 8, 0], shift: 0, fov: 38,
    top: '#365f8b', horizon: '#d8d3c4', sun: [0.4, 0.55, -0.72], sunColor: '#ffeccc', sunI: 3,
    hemiSky: '#b4c6dc', hemiGround: '#433f3a', hemiI: 0.95, deep: '#12354c', fog: 0.0009,
    night: 0, load: 1, speed: 9, wake: 1, shanghai: -1500, rotterdam: 1500, plane: 0, exposure: 1,
  },
  air: {
    cam: [-34, 7, 22], look: [14, 40, 220], shift: 0.1, fov: 40,
    top: '#1c2146', horizon: '#ee8a5c', sun: [0.18, 0.035, 1], sunColor: '#ff8a4a', sunI: 2.2,
    hemiSky: '#6c5b8a', hemiGround: '#2a1f26', hemiI: 0.75, deep: '#1a2233', fog: 0.0012,
    night: 0.45, load: 1, speed: 9, wake: 1, shanghai: -1500, rotterdam: 1500, plane: 1, exposure: 1,
  },
  night: {
    cam: [6, 150, -58], look: [0, 0, 10], shift: 0, fov: 34,
    top: '#040914', horizon: '#11213a', sun: [-0.42, 0.42, -0.3], sunColor: '#9fb4d9', sunI: 0.9,
    hemiSky: '#22334f', hemiGround: '#0a0d14', hemiI: 0.5, deep: '#06101c', fog: 0.001,
    night: 1, load: 1, speed: 9, wake: 1, shanghai: -1500, rotterdam: 1500, plane: 0, exposure: 1.1,
  },
  biscay: {
    cam: [72, 30, -60], look: [0, 8, 10], shift: 0, fov: 38,
    top: '#0d1630', horizon: '#3d3752', sun: [0.7, 0.02, -0.5], sunColor: '#c48a7a', sunI: 1.1,
    hemiSky: '#38405e', hemiGround: '#14121a', hemiI: 0.6, deep: '#0b1622', fog: 0.0011,
    night: 0.8, load: 1, speed: 8, wake: 0.9, shanghai: -1500, rotterdam: 900, plane: 0, exposure: 1,
  },
  arrive: {
    cam: [52, 17, 118], look: [-6, 13, 4], shift: -0.12, fov: 38,
    top: '#56698e', horizon: '#f1bf98', sun: [0.72, 0.12, -0.5], sunColor: '#ffc597', sunI: 2.5,
    hemiSky: '#a2b0cc', hemiGround: '#3d3330', hemiI: 0.9, deep: '#173044', fog: 0.0011,
    night: 0.18, load: 1, speed: 1.2, wake: 0.25, shanghai: -1500, rotterdam: 0, plane: 0, exposure: 1,
  },
};
const NUMS = ['shift', 'fov', 'sunI', 'hemiI', 'fog', 'night', 'load', 'speed', 'wake', 'shanghai', 'rotterdam', 'plane', 'exposure'];
const VECS = ['cam', 'look', 'sun'];
const COLS = ['top', 'horizon', 'sunColor', 'hemiSky', 'hemiGround', 'deep'];

function prepShot(s) {
  const o = {};
  NUMS.forEach((k) => { o[k] = s[k]; });
  VECS.forEach((k) => { o[k] = new THREE.Vector3(...s[k]); });
  COLS.forEach((k) => { o[k] = new THREE.Color(s[k]); });
  o.sun.normalize();
  return o;
}
function copyShot(src, out) {
  NUMS.forEach((k) => { out[k] = src[k]; });
  VECS.forEach((k) => { out[k].copy(src[k]); });
  COLS.forEach((k) => { out[k].copy(src[k]); });
  return out;
}
function mixShot(a, b, w, out) {
  NUMS.forEach((k) => { out[k] = a[k] + (b[k] - a[k]) * w; });
  VECS.forEach((k) => { out[k].lerpVectors(a[k], b[k], w); });
  COLS.forEach((k) => { out[k].copy(a[k]).lerp(b[k], w); });
  return out;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (error) { return false; }
}

if (canvas && hasWebGL()) {
  try { start(); } catch (error) { console.error('Northline scene failed; showing the drawn still.', error); root.classList.remove('has-scene'); }
}

function start() {
  /* ---------- Renderer, camera, scene ---------- */
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 7000);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 700 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  /* ---------- Sky: a gradient dome with the sun's glow and night stars ---------- */
  const skyUniforms = {
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uNight: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 48, 24),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uTop, uHorizon, uSunDir, uSunCol;
        uniform float uNight;
        varying vec3 vDir;
        float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.55, h), 0.75));
          col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.25, h));
          float s = max(dot(d, normalize(uSunDir)), 0.0);
          float above = smoothstep(-0.06, 0.02, uSunDir.y);
          col += uSunCol * (pow(s, 6.0) * 0.28 + pow(s, 48.0) * 0.5) * above;
          col += uSunCol * smoothstep(0.9993, 0.9997, s) * 4.0 * above;
          // stars: one per cell, round, only well above the horizon
          vec3 q = d * 260.0;
          vec3 cell = floor(q);
          float r = hash(cell);
          float star = step(0.9965, r) * smoothstep(0.32, 0.12, length(fract(q) - 0.5));
          col += vec3(0.85, 0.9, 1.0) * star * uNight * smoothstep(0.04, 0.25, h) * (0.5 + 0.5 * hash(cell + 7.0)) * 1.6;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  /* ---------- Ocean: Gerstner waves on a radial grid, dense near the ship ---------- */
  function makeOceanGeometry() {
    const segs = 200;
    const rings = [];
    for (let r = 1.2; r < 5200; r *= 1.032) rings.push(r);
    const pos = new Float32Array(rings.length * segs * 3);
    let p = 0;
    rings.forEach((r) => {
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        pos[p++] = Math.cos(a) * r; pos[p++] = 0; pos[p++] = Math.sin(a) * r;
      }
    });
    const idx = [];
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * segs + j;
        const b = i * segs + ((j + 1) % segs);
        const c = (i + 1) * segs + j;
        const d = (i + 1) * segs + ((j + 1) % segs);
        idx.push(a, b, c, b, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5200);
    return g;
  }
  const oceanUniforms = {
    uTime: { value: 0 }, uFlow: { value: 0 }, uWake: { value: 0 },
    uDeep: { value: new THREE.Color() }, uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uSunI: { value: 1 },
    uFogD: { value: 0.001 }, uNight: { value: 0 },
  };
  const ocean = new THREE.Mesh(makeOceanGeometry(), new THREE.ShaderMaterial({
    uniforms: oceanUniforms, fog: false,
    vertexShader: /* glsl */`
      uniform float uTime, uFlow;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      vec3 gerstner(vec4 w, vec2 p, inout vec3 T, inout vec3 B) {
        float steep = w.z, L = w.w;
        float k = 6.2831853 / L;
        float c = sqrt(9.8 / k);
        vec2 d = normalize(w.xy);
        float f = k * (dot(d, p) - c * uTime);
        float a = steep / k;
        T += vec3(-d.x * d.x * steep * sin(f), d.x * steep * cos(f), -d.x * d.y * steep * sin(f));
        B += vec3(-d.x * d.y * steep * sin(f), d.y * steep * cos(f), -d.y * d.y * steep * sin(f));
        return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
      }
      void main() {
        vec3 p = position;
        vec2 q = p.xz + vec2(0.0, uFlow);
        float att = 1.0 - smoothstep(380.0, 1100.0, length(p.xz));
        vec3 T = vec3(1.0, 0.0, 0.0), B = vec3(0.0, 0.0, 1.0);
        vec3 off = vec3(0.0);
        off += gerstner(vec4(1.0, 0.35, 0.13 * att, 74.0), q, T, B);
        off += gerstner(vec4(0.62, -0.78, 0.11 * att, 41.0), q, T, B);
        off += gerstner(vec4(-0.3, 1.0, 0.09 * att, 23.0), q, T, B);
        off += gerstner(vec4(0.92, 0.4, 0.06 * att, 13.0), q, T, B);
        p += off;
        vNormal2 = normalize(cross(B, T));
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFlow, uWake, uSunI, uFogD, uNight;
      uniform vec3 uDeep, uTop, uHorizon, uSunDir, uSunCol;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        float dist = length(cameraPosition - vWorld);
        vec2 q = vWorld.xz + vec2(0.0, uFlow);
        // fine ripples, faded with distance
        float rip = 1.0 - smoothstep(60.0, 420.0, dist);
        vec2 e = vec2(0.6, 0.0);
        float n0 = fbm(q * 0.35 + uTime * 0.12);
        vec3 N = normalize(vNormal2 + rip * 0.35 * vec3(n0 - fbm((q + e.xy) * 0.35 + uTime * 0.12), 0.0, n0 - fbm((q + e.yx) * 0.35 + uTime * 0.12)) * 3.0);
        vec3 L = normalize(uSunDir);
        float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        R.y = abs(R.y);
        vec3 skyc = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.55, R.y), 0.75));
        vec3 body = uDeep * (0.35 + 0.65 * max(dot(N, L), 0.0) * min(uSunI, 2.0) * 0.5 + 0.25);
        body += uDeep * 0.6 * pow(max(dot(V, -L), 0.0), 4.0) * (1.0 - fres); // light through wave crests
        vec3 col = mix(body, skyc, fres);
        float spec = pow(max(dot(R, L), 0.0), 220.0) * 5.0 + pow(max(dot(R, L), 0.0), 18.0) * 0.18;
        col += uSunCol * spec * smoothstep(-0.05, 0.05, L.y) * min(uSunI, 3.0) * 0.5;

        // wake: a turbulent band behind the stern and the two arms of the Kelvin V, moving with the water
        float behind = -vWorld.z - 58.0;
        float x = abs(vWorld.x);
        float width = 9.5 + max(behind, 0.0) * 0.11;
        float band = smoothstep(0.0, 6.0, behind) * smoothstep(width, width * 0.35, x) * exp(-max(behind, 0.0) / 420.0);
        float arms = smoothstep(4.0, 0.0, abs(x - max(behind, 0.0) * 0.36 - 10.0)) * step(-60.0, behind) * exp(-max(behind, 0.0) / 260.0);
        // the hull pushing water aside, strongest at the bow
        float hullHalf = vWorld.z < 35.0 ? 10.2 : 10.2 * (1.0 - pow(clamp((vWorld.z - 35.0) / 31.5, 0.0, 1.0), 2.0));
        float hullSide = smoothstep(4.5, 0.0, x - hullHalf) * step(-60.0, vWorld.z) * step(vWorld.z, 67.0) * (0.45 + 0.55 * smoothstep(20.0, 62.0, vWorld.z));
        float tex = fbm(q * vec2(0.22, 0.09) + vec2(0.0, -uTime * 0.1));
        float foam = (band * smoothstep(0.38, 0.62, tex) + arms * smoothstep(0.42, 0.6, tex) * 0.8 + hullSide * smoothstep(0.35, 0.6, tex)) * uWake;
        vec3 foamCol = mix(uTop, vec3(1.0), 0.75) * (0.35 + 0.65 * clamp(uSunI * 0.4, 0.0, 1.0)) + uSunCol * 0.08;
        col = mix(col, foamCol, clamp(foam, 0.0, 1.0) * (1.0 - uNight * 0.6));

        float fog = 1.0 - exp(-pow(uFogD * dist, 2.0));
        col = mix(col, uHorizon, fog);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(ocean);

  /* ---------- Materials ---------- */
  const mat = (color, roughness = 0.6, metalness = 0.2, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const hullMat = mat(0x13233a, 0.55, 0.35);
  const redMat = mat(0x8b2a22, 0.7, 0.2);
  const deckMat = mat(0x4b5a52, 0.85, 0.1);
  const whiteMat = mat(0xe8e6df, 0.6, 0.1);
  const orangeMat = mat(0xe8541e, 0.5, 0.25);
  const windowMat = mat(0x1a2128, 0.3, 0.4, { emissive: new THREE.Color(0xffc98a), emissiveIntensity: 0 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false });
  const add = (parent, geo, material, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = shadow;
    parent.add(m);
    return m;
  };

  /* ---------- The ship ---------- */
  const ship = new THREE.Group();
  scene.add(ship);
  function hullShape(halfBeam, stern, shoulder, bow) {
    // Shape space: x = beam, y = -z (so the bow lands at +z after rotating up)
    const s = new THREE.Shape();
    s.moveTo(-halfBeam, -stern);
    s.lineTo(halfBeam, -stern);
    s.lineTo(halfBeam, -shoulder);
    s.quadraticCurveTo(halfBeam, -bow + 4, 0, -bow);
    s.quadraticCurveTo(-halfBeam, -bow + 4, -halfBeam, -shoulder);
    s.closePath();
    return s;
  }
  function extrudeUp(shape, depth, bottom) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bottom, 0);
    return g;
  }
  // shape y = -z, so stern at z = -60 needs y = +60: pass negatives
  const hullOutline = hullShape(10, -60, -35, -66);
  add(ship, extrudeUp(hullOutline, 14, -6), hullMat, 0, 0, 0);
  add(ship, extrudeUp(hullShape(10.08, -60.08, -35, -66.1), 6.6, -6), redMat, 0, 0, 0, false);
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(hullShape(9.6, -59.6, -35, -65.3), 24), deckMat);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 8.02;
  deck.receiveShadow = true;
  ship.add(deck);

  // accommodation block, bridge and funnel near the stern
  add(ship, new THREE.BoxGeometry(16, 18, 9), whiteMat, 0, 17, -45);
  add(ship, new THREE.BoxGeometry(22, 2.4, 6.5), whiteMat, 0, 26.6, -43.5);
  [12.2, 15.6, 19, 22.4].forEach((y) => add(ship, new THREE.BoxGeometry(16.12, 1.1, 9.12), windowMat, 0, y, -45, false));
  add(ship, new THREE.BoxGeometry(22.1, 1, 6.6), windowMat, 0, 26.8, -43.5, false);
  add(ship, new THREE.BoxGeometry(5, 9, 5), orangeMat, 0, 31, -52);
  add(ship, new THREE.BoxGeometry(5.3, 1.6, 5.3), hullMat, 0, 35.6, -52);
  // forecastle and mast
  add(ship, new THREE.BoxGeometry(14, 2.4, 10), whiteMat, 0, 9.2, 49);
  add(ship, new THREE.CylinderGeometry(0.35, 0.45, 14, 8), whiteMat, 0, 17, 53);
  const mastLight = add(ship, new THREE.SphereGeometry(0.55, 12, 8), lampMat, 0, 24.4, 53, false);
  const sternLight = add(ship, new THREE.SphereGeometry(0.5, 12, 8), lampMat, 0, 33, -40, false);

  // the name on both sides of the bow
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 1024; nameCanvas.height = 128;
  const nameTex = new THREE.CanvasTexture(nameCanvas);
  nameTex.colorSpace = THREE.SRGBColorSpace;
  nameTex.anisotropy = 8;
  function drawName() {
    const g = nameCanvas.getContext('2d');
    g.clearRect(0, 0, 1024, 128);
    g.fillStyle = '#efebe3';
    g.font = '600 92px "Inter Tight", "Helvetica Neue", Arial, sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    if ('letterSpacing' in g) g.letterSpacing = '18px';
    g.fillText('NORTHLINE', 512, 68);
    nameTex.needsUpdate = true;
  }
  drawName();
  if (document.fonts && document.fonts.load) document.fonts.load('600 92px "Inter Tight"').then(drawName, () => {});
  const nameMat = new THREE.MeshStandardMaterial({ map: nameTex, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  [1, -1].forEach((side) => {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(28, 3.5), nameMat);
    plate.rotation.y = side * Math.PI / 2;
    plate.position.set(side * 10.06, 4.6, 18);
    ship.add(plate);
  });

  /* ---------- Containers ---------- */
  const corrugation = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, 256, 64);
    for (let x = 0; x < 256; x += 8) {
      g.fillStyle = '#b9b9b9'; g.fillRect(x, 0, 3, 64);
      g.fillStyle = '#f0f0f0'; g.fillRect(x + 4, 0, 2, 64);
    }
    g.strokeStyle = '#8c8c8c'; g.lineWidth = 5; g.strokeRect(2, 2, 252, 60);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  const boxGeo = new THREE.BoxGeometry(2.44, 2.59, 12.19);
  const boxMat = new THREE.MeshStandardMaterial({ map: corrugation, roughness: 0.72, metalness: 0.25 });
  const PALETTE = [
    [0xe8541e, 0.3], [0x1f4e79, 0.17], [0x8e3b2b, 0.13], [0xc9b48a, 0.1], [0x9aa3a8, 0.12], [0x2f6b62, 0.1], [0xdedbd2, 0.08],
  ];
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pickColor = () => {
    let r = rand();
    for (const [hex, w] of PALETTE) { if ((r -= w) <= 0) return new THREE.Color(hex); }
    return new THREE.Color(PALETTE[0][0]);
  };

  const bays = [-32.5, -19.5, -6.5, 6.5, 19.5, 32.5];
  const bayTiers = [4, 5, 6, 6, 5, 4];
  const slots = [];
  bays.forEach((z, b) => {
    const rows = z > 30 ? 6 : 8;
    for (let r = 0; r < rows; r++) {
      const x = (r - (rows - 1) / 2) * 2.5;
      const tiers = bayTiers[b] - (rand() < 0.22 ? 1 : 0);
      for (let t = 0; t < tiers; t++) slots.push({ x, y: 8 + 1.32 + t * 2.62, z, t, key: t + rand() * 0.9, color: pickColor() });
    }
  });
  slots.sort((a, b) => a.key - b.key);
  const N = slots.length;
  const span = 0.95 / N;
  const window_ = span * 0.6;
  slots.forEach((s, i) => { s.th = i * span; });
  // the hero rests exactly between two drops, so no box hangs in the air at rest
  const restLoad = (n) => Math.floor(n * N) * span + window_ + 1e-6;
  SHOTS.dock.load = restLoad(SHOTS.dock.load);

  const boxes = new THREE.InstancedMesh(boxGeo, boxMat, N);
  boxes.castShadow = true;
  boxes.receiveShadow = true;
  slots.forEach((s, i) => boxes.setColorAt(i, s.color));
  ship.add(boxes);
  const dummy = new THREE.Object3D();
  let placedLoad = -1;
  let nextSlot = slots[0];
  function placeBoxes(L) {
    if (Math.abs(L - placedLoad) < 1e-5) return;
    placedLoad = L;
    nextSlot = null;
    slots.forEach((s, i) => {
      const k = (L - s.th) / window_;
      if (k <= 0) {
        if (!nextSlot) nextSlot = s;
        dummy.scale.setScalar(0.0001);
        dummy.position.set(s.x, -50, s.z);
      } else {
        const e = 1 - Math.pow(1 - Math.min(1, k), 3);
        dummy.scale.setScalar(1);
        dummy.position.set(s.x, s.y + (1 - e) * 24, s.z);
      }
      dummy.updateMatrix();
      boxes.setMatrixAt(i, dummy.matrix);
    });
    boxes.instanceMatrix.needsUpdate = true;
  }

  /* ---------- Ports: quay, gantry cranes, stacks, lamps ---------- */
  function makePort(side, craneHex, craneZs) {
    const g = new THREE.Group();
    const concrete = mat(0x77726b, 0.95, 0);
    add(g, new THREE.BoxGeometry(80, 10, 1000), concrete, side * (12 + 40), -1, 0, false).receiveShadow = true;
    const steel = mat(craneHex, 0.5, 0.45);
    const dark = mat(0x22272d, 0.6, 0.5);
    const cranes = craneZs.map((cz) => {
      const c = new THREE.Group();
      c.position.z = cz;
      const legH = 44;
      [16, 34].forEach((lx) => [-7, 7].forEach((lz) => add(c, new THREE.BoxGeometry(1.4, legH, 1.4), steel, side * lx, 4 + legH / 2, lz)));
      [-7, 7].forEach((lz) => add(c, new THREE.BoxGeometry(19.4, 1.6, 1.6), steel, side * 25, 46, lz));
      [16, 34].forEach((lx) => { add(c, new THREE.BoxGeometry(1.4, 1.4, 15.4), steel, side * lx, 46, 0); add(c, new THREE.BoxGeometry(1.2, 1.2, 15.4), steel, side * lx, 12, 0); });
      add(c, new THREE.BoxGeometry(76, 2.6, 3.2), steel, side * 10, 49, 0);
      add(c, new THREE.BoxGeometry(1.8, 18, 1.8), steel, side * 30, 59, 0);
      const stay = (a, b) => {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
        const m = add(c, new THREE.BoxGeometry(0.4, 0.4, va.distanceTo(vb)), steel, 0, 0, 0);
        m.position.copy(va).add(vb).multiplyScalar(0.5);
        m.lookAt(vb.applyMatrix4(c.matrix));
        m.lookAt(c.localToWorld(new THREE.Vector3(...b)));
        return m;
      };
      c.updateMatrixWorld();
      stay([side * 30, 68, 0], [side * -27, 50.3, 0]);
      stay([side * 30, 68, 0], [side * 47, 50.3, 0]);
      add(c, new THREE.BoxGeometry(8, 6, 6), dark, side * 40, 53, 0); // machinery house
      add(c, new THREE.BoxGeometry(5, 2.2, 5.4), dark, 0, 47, 0); // trolley over the ship's centreline
      const hook = new THREE.Group();
      c.add(hook);
      add(hook, new THREE.BoxGeometry(2.7, 0.6, 12.4), dark, 0, 0, 0);
      const cable = add(hook, new THREE.BoxGeometry(0.15, 1, 0.15), dark, 0, 0, 0, false);
      const carried = new THREE.Mesh(boxGeo, boxMat.clone());
      carried.castShadow = true;
      carried.position.y = -1.6;
      hook.add(carried);
      return { group: c, hook, cable, carried };
    });
    cranes.forEach((c) => g.add(c.group));

    // container stacks on the terminal
    const stacks = [];
    for (let z = -460; z < 460; z += 13.2) {
      if (rand() < 0.12) continue;
      for (let r = 0; r < 12; r++) {
        const x = side * (42 + r * 2.6 + (r > 5 ? 6 : 0));
        const h = 1 + Math.floor(rand() * 4);
        for (let t = 0; t < h; t++) stacks.push([x, 4 + 1.3 + t * 2.62, z]);
      }
    }
    const yard = new THREE.InstancedMesh(boxGeo, boxMat, stacks.length);
    stacks.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z); dummy.scale.setScalar(1); dummy.updateMatrix();
      yard.setMatrixAt(i, dummy.matrix);
      yard.setColorAt(i, pickColor());
    });
    yard.receiveShadow = true;
    g.add(yard);

    // lamp masts along the quay
    const lamps = [];
    for (let z = -420; z <= 420; z += 70) {
      add(g, new THREE.CylinderGeometry(0.35, 0.5, 34, 6), dark, side * 38, 21, z, false);
      lamps.push(add(g, new THREE.BoxGeometry(3, 0.8, 3), lampMat, side * 38, 38.2, z, false));
    }
    scene.add(g);
    return { group: g, cranes, lamps };
  }
  const shanghai = makePort(1, 0xd6d3cb, [-6.5, 19.5]);
  const rotterdam = makePort(-1, 0x2d5f93, [-19.5, 6.5]);
  rotterdam.cranes.forEach((c) => { c.hook.visible = false; });

  /* ---------- The air freighter ---------- */
  const plane = new THREE.Group();
  const hullGrey = mat(0xd9dcdf, 0.45, 0.3);
  const fus = add(plane, new THREE.CylinderGeometry(2.6, 2.2, 60, 16), hullGrey, 0, 0, 0, false);
  fus.rotation.z = Math.PI / 2;
  const nose = add(plane, new THREE.SphereGeometry(2.6, 16, 12), hullGrey, 30, 0, 0, false);
  nose.scale.set(2.2, 1, 1);
  const wing = add(plane, new THREE.BoxGeometry(11, 0.7, 64), hullGrey, 2, -1, 0, false);
  wing.rotation.y = 0.18;
  add(plane, new THREE.BoxGeometry(6, 0.5, 22), hullGrey, -27, 1, 0, false);
  add(plane, new THREE.BoxGeometry(7, 10, 0.6), hullGrey, -27, 6, 0, false);
  [-11, 11].forEach((z) => add(plane, new THREE.CylinderGeometry(1.2, 1.2, 6, 10), hullGrey, 6, -2.6, z, false).rotation.z = Math.PI / 2);
  const navMat = (hex) => new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });
  const navRed = add(plane, new THREE.SphereGeometry(0.9, 8, 6), navMat(0xff3a2a), -3, -1, -32, false);
  const navGreen = add(plane, new THREE.SphereGeometry(0.9, 8, 6), navMat(0x3dff7a), -3, -1, 32, false);
  const strobe = add(plane, new THREE.SphereGeometry(1.1, 8, 6), navMat(0xffffff), -30, 11, 0, false);
  plane.visible = false;
  scene.add(plane);

  /* ---------- Scroll → shot ---------- */
  const sections = Array.from(document.querySelectorAll('[data-shot]')).filter((el) => SHOTS[el.dataset.shot]);
  const shots = Object.fromEntries(Object.entries(SHOTS).map(([k, v]) => [k, prepShot(v)]));
  const target = copyShot(shots[sections[0] ? sections[0].dataset.shot : 'dock'], prepShot(SHOTS.dock));
  const state = copyShot(target, prepShot(SHOTS.dock));
  const scratch = prepShot(SHOTS.dock);
  const airSection = document.querySelector('[data-shot="air"]');
  let airP = 0;

  const isDark = () => (root.dataset.theme || (darkQuery.matches ? 'dark' : 'light')) === 'dark';
  function computeTarget() {
    const vh = window.innerHeight || 1;
    const mid = vh / 2;
    const band = vh * 0.3;
    const rects = sections.map((el) => el.getBoundingClientRect());
    let i = rects.findIndex((r) => r.top <= mid && r.bottom > mid);
    if (i < 0) i = rects[0] && rects[0].top > mid ? 0 : rects.length - 1;
    const r = rects[i];
    const here = shots[sections[i].dataset.shot];
    let other = here;
    let w = 0;
    if (r.bottom - mid < band && i < sections.length - 1) { other = shots[sections[i + 1].dataset.shot]; w = 0.5 * (1 - (r.bottom - mid) / band); }
    else if (mid - r.top < band && i > 0) { other = shots[sections[i - 1].dataset.shot]; w = 0.5 * (1 - (mid - r.top) / band); }
    w = w * w * (3 - 2 * w * 2 / 2); // gentle ease; continuous at the boundary (w = 0.5 on both sides)
    mixShot(here, other, w, target);

    // tall-and-narrow screens: pull back and centre the subject
    const aspect = window.innerWidth / vh;
    if (aspect < 0.85) {
      const pull = aspect < 0.6 ? 1.6 : 1.3;
      target.cam.sub(target.look).multiplyScalar(pull).add(target.look);
      target.shift = 0;
      target.fov += 6;
    } else if (aspect < 1.25) {
      target.shift *= 0.4;
    }
    if (isDark()) {
      COLS.forEach((k) => { if (k !== 'sunColor') target[k].multiplyScalar(0.5); });
      target.sunI *= 0.55;
      target.hemiI *= 0.7;
      target.night = Math.min(1, target.night + 0.3);
    }
    if (airSection) {
      const ar = airSection.getBoundingClientRect();
      airP = Math.min(1, Math.max(0, (vh - ar.top) / (vh + ar.height)));
    }
  }

  /* ---------- Frame ---------- */
  let width = 0, height = 0;
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
  }
  resize();

  let time = 7.3; // a calm phase of the swell, used as the frozen frame under reduced motion
  let flow = 0;
  let last = performance.now();
  let raf = 0;
  const visible = new Set();
  const sunPos = new THREE.Vector3();

  function apply(dt) {
    const s = state;
    camera.fov = s.fov;
    camera.position.copy(s.cam);
    camera.lookAt(s.look);
    camera.setViewOffset(width, height, -s.shift * width, 0, width, height);
    camera.updateProjectionMatrix();
    renderer.toneMappingExposure = s.exposure;

    sky.position.copy(camera.position);
    skyUniforms.uTop.value.copy(s.top);
    skyUniforms.uHorizon.value.copy(s.horizon);
    skyUniforms.uSunDir.value.copy(s.sun).normalize();
    skyUniforms.uSunCol.value.copy(s.sunColor);
    skyUniforms.uNight.value = s.night;
    scene.fog.color.copy(s.horizon);
    scene.fog.density = s.fog;

    sunPos.copy(s.sun).normalize().multiplyScalar(320);
    sun.position.copy(sunPos);
    sun.color.copy(s.sunColor);
    sun.intensity = s.sunI * Math.min(1, Math.max(0, s.sun.y * 6 + 0.4));
    hemi.color.copy(s.hemiSky);
    hemi.groundColor.copy(s.hemiGround);
    hemi.intensity = s.hemiI;
    scene.environmentIntensity = 0.45 * (1 - s.night * 0.75);

    const u = oceanUniforms;
    u.uTime.value = time; u.uFlow.value = flow; u.uWake.value = s.wake;
    u.uDeep.value.copy(s.deep); u.uTop.value.copy(s.top); u.uHorizon.value.copy(s.horizon);
    u.uSunDir.value.copy(s.sun).normalize(); u.uSunCol.value.copy(s.sunColor); u.uSunI.value = s.sunI;
    u.uFogD.value = s.fog; u.uNight.value = s.night;

    // lights of the ship and quays come up with the night
    windowMat.emissiveIntensity = 0.15 + s.night * 2.6;
    lampMat.color.setRGB(1, 0.89, 0.69).multiplyScalar(0.25 + s.night * 2.2);
    mastLight.visible = sternLight.visible = s.night > 0.25;

    placeBoxes(s.load);
    // a box waits on the Shanghai spreaders: the next one to load, lowered as loading goes on
    shanghai.group.position.z = s.shanghai;
    shanghai.group.visible = Math.abs(s.shanghai) < 1300;
    rotterdam.group.position.z = s.rotterdam;
    rotterdam.group.visible = Math.abs(s.rotterdam) < 1300;
    shanghai.cranes.forEach((c, i) => {
      const sway = reduce.matches ? 0 : Math.sin(time * 0.7 + i * 2) * 0.12;
      const y = 38 - (s.load - 0.6) * 12 + i * 3;
      c.hook.position.set(sway, y, 0);
      c.cable.scale.y = 47 - y;
      c.cable.position.y = (47 - y) / 2;
      c.hook.visible = s.load < 0.985;
      if (nextSlot && i === 0) c.carried.material.color.copy(nextSlot.color);
    });

    // the freighter crosses the dusk sky with the scroll through the air section
    plane.visible = s.plane > 0.02;
    if (plane.visible) {
      plane.position.set(-760 + airP * 1520, 150 + Math.sin(airP * 3) * 6, 540);
      plane.rotation.set(0, 0, 0.03);
      const blink = reduce.matches ? 1 : (Math.sin(time * 5) > 0.2 ? 1 : 0.15);
      navRed.visible = navGreen.visible = true;
      strobe.visible = blink > 0.5;
      plane.scale.setScalar(Math.max(0.001, Math.min(1, s.plane * 1.4)));
    }

    // speed: the water flows past the hull
    if (!reduce.matches) flow += s.speed * dt;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    computeTarget();
    if (reduce.matches) copyShot(target, state);
    else {
      time += dt;
      const k = 1 - Math.exp(-dt / 0.17);
      mixShot(state, target, k, scratch);
      copyShot(scratch, state);
    }
    apply(dt);
    renderer.render(scene, camera);
    if (!root.classList.contains('has-scene')) root.classList.add('has-scene');
    if (!reduce.matches && visible.size) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  const windows = document.querySelectorAll('.window');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      if (visible.size) wake();
    });
    windows.forEach((el) => io.observe(el));
  } else windows.forEach((el) => visible.add(el));

  window.addEventListener('scroll', () => { if (visible.size || reduce.matches) wake(); }, { passive: true });
  window.addEventListener('resize', () => { resize(); wake(); });
  window.addEventListener('northline:theme', wake);
  if (reduce.addEventListener) reduce.addEventListener('change', wake);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  // first frame snaps to the shot in view, so nothing sweeps in on load
  computeTarget();
  copyShot(target, state);
  wake();
}
