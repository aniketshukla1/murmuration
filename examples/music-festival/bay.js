/*
 * Lowtide's signature: a 3D bay built in code. Scroll takes the tide out across
 * rippled sand and uncovers the Ring (a 26 m ring of light on piles) and the dance
 * floor around it; the camera drops from the dunes to crowd height and climbs back;
 * the flood returns at dawn. A 124 BPM kick pulses the Ring, the beams, the crowd
 * and sends rings across the water. See MOTION.md.
 *
 * Every section with [data-stop] names a camera stop below and carries data-tide
 * (0 low water, 1 high water). site.js turns scroll into the story value u.
 * Without WebGL this file does nothing and the page keeps its drawings.
 */
import * as THREE from 'three';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const finePointer = matchMedia('(pointer: fine)');
const small = Math.min(innerWidth, innerHeight) < 600 || (navigator.hardwareConcurrency || 8) <= 4;

const HIGH = 1.6;                 // sea level at high water (m)
const LOW = -2.6;                 // sea level at low water
const RING = [0, 15.7, -70];      // the Ring's centre; it faces the beach (+z)
const RING_R = 13;
const BPM = 124;
const BEAT = 60 / BPM;

/* ---------- The story: one camera stop per section ---------- */
// wide / narrow: where the stop's look point sits on screen (NDC x, y) on wide and tall screens.
const STOPS = {
  hero: {
    cam: [-6, 12, 84], look: RING, wide: [0.36, -0.2], narrow: [0, -0.34], crowd: 0,
    light: { pal: 'afternoon', ring: 0, beams: 0, lamps: 0 },
    dark: { pal: 'night', ring: 0.55, beams: 0, lamps: 1 },
  },
  ebb: {
    cam: [0, 6.5, 40], look: RING, wide: [0.38, -0.06], narrow: [0, -0.36], crowd: 0.12,
    light: { pal: 'sunset', ring: 0.45, beams: 0, lamps: 0.7 },
    dark: { pal: 'night', ring: 0.85, beams: 0.35, lamps: 1 },
  },
  lineup: {
    cam: [6, 6, 20], look: [0, 12, -70], wide: [0.5, 0.14], narrow: [0, 0.06], crowd: 1,
    light: { pal: 'dusk', ring: 1, beams: 1, lamps: 1 },
    dark: { pal: 'night', ring: 1, beams: 1, lamps: 1 },
  },
  tides: {
    cam: [95, 48, 30], look: [-5, 4, -72], wide: [0.46, 0.36], narrow: [0, -0.38], crowd: 1,
    light: { pal: 'night', ring: 1, beams: 0.8, lamps: 1 },
    dark: { pal: 'night', ring: 1, beams: 0.8, lamps: 1 },
  },
  beach: {
    cam: [-55, 20, 105], look: [0, 8, -70], wide: [0.52, 0.3], narrow: [0, 0.3], crowd: 1,
    light: { pal: 'night', ring: 1, beams: 1, lamps: 1 },
    dark: { pal: 'night', ring: 1, beams: 1, lamps: 1 },
  },
  tickets: {
    cam: [14, 5, 24], look: RING, wide: [0.52, -0.06], narrow: [0, -0.3], crowd: 0,
    light: { pal: 'dawn', ring: 0.2, beams: 0, lamps: 0.4 },
    dark: { pal: 'predawn', ring: 0.6, beams: 0, lamps: 1 },
  },
};

// Times of day. Colours are sRGB hex; elev/az in degrees (az 0 = straight out to sea, + to the right).
const sunsetDir = new THREE.Vector3(...RING).sub(new THREE.Vector3(...STOPS.ebb.cam)).normalize();
const PALETTES = {
  afternoon: {
    zenith: '#1d5fd8', horizon: '#ffc98a', glow: '#ffb35c', sunCol: '#fff2d8', elev: 4, az: 16, sunAmt: 1, disc: 1, stars: 0, curve: 8, glowPow: 26,
    ambient: '#7d8fb0', deep: '#073e57', shallow: '#2a9a93', foam: '#ffffff', sandDry: '#ecd3a4', sandWet: '#937659',
    crowd: '#0a0a12', hemiSky: '#a9c8ff', hemiGround: '#cdb089', hemi: 1.6, exposure: 1.0, fog: 0.0021,
  },
  sunset: {
    zenith: '#22306f', horizon: '#ff8240', glow: '#ff7a36', sunCol: '#ffb064', dir: sunsetDir, sunAmt: 0.75, disc: 1, stars: 0,
    ambient: '#5a4a6a', deep: '#141f3a', shallow: '#3b5468', foam: '#ffd8c0', sandDry: '#e6c69e', sandWet: '#7a5f4c',
    crowd: '#0a0a12', hemiSky: '#ff9a6a', hemiGround: '#40303a', hemi: 1.0, exposure: 1.0, fog: 0.0024,
  },
  dusk: {
    zenith: '#0a1236', horizon: '#c9496a', glow: '#e0506a', sunCol: '#000000', elev: -6, az: -8, sunAmt: 0, disc: 0, stars: 0.35,
    ambient: '#262a4a', deep: '#060b1c', shallow: '#18213a', foam: '#9a8aa8', sandDry: '#e0c49a', sandWet: '#6c5648',
    crowd: '#06060c', hemiSky: '#5a4a8a', hemiGround: '#120c14', hemi: 0.7, exposure: 1.15, fog: 0.0027,
  },
  night: {
    zenith: '#020309', horizon: '#0e1838', glow: '#0c1640', sunCol: '#000000', elev: -20, az: 0, sunAmt: 0, disc: 0, stars: 1,
    ambient: '#11152c', deep: '#02040b', shallow: '#0a1222', foam: '#4a5270', sandDry: '#d8bf98', sandWet: '#5e4c42',
    crowd: '#05050a', hemiSky: '#26306a', hemiGround: '#06060a', hemi: 0.45, exposure: 1.3, fog: 0.003,
  },
  dawn: {
    zenith: '#4f72c8', horizon: '#ffb48e', glow: '#ff9c7c', curve: 6, sunCol: '#ffd6b8', elev: -1, az: 105, sunAmt: 0.25, disc: 0, stars: 0.1,
    ambient: '#8a8aac', deep: '#21385e', shallow: '#5b8098', foam: '#fff1f2', sandDry: '#e8cfa6', sandWet: '#8d7262',
    crowd: '#0a0a12', hemiSky: '#cbbbe8', hemiGround: '#6a5a60', hemi: 1.3, exposure: 1.0, fog: 0.0028,
  },
  predawn: {
    zenith: '#03050f', horizon: '#1d2356', glow: '#33357e', sunCol: '#000000', elev: -9, az: 105, sunAmt: 0, disc: 0, stars: 0.6,
    ambient: '#1a1d3a', deep: '#03050d', shallow: '#0d1530', foam: '#5a6088', sandDry: '#d8bf98', sandWet: '#5e4c42',
    crowd: '#05050a', hemiSky: '#2c2f70', hemiGround: '#08080e', hemi: 0.6, exposure: 1.25, fog: 0.003,
  },
};

/* ---------- Shared GLSL: the sand's height, the sky, fog, the Ring's reflection ---------- */
const COMMON = /* glsl */ `
uniform float uTime, uBeat, uBeatAge, uPulse, uTide, uRingGlow, uFogDensity;
uniform vec3 uZenith, uHorizon, uGlow, uSunDir, uSunCol, uRingCol, uRingPos;
uniform float uRingR, uSkyCurve, uGlowPow;
float hash2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}
float sandH(vec2 p) {
  float z = p.y;
  float dune = 7.0 * smoothstep(30.0, 95.0, z) + 1.6 * (vnoise(p * 0.04) - 0.5) * smoothstep(35.0, 70.0, z);
  float flats = 1.0 - smoothstep(-30.0, 20.0, z);
  float bars = 0.45 * sin(z * 0.055 + sin(p.x * 0.012) * 1.6) * flats;
  return 0.0075 * z + dune + bars + 0.25 * sin(p.x * 0.021 + z * 0.013);
}
vec3 skyCol(vec3 d) {
  float e = max(d.y, 0.0);
  vec3 c = mix(uHorizon, uZenith, 1.0 - exp(-e * uSkyCurve));
  float s = max(dot(normalize(vec3(d.x, e, d.z)), uSunDir), 0.0);
  return c + uGlow * (pow(s, uGlowPow) * 0.55 + pow(s, uGlowPow * 9.0) * 0.9);
}
vec3 fogMix(vec3 col, vec3 wp) {
  vec3 d = wp - cameraPosition;
  float f = 1.0 - exp(-length(d) * uFogDensity);
  return mix(col, skyCol(normalize(vec3(d.x, 0.0, d.z) + vec3(0.0, 0.01, 0.0))), f * f);
}
// The Ring mirrored in water or wet sand: follow the reflected ray to the Ring's plane.
vec3 ringRefl(vec3 P, vec3 R) {
  if (R.z > -0.001) return vec3(0.0);
  float s = (uRingPos.z - P.z) / R.z;
  if (s < 0.0) return vec3(0.0);
  vec2 hit = P.xy + R.xy * s;
  float d = abs(length(hit - uRingPos.xy) - uRingR);
  return uRingCol * uRingGlow * (0.6 + uPulse) * (exp(-d * d * 0.8) * 2.4 + exp(-d * 0.3) * 0.3);
}
`;

const FINISH = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

const WORLD_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

function main() {
  const layer = document.querySelector('.scene-layer');
  if (!layer) return;
  // Ask for WebGL2 on a throwaway canvas first, so a browser without it stays quiet and keeps the drawings.
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return;
  const lose = probe.getExtension('WEBGL_lose_context');
  if (lose) lose.loseContext();
  const canvas = document.createElement('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    return; // no WebGL: the drawings stay
  }
  layer.appendChild(canvas);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x07091a, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.003); // for the deck and posts; the shaders fog themselves
  const camera = new THREE.PerspectiveCamera(40, 1, 0.8, 9000);
  const col = (hex) => new THREE.Color(hex);

  /* Shared uniforms: one object per value, referenced by every material. */
  const U = {
    uTime: { value: 0 }, uBeat: { value: BEAT }, uBeatAge: { value: 0.25 }, uPulse: { value: 0.35 },
    uTide: { value: HIGH }, uRingGlow: { value: 0 }, uFogDensity: { value: 0.003 },
    uZenith: { value: col('#000') }, uHorizon: { value: col('#000') }, uGlow: { value: col('#000') },
    uSunDir: { value: new THREE.Vector3(0, 0.2, -1).normalize() }, uSunCol: { value: col('#000') },
    uRingCol: { value: col('#ff4a1c').multiplyScalar(1.6) }, uRingPos: { value: new THREE.Vector3(...RING) },
    uRingR: { value: RING_R }, uSkyCurve: { value: 4.5 }, uGlowPow: { value: 7 },
  };
  const own = {
    deep: { value: col('#000') }, shallow: { value: col('#000') }, foam: { value: col('#fff') },
    sandDry: { value: col('#000') }, sandWet: { value: col('#000') }, ambient: { value: col('#000') },
    sunAmt: { value: 1 }, highMark: { value: HIGH }, crowdCol: { value: col('#000') },
    stars: { value: 0 }, disc: { value: 0 }, beams: { value: 0 }, lamps: { value: 0 }, pointScale: { value: 400 },
    crowd: { value: 0 }, beatPhase: { value: 0.2 },
  };

  /* ---------- Sky ---------- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4500, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: { ...U, uStars: own.stars, uDisc: own.disc },
      vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: COMMON + /* glsl */ `
        uniform float uStars, uDisc;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          vec3 c = skyCol(d);
          c += uSunCol * uDisc * smoothstep(0.99955, 0.99966, dot(d, uSunDir)) * 2.2;
          if (uStars > 0.0) {
            vec3 q = d * 380.0;
            vec3 cell = floor(q);
            float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
            if (h > 0.9955) {
              float star = smoothstep(0.42, 0.0, length(fract(q) - 0.5)) * (0.6 + 0.4 * sin(uTime * 2.1 + h * 311.0));
              c += vec3(0.8, 0.86, 1.0) * star * uStars * smoothstep(0.04, 0.3, d.y) * 1.5;
            }
          }
          gl_FragColor = vec4(c, 1.0);
          ${FINISH}
        }`,
    }),
  );
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  /* ---------- Sand: dunes, a long beach and the flats ---------- */
  const sandGeo = new THREE.PlaneGeometry(1500, 1150, small ? 200 : 300, small ? 150 : 230);
  sandGeo.rotateX(-Math.PI / 2);
  sandGeo.translate(0, 0, -375);
  const sand = new THREE.Mesh(sandGeo, new THREE.ShaderMaterial({
    uniforms: { ...U, uSandDry: own.sandDry, uSandWet: own.sandWet, uAmbient: own.ambient, uSunAmt: own.sunAmt, uHighMark: own.highMark },
    vertexShader: COMMON + /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y = sandH(w.xz);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: COMMON + /* glsl */ `
      uniform vec3 uSandDry, uSandWet, uAmbient;
      uniform float uSunAmt, uHighMark;
      varying vec3 vW;
      void main() {
        vec2 p = vW.xz;
        float H = sandH(p);
        vec3 N = normalize(vec3(H - sandH(p + vec2(0.5, 0.0)), 0.5, H - sandH(p + vec2(0.0, 0.5))));
        vec3 toCam = cameraPosition - vW;
        float dist = length(toCam);
        vec3 V = toCam / dist;
        // ripple marks left by the ebb, parallel to the shore, only near the camera
        float ph = p.y * 6.5 + sin(p.x * 0.8 + p.y * 0.3) * 1.2 + vnoise(p * 0.3) * 5.0;
        float fade = exp(-dist / 40.0) * (1.0 - smoothstep(22.0, 40.0, p.y)) * (1.0 - smoothstep(0.5, 1.6, fwidth(ph)));
        vec3 Nr = normalize(N + vec3(0.0, 0.0, cos(ph) * 0.13 * fade * (0.4 + vnoise(p * 0.12))));
        float grain = vnoise(p * 2.7) * 0.45 + vnoise(p * 0.09) * 0.55;
        float wet = 1.0 - smoothstep(0.0, 0.55, H - uTide);
        float damp = (1.0 - smoothstep(uHighMark - 0.25, uHighMark + 0.25, H)) * 0.55;
        float w = max(wet, damp);
        vec3 base = mix(uSandDry, uSandWet, w) * (0.82 + 0.32 * grain);
        vec3 c = base * (uAmbient + uSunCol * max(dot(Nr, uSunDir), 0.0) * uSunAmt);
        // the Ring lights the sand around it
        vec3 toRing = uRingPos - vW;
        float rd = length(toRing);
        c += base * uRingCol * uRingGlow * (0.55 + uPulse) * 300.0 / (rd * rd + 160.0) * max(dot(Nr, toRing / rd), 0.0);
        // wet sand is a mirror
        vec3 R = reflect(-V, Nr);
        R.y = abs(R.y);
        float fres = 0.05 + 0.95 * pow(1.0 - max(dot(Nr, V), 0.0), 5.0);
        vec3 refl = skyCol(R) + uSunCol * pow(max(dot(R, uSunDir), 0.0), 220.0) * 3.0 * uSunAmt + ringRefl(vW, R);
        c = mix(c, refl, fres * w * 0.88);
        // the kick, a ring of light running out across the wet flats
        float x = length(p - uRingPos.xz) - uBeatAge * 24.0;
        c += uRingCol * w * uRingGlow * exp(-uBeatAge * 1.6) * exp(-x * x * 0.025) * 0.55;
        gl_FragColor = vec4(fogMix(c, vW), 1.0);
        ${FINISH}
      }`,
  }));
  sand.frustumCulled = false;
  scene.add(sand);

  /* ---------- Sea: one plane at the tide's height, coloured by the depth of sand under it ---------- */
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
    uniforms: { ...U, uDeep: own.deep, uShallow: own.shallow, uFoam: own.foam, uSunAmt: own.sunAmt },
    vertexShader: WORLD_VERT,
    fragmentShader: COMMON + /* glsl */ `
      uniform vec3 uDeep, uShallow, uFoam;
      uniform float uSunAmt;
      varying vec3 vW;
      // One travelling wave's slope, faded out where its crests get finer than a pixel or two.
      vec2 wave(vec2 p, vec2 d, float len, float amp) {
        float k = 6.2832 / len;
        float ph = k * dot(d, p) - sqrt(9.8 * k) * uTime;
        return d * (amp * k * cos(ph) * (1.0 - smoothstep(0.5, 1.6, fwidth(ph))));
      }
      void main() {
        float H = sandH(vW.xz);
        float depth = uTide - H;
        vec3 toCam = cameraPosition - vW;
        float dist = length(toCam);
        vec3 V = toCam / dist;
        float near = exp(-dist / 160.0);
        float patchy = 0.45 + 0.9 * vnoise(vW.xz * 0.013 + uTime * 0.03);
        vec2 g = (wave(vW.xz, normalize(vec2(0.12, 1.0)), 13.0, 0.09)
                + wave(vW.xz, normalize(vec2(-0.42, 1.0)), 7.7, 0.06)) * patchy * exp(-dist / 700.0)
               + (wave(vW.xz, normalize(vec2(0.63, 1.0)), 4.3, 0.04)
                + wave(vW.xz, normalize(vec2(-0.9, 0.55)), 2.3, 0.026)
                + wave(vW.xz, normalize(vec2(1.0, 0.3)), 1.3, 0.018)
                + wave(vW.xz, normalize(vec2(-0.2, -1.0)), 0.8, 0.012)) * near;
        if (depth < 0.0) discard;
        // the kick: rings run out from the Ring's piles
        vec2 out2 = vW.xz - uRingPos.xz;
        float r = length(out2);
        for (int i = 0; i < 3; i++) {
          float age = uBeatAge + float(i) * uBeat;
          float x = r - age * 24.0;
          g += (out2 / max(r, 0.001)) * exp(-age * 1.1) * exp(-x * x * 0.02) * 0.32 * sin(x * 0.9) * uRingGlow;
        }
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        R.y = abs(R.y);
        float sd = max(dot(R, uSunDir), 0.0);
        vec3 refl = skyCol(R) + uSunCol * uSunAmt * (pow(sd, 420.0) * 7.0 + pow(sd, 50.0) * 0.45) + ringRefl(vW, R);
        vec3 c = mix(mix(uShallow, uDeep, 1.0 - exp(-depth * 0.7)), refl, fres);
        // the shore: a foam edge and swash rolling in, measured in metres from the waterline
        vec2 grad = vec2(sandH(vW.xz + vec2(0.6, 0.0)) - H, sandH(vW.xz + vec2(0.0, 0.6)) - H) / 0.6;
        float shore = depth / max(length(grad), 0.004);
        float n = vnoise(vW.xz * 0.35 + uTime * 0.15);
        float edge = 1.0 - smoothstep(0.0, 1.0 + 1.6 * n, shore);
        float swash = smoothstep(0.8, 0.98, sin(shore * 0.5 + uTime * 1.3 + n * 2.5)) * (1.0 - smoothstep(3.0, 28.0, shore));
        c = mix(c, uFoam, clamp(edge * 0.85 + swash * 0.6 * (0.45 + n), 0.0, 1.0));
        gl_FragColor = vec4(fogMix(c, vW), mix(0.5, 1.0, smoothstep(0.0, 1.6, depth)));
        ${FINISH}
      }`,
  }));
  sea.rotation.x = -Math.PI / 2;
  sea.renderOrder = 1;
  sea.frustumCulled = false;
  scene.add(sea);

  /* ---------- The Ring, its deck on piles, masts and the sound system ---------- */
  const steel = new THREE.MeshStandardMaterial({ color: '#1d1e27', roughness: 0.55, metalness: 0.35 });
  const ringMat = new THREE.MeshStandardMaterial({ color: '#ff4a1c', emissive: '#ff4a1c', emissiveIntensity: 0, roughness: 0.35, metalness: 0.15 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.6, 18, 180), ringMat);
  ring.position.set(...RING);
  scene.add(ring);
  const parts = [
    [new THREE.BoxGeometry(40, 0.8, 12), [0, 2.0, -70]],
    [new THREE.BoxGeometry(0.7, 14.2, 0.7), [-14.2, 9.5, -70]],
    [new THREE.BoxGeometry(0.7, 14.2, 0.7), [14.2, 9.5, -70]],
    [new THREE.BoxGeometry(3.4, 6.8, 3.2), [-19, 5.8, -68.5]],
    [new THREE.BoxGeometry(3.4, 6.8, 3.2), [19, 5.8, -68.5]],
  ];
  for (const x of [-18, -9, 0, 9, 18]) for (const z of [-74.6, -65.4]) parts.push([new THREE.CylinderGeometry(0.38, 0.38, 7, 10), [x, -1.5, z]]);
  for (const [geo, at] of parts) {
    const mesh = new THREE.Mesh(geo, steel);
    mesh.position.set(...at);
    scene.add(mesh);
  }
  const hemi = new THREE.HemisphereLight('#fff', '#000', 1);
  const sun = new THREE.DirectionalLight('#fff', 1);
  const ringLight = new THREE.PointLight('#ff4a1c', 0, 0, 1.6);
  ringLight.position.set(RING[0], RING[1], RING[2] + 4);
  scene.add(hemi, sun, sun.target, ringLight);

  /* Additive glows (halo, beams, lamps) write display colours straight into the canvas. */
  const glowMat = (uniforms, vertexShader, fragmentShader) => new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });

  const halo = new THREE.Mesh(new THREE.PlaneGeometry(66, 66), glowMat(
    { uRingGlow: U.uRingGlow, uPulse: U.uPulse },
    `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    /* glsl */ `
      uniform float uRingGlow, uPulse;
      varying vec2 vP;
      void main() {
        float r = length(vP);
        float d = abs(r - ${RING_R.toFixed(1)});
        float g = (exp(-d * 0.6) * 0.5 + exp(-d * 0.13) * 0.2) * (1.0 - smoothstep(25.0, 33.0, r));
        gl_FragColor = vec4(vec3(1.0, 0.33, 0.14) * g * uRingGlow * (0.5 + 0.9 * uPulse), 1.0);
      }`,
  ));
  halo.position.set(RING[0], RING[1], RING[2] - 0.8);
  halo.renderOrder = 2;
  scene.add(halo);

  // Beams: open cones from the deck, apex at the origin, opening up the +y axis.
  const BEAM_LEN = 320;
  const beamGeo = new THREE.ConeGeometry(16, BEAM_LEN, 28, 1, true);
  beamGeo.rotateX(Math.PI);
  beamGeo.translate(0, BEAM_LEN / 2, 0);
  const beamMat = glowMat(
    { uBeams: own.beams, uPulse: U.uPulse },
    /* glsl */ `
      varying float vAlong; varying vec3 vW; varying vec3 vN;
      void main() {
        vAlong = position.y / ${BEAM_LEN.toFixed(1)};
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    /* glsl */ `
      uniform float uBeams, uPulse;
      varying float vAlong; varying vec3 vW; varying vec3 vN;
      void main() {
        float facing = pow(abs(dot(normalize(vN), normalize(cameraPosition - vW))), 1.6);
        float a = uBeams * (0.3 + 0.7 * uPulse) * pow(1.0 - vAlong, 1.5) * facing * 0.2;
        gl_FragColor = vec4(vec3(1.0, 0.46, 0.3) * a, 1.0);
      }`,
  );
  beamMat.side = THREE.DoubleSide;
  const beams = [-15, -9, -3, 3, 9, 15].map((x, i) => {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(x, 2.6, -73);
    beam.renderOrder = 3;
    beam.userData.i = i;
    scene.add(beam);
    return beam;
  });

  // The lamp line: posts from the dune gate out to the Ring.
  const sandAt = (x, z) => {
    const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    return 0.0075 * z + 7 * ss(30, 95, z) + 0.45 * Math.sin(z * 0.055 + Math.sin(x * 0.012) * 1.6) * (1 - ss(-30, 20, z)) + 0.25 * Math.sin(x * 0.021 + z * 0.013);
  };
  const LAMPS = 16;
  const lampLine = (t) => [-40 + 22 * t, 42 - 104 * t]; // x, z: dune gate to the deck's front-left corner
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.12, 4.2, 6), steel, LAMPS);
  const lampPos = new Float32Array(LAMPS * 3);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < LAMPS; i++) {
    const [x, z] = lampLine(i / (LAMPS - 1));
    const g = sandAt(x, z);
    posts.setMatrixAt(i, m4.makeTranslation(x, g + 1.1, z));
    lampPos.set([x, g + 3.3, z], i * 3);
  }
  scene.add(posts);
  const lampGeo = new THREE.BufferGeometry();
  lampGeo.setAttribute('position', new THREE.BufferAttribute(lampPos, 3));
  const lamps = new THREE.Points(lampGeo, glowMat(
    { uLamps: own.lamps, uScale: own.pointScale },
    /* glsl */ `
      uniform float uScale;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(2.8 * uScale / -mv.z, 2.0, 64.0);
        gl_Position = projectionMatrix * mv;
      }`,
    /* glsl */ `
      uniform float uLamps;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float g = exp(-d * d * 9.0) * 1.1 + exp(-d * 3.5) * 0.25;
        gl_FragColor = vec4(vec3(1.0, 0.84, 0.62) * g * uLamps, 1.0);
      }`,
  ));
  lamps.renderOrder = 4;
  lamps.frustumCulled = false;
  scene.add(lamps);

  /* ---------- The crowd: it walks out onto the sand as the sea leaves, and jumps on the kick ---------- */
  const PEOPLE = small ? 1100 : 2600;
  let seed = 20270827;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const spot = new Float32Array(PEOPLE * 4);
  const height = new Float32Array(PEOPLE);
  for (let i = 0; i < PEOPLE; i++) {
    const z = -61 + 58 * Math.pow(rand(), 1.25);
    const half = 15 + (z + 61) * 0.6;
    let x = (rand() * 2 - 1) * half;
    if (Math.abs(((x + 40) * 104 + (z - 42) * 22) / 106.3) < 1.8) x += 4; // keep the lamp line clear
    spot.set([x, z, ((z + 61) / 58) * 0.75 + rand() * 0.25, rand()], i * 4);
    height[i] = 0.92 + rand() * 0.22;
  }
  const person = (() => {
    const body = new THREE.CapsuleGeometry(0.2, 0.9, 2, 7).translate(0, 0.65, 0).toNonIndexed();
    const head = new THREE.SphereGeometry(0.12, 8, 6).translate(0, 1.44, 0).toNonIndexed();
    const geo = new THREE.BufferGeometry();
    for (const name of ['position', 'normal']) {
      const a = body.getAttribute(name).array, b = head.getAttribute(name).array;
      const both = new Float32Array(a.length + b.length);
      both.set(a);
      both.set(b, a.length);
      geo.setAttribute(name, new THREE.BufferAttribute(both, 3));
    }
    return geo;
  })();
  const crowdGeo = new THREE.InstancedBufferGeometry().copy(person);
  crowdGeo.instanceCount = PEOPLE;
  crowdGeo.setAttribute('aSpot', new THREE.InstancedBufferAttribute(spot, 4));
  crowdGeo.setAttribute('aHeight', new THREE.InstancedBufferAttribute(height, 1));
  const crowd = new THREE.Mesh(crowdGeo, new THREE.ShaderMaterial({
    uniforms: { ...U, uCrowd: own.crowd, uBeatPhase: own.beatPhase, uCrowdCol: own.crowdCol },
    vertexShader: COMMON + /* glsl */ `
      attribute vec4 aSpot;
      attribute float aHeight;
      uniform float uCrowd, uBeatPhase;
      varying vec3 vW; varying vec3 vN;
      void main() {
        float g = sandH(aSpot.xy);
        vN = normal;
        if (g < uTide + 0.06 || aSpot.z > uCrowd) { vW = vec3(0.0); gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        float ph = fract(uBeatPhase + aSpot.w * 0.12);
        float jumper = smoothstep(0.55, 0.75, aSpot.w);
        float hop = mix(0.05 * sin(6.2832 * ph), 0.34 * sin(3.1416 * ph), jumper);
        vec3 p = position;
        p.y *= aHeight;
        vec3 w = vec3(aSpot.x, g - 0.05 + hop, aSpot.y) + p;
        vW = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: COMMON + /* glsl */ `
      uniform vec3 uCrowdCol;
      varying vec3 vW; varying vec3 vN;
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        vec3 toRing = uRingPos - vW;
        float rd = length(toRing);
        float light = uRingGlow * (0.45 + uPulse) * 260.0 / (rd * rd + 260.0);
        float rim = pow(1.0 - abs(dot(N, V)), 3.0);
        vec3 c = uCrowdCol + uRingCol * light * (max(dot(N, toRing / rd), 0.0) * 0.5 + rim * 0.12);
        gl_FragColor = vec4(fogMix(c, vW), 1.0);
        ${FINISH}
      }`,
  }));
  crowd.frustumCulled = false;
  scene.add(crowd);

  /* ---------- State: every number the story moves, packed so stops can be blended ---------- */
  const sections = Array.from(document.querySelectorAll('[data-stop]')).filter((s) => STOPS[s.dataset.stop]);
  if (!sections.length) return;
  const FIELDS = 64; // 19 numbers, 13 colours, 6 numbers (see packStop)
  const scratch = new THREE.Color();
  const sunDirOf = (p) => p.dir ? p.dir.clone() : new THREE.Vector3(
    Math.sin(THREE.MathUtils.degToRad(p.az)) * Math.cos(THREE.MathUtils.degToRad(p.elev)),
    Math.sin(THREE.MathUtils.degToRad(p.elev)),
    -Math.cos(THREE.MathUtils.degToRad(p.az)) * Math.cos(THREE.MathUtils.degToRad(p.elev)),
  );
  function packStop(section, theme, narrow) {
    const stop = STOPS[section.dataset.stop];
    const mood = stop[theme];
    const p = PALETTES[mood.pal];
    const out = new Float32Array(FIELDS);
    let i = 0;
    const put = (...v) => { out.set(v, i); i += v.length; };
    const putCol = (hex) => { scratch.set(hex); put(scratch.r, scratch.g, scratch.b); };
    const shift = narrow ? stop.narrow : stop.wide;
    put(...stop.cam, ...stop.look, shift[0], shift[1]);                          // 8
    put(LOW + (HIGH - LOW) * Number(section.dataset.tide), stop.crowd, mood.ring, mood.beams, mood.lamps); // 13
    put(p.sunAmt, p.disc, p.stars);                                               // 16
    const dir = sunDirOf(p);
    put(dir.x, dir.y, dir.z);
    for (const key of ['zenith', 'horizon', 'glow', 'sunCol', 'ambient', 'deep', 'shallow', 'foam', 'sandDry', 'sandWet', 'crowd', 'hemiSky', 'hemiGround']) putCol(p[key]);
    put(p.hemi, p.exposure, p.fog, p.curve || 4.5, p.glowPow || 7, 0);
    return out;
  }
  let packed = [];
  let theme = '';
  let narrowness = -1;
  function repack() {
    theme = root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
    const aspect = innerWidth / Math.max(1, innerHeight);
    narrowness = Math.min(1, Math.max(0, (1.15 - aspect) / 0.55));
    packed = sections.map((s) => {
      const wide = packStop(s, theme, false);
      const tall = packStop(s, theme, true);
      return wide.map((v, k) => v + (tall[k] - v) * narrowness);
    });
  }
  repack();

  const storyU = () => (window.lowtide && window.lowtide.storyU ? window.lowtide.storyU() : 0);
  const target = new Float32Array(FIELDS);
  const cur = new Float32Array(FIELDS);
  function aim() {
    const u = Math.min(packed.length - 1, Math.max(0, storyU()));
    const a = Math.floor(u);
    const b = Math.min(packed.length - 1, a + 1);
    const f = u - a;
    for (let k = 0; k < FIELDS; k++) target[k] = packed[a][k] + (packed[b][k] - packed[a][k]) * f;
    return u;
  }

  /* ---------- Applying a state ---------- */
  const look = new THREE.Vector3();
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  const readCol = (c, k) => c.setRGB(cur[k], cur[k + 1], cur[k + 2]);
  function apply() {
    camera.fov = 40 + 18 * narrowness;
    camera.updateProjectionMatrix();
    camera.position.set(cur[0], cur[1], cur[2]);
    look.set(cur[3], cur[4], cur[5]);
    camera.lookAt(look);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.rotateY(Math.atan(cur[6] * tanV * camera.aspect) + lean.x);
    camera.rotateX(Math.atan(-cur[7] * tanV) + lean.y);
    sky.position.copy(camera.position);
    sea.position.set(camera.position.x, cur[8], camera.position.z);

    U.uTide.value = cur[8];
    own.crowd.value = cur[9];
    U.uRingGlow.value = cur[10];
    own.beams.value = cur[11];
    own.lamps.value = cur[12];
    own.sunAmt.value = cur[13];
    own.disc.value = cur[14];
    own.stars.value = cur[15];
    U.uSunDir.value.set(cur[16], cur[17], cur[18]).normalize();
    let k = 19;
    for (const slot of [U.uZenith, U.uHorizon, U.uGlow, U.uSunCol, own.ambient, own.deep, own.shallow, own.foam, own.sandDry, own.sandWet, own.crowdCol]) { readCol(slot.value, k); k += 3; }
    readCol(hemi.color, k); k += 3;
    readCol(hemi.groundColor, k); k += 3;
    hemi.intensity = cur[k];
    renderer.toneMappingExposure = cur[k + 1];
    U.uFogDensity.value = cur[k + 2];
    U.uSkyCurve.value = cur[k + 3];
    U.uGlowPow.value = cur[k + 4];
    scene.fog.color.copy(U.uHorizon.value);
    scene.fog.density = cur[k + 2] * 0.8;

    sun.color.copy(U.uSunCol.value);
    sun.intensity = 2.4 * own.sunAmt.value;
    sun.position.copy(U.uSunDir.value).multiplyScalar(200).add(ring.position);
    sun.target.position.copy(ring.position);
    const pulse = U.uPulse.value;
    ringMat.emissiveIntensity = 0.3 + U.uRingGlow.value * (1.6 + 3.2 * pulse);
    ringLight.intensity = U.uRingGlow.value * (900 + 1600 * pulse);
    halo.visible = U.uRingGlow.value > 0.01;
    beams.forEach((beam) => { beam.visible = own.beams.value > 0.01; });
    lamps.visible = own.lamps.value > 0.01;
  }

  /* ---------- Time: waves and the 124 BPM kick (frozen when paused or under reduced motion) ---------- */
  let t = 3.2;
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  function tick(dt, live) {
    if (live) t += dt;
    const phase = live ? (t / BEAT) % 1 : 0.32;
    U.uTime.value = t;
    U.uBeatAge.value = phase * BEAT;
    U.uPulse.value = live ? Math.exp(-phase * BEAT * 7) : 0.35;
    own.beatPhase.value = phase;
    beams.forEach((beam) => {
      const i = beam.userData.i;
      const side = (i - 2.5) / 2.5;
      const yaw = side * 0.55 + 0.32 * Math.sin(t * 0.37 + i * 1.3);
      const tilt = 0.32 + 0.16 * Math.sin(t * 0.29 + i * 2.1);
      dir.set(Math.sin(tilt) * Math.sin(yaw), Math.cos(tilt), -Math.sin(tilt) * Math.cos(yaw) * 0.6).normalize();
      beam.quaternion.setFromUnitVectors(up, dir);
    });
  }

  /* ---------- Size ---------- */
  function resize() {
    const w = layer.clientWidth || innerWidth;
    const h = layer.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    own.pointScale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad((40 + 18 * narrowness) / 2)));
  }

  /* ---------- The loop: runs while something moves, sleeps otherwise ---------- */
  const paused = () => root.dataset.beat === 'paused';
  const debug = /[?&]debug-scene/.test(location.search);
  let running = false;
  let last = 0;
  let first = true;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    const still = reduce.matches;
    const live = !still && !paused();
    const u = aim();
    let settling = false;
    if (first || still) cur.set(target);
    else {
      const a = 1 - Math.exp(-dt * 7.5);
      for (let k = 0; k < FIELDS; k++) {
        const d = target[k] - cur[k];
        if (Math.abs(d) > 1e-4) settling = true;
        cur[k] += d * a;
      }
    }
    lean.x += (lean.tx - lean.x) * Math.min(1, dt * 4);
    lean.y += (lean.ty - lean.y) * Math.min(1, dt * 4);
    if (Math.abs(lean.tx - lean.x) + Math.abs(lean.ty - lean.y) > 1e-4) settling = true;
    tick(dt, live);
    apply();
    renderer.render(scene, camera);
    if (first) {
      first = false;
      root.classList.add('has-scene');
    }
    if (debug) window.__scene = { u: +u.toFixed(3), tide: +cur[8].toFixed(2), ring: +cur[10].toFixed(2), crowd: +cur[9].toFixed(2), cam: [cur[0], cur[1], cur[2]].map((v) => +v.toFixed(1)), theme };
    running = !document.hidden && (live || settling);
    if (running) requestAnimationFrame(frame);
  }
  function wake() {
    if (running || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  resize();
  addEventListener('resize', () => { repack(); resize(); wake(); });
  addEventListener('scroll', wake, { passive: true });
  document.addEventListener('visibilitychange', wake);
  document.addEventListener('lowtide:beat', wake);
  reduce.addEventListener('change', wake);
  const rethink = () => { repack(); wake(); };
  darkQuery.addEventListener('change', rethink);
  new MutationObserver(rethink).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (finePointer.matches && !reduce.matches) {
    addEventListener('pointermove', (event) => {
      lean.tx = -((event.clientX / innerWidth) * 2 - 1) * 0.03;
      lean.ty = -((event.clientY / innerHeight) * 2 - 1) * 0.018;
      wake();
    }, { passive: true });
  }
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    root.classList.remove('has-scene'); // the drawings come back
  });
  wake();
}

main();
