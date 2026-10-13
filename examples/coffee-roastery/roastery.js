/*
 * Ember & Ash, the signature (MOTION.md): a drum roaster built in code with Three.js, primitives only.
 * One Tuesday batch: green beans tumble behind the porthole, darken step by step, drop into the
 * cooling tray, and at the close the burner is out.
 *
 * How it is driven:
 * - Scene sections carry data-stage (hero, roast, cool, close; "off" fades the scene out) and an
 *   anchor ([data-anchor]) for where the machine goes. The camera's view is shifted and zoomed so the
 *   stage's framing lands in its anchor's box, so the layout decides placement at every size.
 * - In the roast, the active step (.step.is-active, set by site.js) gives the roast level and heat.
 * - Every value eases toward its target with a 0.15 s time constant (settled in about 0.6 s), and
 *   stages blend by weights, so the machine is never left between two framings.
 * - Reduced motion: time stands still, every value snaps, frames are drawn only when scrolling.
 * - Without WebGL2 the drawn stand-ins (.stand-in) stay; .has-scene hides them after the first frame.
 * - Colour written to this transparent canvas is always premultiplied (colour never above alpha).
 */
import * as THREE from './vendor/three.module.min.js';

const root = document.documentElement;
const canvas = document.querySelector('.scene-layer canvas');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const narrow = window.matchMedia('(max-width: 860px)'); // text sits above and below the machine here
const debug = /[?&]debug-scene\b/.test(location.search);

/* ---------- The machine's layout (world units: roughly metres, y up, the drum front facing +z) ---------- */
const DRUM = new THREE.Vector3(0, 1.5, 0);        // drum axis centre; the axis runs along z
const DRUM_R = 0.5;                                // inside radius of the drum
const BEAN_Z = [-0.36, 0.4];                       // where the batch sits along the axis (front is +z)
const TRAY = new THREE.Vector3(0.42, 0.585, 1.36); // cooling tray: centre and floor height
const TRAY_R = 0.62;                               // where beans can lie in the tray
const DOOR_IN = new THREE.Vector3(0, 1.06, 0.34);  // the pour passes the door from inside...
const DOOR_OUT = new THREE.Vector3(0.05, 0.96, 0.74); // ...to just outside it, then down the chute

// Each stage: camera, look target, the world box [w, h] to fit into the anchor, and the machine's state.
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const STAGES = {
  hero: { cam: v3(-3.0, 2.15, 5.7), look: v3(0.24, 1.5, 0.55), frame: [2.7, 3.45], heat: 1, spin: 1, arms: 0, drop: 0, door: 0, roast: 0 },
  roast: { cam: v3(-0.62, 1.7, 3.0), look: v3(0.02, 1.5, 0.56), frame: [1.56, 1.56], heat: 1, spin: 1, arms: 0, drop: 0, door: 0, roast: 0 },
  cool: { cam: v3(-1.25, 3.05, 4.1), look: v3(0.2, 0.86, 1.05), frame: [2.5, 2.05], heat: 0.35, spin: 0.6, arms: 1, drop: 1, door: 1, roast: 1 },
  close: { cam: v3(3.55, 2.2, 5.1), look: v3(0.24, 1.5, 0.5), frame: [2.7, 3.45], heat: 0.08, spin: 0, arms: 0, drop: 1, door: 0, roast: 1 },
};
const STAGE_KEYS = Object.keys(STAGES);

// Bean colour through the roast: green, straw, cinnamon, brown, the colour we drop at (sRGB).
const ROAST_RAMP = [[0, 0x8b9868], [0.3, 0xc4ab6c], [0.55, 0xa3693a], [0.8, 0x6a4024], [1, 0x47291a]];

const THEMES = {
  light: { exposure: 1.0, env: 0.9, hemi: 1.05, sky: 0xfff4ea, ground: 0x8a7a6c, key: 2.5, rim: 0.7, fog: 0xe9e3da, shadow: 0.36, shadowColor: 0x2a1c14, burner: 1.2, drum: 1.6, glow: 0.22, embers: 0 },
  dark: { exposure: 1.08, env: 0.5, hemi: 0.42, sky: 0x6a5446, ground: 0x0f0a08, key: 1.7, rim: 1.5, fog: 0x140f0c, shadow: 0.7, shadowColor: 0x000000, burner: 3.2, drum: 3.4, glow: 0.85, embers: 1 },
};

function start(gl) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  const BEANS = small ? 440 : 760;
  const EMBERS = small ? 90 : 160;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(THEMES.light.fog, 7.5, 18);
  scene.environment = studioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);

  const M = materials();
  const machine = buildRoaster(M);
  scene.add(machine.group);

  /* Lights: a warm key, a cool rim, a soft fill, and the fire (the burner and the drum's heat). */
  const hemi = new THREE.HemisphereLight(0xfff4ea, 0x8a7a6c, 1);
  const key = new THREE.DirectionalLight(0xffe0c2, 2.4);
  key.position.set(-3.2, 5.2, 4.2);
  const rim = new THREE.DirectionalLight(0xaec4ff, 1);
  rim.position.set(3.4, 3.2, -4.4);
  const burnerLight = new THREE.PointLight(0xff6a24, 0, 3.2, 2);
  burnerLight.position.set(-0.34, 0.62, 0.95);
  const drumLight = new THREE.PointLight(0xff7a30, 0, 1.7, 2);
  drumLight.position.set(0.05, 1.66, 0.2);
  scene.add(hemi, key, rim, burnerLight, drumLight);

  /* Floor: a soft contact shadow, and a warm pool of light in front of the burner window. */
  const shadowMat = new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.42, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]), color: 0x000000, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.3), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.3, 0.002, 0.62);
  shadow.renderOrder = -2;
  const glowMat = new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(255,128,52,1)'], [0.5, 'rgba(255,96,32,0.4)'], [1, 'rgba(255,80,20,0)']]), transparent: true, depthWrite: false, premultipliedAlpha: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, opacity: 0 });
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), glowMat);
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(-0.36, 0.004, 1.0);
  floorGlow.renderOrder = -1;
  scene.add(shadow, floorGlow);

  /* The batch: one instanced bean, BEANS times. */
  const beans = new THREE.InstancedMesh(beanGeometry(), M.bean, BEANS);
  beans.frustumCulled = false;
  beans.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(beans);
  const seed = mulberry(41);
  const B = Array.from({ length: BEANS }, () => {
    const depth = seed();
    const s = { depth, period: 0, land: -2.12 - 0.32 * seed(), r: DRUM_R * (0.93 - 0.44 * depth * depth), z: BEAN_Z[1] - (BEAN_Z[1] - BEAN_Z[0]) * Math.pow(seed(), 1.5), phase: seed(), fall: 0.28 + 0.1 * seed(),
      rot: [seed() * 6.28, seed() * 6.28, seed() * 6.28], spin: [(seed() - 0.5) * 7, (seed() - 0.5) * 7, (seed() - 0.5) * 7],
      tr: TRAY_R * Math.sqrt(seed()), ta: seed() * Math.PI * 2, ty: seed(), flip: seed() < 0.5 ? -1 : 1, yaw: seed() * Math.PI * 2,
      delay: 0.56 * seed(), jitter: [(seed() - 0.5) * 0.14, (seed() - 0.5) * 0.06], size: 0.88 + 0.24 * seed(), shade: 0.84 + 0.26 * seed() };
    s.release = -0.75 + 1.55 * (1 - depth) * (0.65 + 0.35 * seed()); // deep beans slide off early, wall beans ride the vanes up
    return s;
  });

  /* Embers in the dark theme, flakes of chaff (ash) in the light one: one small point cloud. */
  const emberGeo = new THREE.BufferGeometry();
  const emberSeeds = new Float32Array(EMBERS * 4);
  for (let i = 0; i < emberSeeds.length; i++) emberSeeds[i] = seed();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EMBERS * 3), 3));
  emberGeo.setAttribute('aSeed', new THREE.BufferAttribute(emberSeeds, 4));
  const emberMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uSpread: { value: new THREE.Vector2(1.6, 1.0) }, uRise: { value: 2.4 }, uSize: { value: 0.012 }, uScale: { value: 400 }, uEmber: { value: 0 }, uAmount: { value: 1 }, uAsh: { value: new THREE.Color(0x4d4540) } },
    vertexShader: `
      attribute vec4 aSeed;
      uniform float uTime, uRise, uSize, uScale;
      uniform vec3 uOrigin;
      uniform vec2 uSpread;
      varying float vLife;
      varying float vSeed;
      void main() {
        float speed = 0.06 + 0.07 * aSeed.w;
        float life = fract(uTime * speed + aSeed.x);
        vec3 p = uOrigin + vec3((aSeed.y - 0.5) * uSpread.x, life * uRise, (aSeed.z - 0.5) * uSpread.y);
        p.x += sin(uTime * 0.6 + aSeed.x * 23.0) * 0.08 * life;
        p.z += cos(uTime * 0.45 + aSeed.y * 19.0) * 0.06 * life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.0, uSize * (0.55 + aSeed.w) * uScale / -mv.z);
        vLife = life;
        vSeed = aSeed.w;
      }`,
    fragmentShader: `
      uniform float uEmber, uAmount;
      uniform vec3 uAsh;
      varying float vLife;
      varying float vSeed;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float fade = smoothstep(0.0, 0.1, vLife) * (1.0 - smoothstep(0.5, 1.0, vLife));
        float glow = smoothstep(0.5, 0.0, d);
        vec3 hot = mix(vec3(1.0, 0.74, 0.38), vec3(0.78, 0.2, 0.05), smoothstep(0.0, 0.75, vLife));
        float lit = glow * glow * fade * (0.55 + 0.45 * vSeed);
        float flake = smoothstep(0.34, 0.2, d) * fade * 0.6;
        float a = mix(flake, lit, uEmber) * uAmount;
        vec3 col = mix(uAsh, hot, uEmber);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const embers = new THREE.Points(emberGeo, emberMat);
  embers.frustumCulled = false;
  scene.add(embers);

  /* ---------- Theme ---------- */
  let theme = THEMES.light;
  function applyTheme() {
    const dark = (root.dataset.theme || (darkQuery.matches ? 'dark' : 'light')) === 'dark';
    theme = dark ? THEMES.dark : THEMES.light;
    renderer.toneMappingExposure = theme.exposure;
    scene.environmentIntensity = theme.env;
    hemi.color.set(theme.sky);
    hemi.groundColor.set(theme.ground);
    hemi.intensity = theme.hemi;
    key.intensity = theme.key;
    rim.intensity = theme.rim;
    scene.fog.color.set(theme.fog);
    shadowMat.opacity = theme.shadow;
    shadowMat.color.set(theme.shadowColor);
    emberMat.uniforms.uEmber.value = theme.embers;
    // Embers are light (additive inside the canvas); ash is ink (normal blending). Both premultiplied.
    emberMat.blendDst = dark ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor;
    emberMat.blendDstAlpha = emberMat.blendDst;
    wake();
  }
  new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);

  /* ---------- Sections, anchors and steps ---------- */
  const sections = Array.from(document.querySelectorAll('[data-stage]')).map((el) => ({ el, stage: el.dataset.stage }));
  const anchors = {};
  STAGE_KEYS.forEach((name) => { anchors[name] = document.querySelector(`[data-anchor="${name}"]`); });
  const firstStep = document.querySelector('.step[data-roast]');

  /* ---------- State, eased ---------- */
  const weights = Object.fromEntries(STAGE_KEYS.map((name) => [name, 0]));
  const now = { opacity: 0, heat: 1, spin: 1, arms: 0, drop: 0, door: 0, roast: 0, leanX: 0, leanY: 0 };
  let stage = 'hero';
  let first = true;
  let time = 2.35; // reduced motion holds this moment: the batch mid-turn, a curtain of beans falling
  let tumble = 0;
  let drumAngle = 0;
  let trayAngle = 0;
  let pointer = { x: 0, y: 0 };
  let vw = 1;
  let vh = 1;
  let lastColourKey = -1;

  /* The pause button: the drum, beans, embers and flames loop, so they can be stopped (and stay stopped). */
  const MOTION_KEY = 'ember-ash-motion';
  const pauseButton = document.querySelector('[data-motion-toggle]');
  let paused = false;
  try { paused = localStorage.getItem(MOTION_KEY) === 'paused'; } catch (error) { /* storage can be blocked */ }
  function syncPause() {
    if (!pauseButton) return;
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? 'Play the roaster' : 'Pause the roaster');
  }
  if (pauseButton) {
    pauseButton.addEventListener('click', () => {
      paused = !paused;
      syncPause();
      try { localStorage.setItem(MOTION_KEY, paused ? 'paused' : 'playing'); } catch (error) { /* this visit only */ }
      wake();
    });
  }
  syncPause();

  function readTargets() {
    const probe = vh * 0.5;
    let section = null;
    for (const s of sections) {
      const r = s.el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { section = s; break; }
    }
    const visible = section && section.stage !== 'off' && STAGES[section.stage] && anchors[section.stage];
    if (visible) stage = section.stage;
    const S = STAGES[stage];
    const t = { opacity: visible ? 1 : 0, heat: S.heat, spin: S.spin, arms: S.arms, drop: S.drop, door: S.door, roast: S.roast };
    if (stage === 'roast') {
      const active = document.querySelector('.step.is-active') || firstStep;
      if (active) { t.roast = Number(active.dataset.roast) || 0; t.heat = Number(active.dataset.heat) || 1; }
    }
    return t;
  }

  // Advance time and ease every value toward its target. Returns true while anything is still moving.
  function step(dt) {
    const target = readTargets();
    const still = reduce.matches;
    const k = still || first ? 1 : 1 - Math.exp(-dt / 0.15);
    const snapStage = still || first || now.opacity < 0.02;
    let moving = false;
    STAGE_KEYS.forEach((name) => {
      const goal = name === stage ? 1 : 0;
      weights[name] = snapStage ? goal : weights[name] + (goal - weights[name]) * k;
      if (Math.abs(weights[name] - goal) < 0.002) weights[name] = goal;
      else moving = true;
    });
    const easeTo = (name, goal, kk) => {
      now[name] += (goal - now[name]) * kk;
      if (Math.abs(now[name] - goal) < 0.002) now[name] = goal;
      else moving = true;
    };
    easeTo('opacity', target.opacity, first ? 0 : k * (still ? 1 : 0.9));
    if (first && target.opacity > 0) moving = true; // fade in once on load
    const kSlow = still || snapStage ? 1 : 1 - Math.exp(-dt / 0.4);
    easeTo('heat', target.heat, snapStage ? 1 : k);
    easeTo('roast', target.roast, snapStage ? 1 : k);
    easeTo('door', target.door, snapStage ? 1 : k);
    easeTo('spin', target.spin, kSlow);
    easeTo('arms', target.arms, kSlow);
    // The pour runs at a steady rate (about 0.8 s), so the batch falls as a stream, not a jump.
    if (snapStage) now.drop = target.drop;
    else if (now.drop !== target.drop) {
      const rate = 1.3 * dt;
      now.drop = target.drop > now.drop ? Math.min(target.drop, now.drop + rate) : Math.max(target.drop, now.drop - rate);
      moving = true;
    }
    const lean = still || !finePointer.matches ? 0 : 1;
    easeTo('leanX', pointer.x * lean, 1 - Math.exp(-dt / 0.35));
    easeTo('leanY', pointer.y * lean, 1 - Math.exp(-dt / 0.35));
    if (!still && !paused) {
      time += dt;
      tumble += dt * now.spin;
      drumAngle += dt * 1.9 * now.spin;
      trayAngle += dt * 0.55 * now.arms;
    }
    first = false;
    return moving;
  }

  /* ---------- Drawing one frame ---------- */
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const buffer = new THREE.Vector2();
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pIn = new THREE.Vector3();
  const pOut = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const colour = new THREE.Color();
  const ramp = ROAST_RAMP.map(([at, hex]) => [at, new THREE.Color(hex)]);

  function placeCamera() {
    cam.set(0, 0, 0);
    look.set(0, 0, 0);
    let fw = 0;
    let fh = 0;
    let cx = 0;
    let cy = 0;
    let bw = 0;
    let bh = 0;
    let sum = 0;
    STAGE_KEYS.forEach((name) => {
      const w = weights[name];
      if (w <= 0 || !anchors[name]) return;
      const S = STAGES[name];
      const r = anchors[name].getBoundingClientRect();
      cam.addScaledVector(S.cam, w);
      look.addScaledVector(S.look, w);
      fw += S.frame[0] * w;
      fh += S.frame[1] * w;
      cx += (r.left + r.width / 2) * w;
      cy += (r.top + r.height / 2) * w;
      bw += r.width * w;
      bh += r.height * w;
      sum += w;
    });
    if (!sum) return null;
    cam.divideScalar(sum);
    look.divideScalar(sum);
    fw /= sum; fh /= sum; cx /= sum; cy /= sum; bw /= sum; bh /= sum;
    // The pointer leans the camera around the machine by a few degrees.
    tmp.copy(cam).sub(look).applyAxisAngle(THREE.Object3D.DEFAULT_UP, now.leanX * 0.07);
    cam.copy(look).add(tmp);
    cam.y += now.leanY * -0.12;
    camera.position.copy(cam);
    camera.lookAt(look);
    const dist = cam.distanceTo(look);
    const span = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.aspect = vw / vh;
    camera.zoom = Math.max(0.05, Math.min((span / fh) * (bh / vh), (span / fw) * (bw / vh)));
    camera.updateProjectionMatrix();
    // Shift the projection so the look target lands on the anchor's centre.
    camera.projectionMatrix.elements[8] = -((cx / vw) * 2 - 1);
    camera.projectionMatrix.elements[9] = -(1 - (cy / vh) * 2);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    return { cx, cy, bw, bh };
  }

  function roastColour(level) {
    for (let i = 1; i < ramp.length; i++) {
      if (level <= ramp[i][0]) {
        const [a0, c0] = ramp[i - 1];
        const [a1, c1] = ramp[i];
        return colour.lerpColors(c0, c1, (level - a0) / (a1 - a0));
      }
    }
    return colour.copy(ramp[ramp.length - 1][1]);
  }

  function drumPoint(b, out, euler) {
    const span = b.release - b.land;
    const carry = span / 1.9;
    const period = carry + b.fall;
    const phase = ((tumble + b.phase * period) % period + period) % period;
    if (phase < carry) {
      const a = b.land + 1.9 * phase;
      out.set(DRUM.x + Math.cos(a) * b.r, DRUM.y + Math.sin(a) * b.r, b.z);
    } else {
      const u = (phase - carry) / b.fall;
      const x0 = Math.cos(b.release) * b.r;
      const y0 = Math.sin(b.release) * b.r;
      const x1 = Math.cos(b.land) * b.r;
      const y1 = Math.sin(b.land) * b.r;
      const g = 6;
      const vy = (y1 - y0 + 0.5 * g * b.fall * b.fall) / b.fall;
      const tt = u * b.fall;
      out.set(DRUM.x + x0 + (x1 - x0) * u, DRUM.y + y0 + vy * tt - 0.5 * g * tt * tt, b.z);
    }
    euler[0] = b.rot[0] + tumble * b.spin[0];
    euler[1] = b.rot[1] + tumble * b.spin[1];
    euler[2] = b.rot[2] + tumble * b.spin[2];
  }

  function trayPoint(b, out, euler) {
    const a = b.ta + trayAngle * (0.55 + 0.45 * (b.tr / TRAY_R));
    out.set(TRAY.x + Math.cos(a) * b.tr, TRAY.y + 0.016 + 0.022 * b.ty, TRAY.z + Math.sin(a) * b.tr);
    euler[0] = b.flip * Math.PI / 2;
    euler[1] = 0;
    euler[2] = b.yaw - a;
  }

  const eA = [0, 0, 0];
  const eB = [0, 0, 0];
  function updateBeans() {
    for (let i = 0; i < BEANS; i++) {
      const b = B[i];
      const local = Math.min(1, Math.max(0, (now.drop - b.delay) / 0.44));
      const e = local * local * (3 - 2 * local);
      if (e < 1) drumPoint(b, pA, eA);
      if (e > 0) trayPoint(b, pB, eB);
      if (e <= 0) {
        dummy.position.copy(pA);
        dummy.rotation.set(eA[0], eA[1], eA[2]);
      } else if (e >= 1) {
        dummy.position.copy(pB);
        dummy.rotation.set(eB[0], eB[1], eB[2]);
      } else {
        // Out through the door, down the chute, into the tray: a cubic curve.
        pIn.set(DOOR_IN.x + b.jitter[0], DOOR_IN.y + b.jitter[1], DOOR_IN.z);
        pOut.set(DOOR_OUT.x + b.jitter[0], DOOR_OUT.y + b.jitter[1], DOOR_OUT.z);
        const u = 1 - e;
        dummy.position.set(0, 0, 0)
          .addScaledVector(pA, u * u * u)
          .addScaledVector(pIn, 3 * u * u * e)
          .addScaledVector(pOut, 3 * u * e * e)
          .addScaledVector(pB, e * e * e);
        dummy.rotation.set(eA[0] + (eB[0] - eA[0]) * e, eA[1] + (eB[1] - eA[1]) * e, eA[2] + (eB[2] - eA[2]) * e);
      }
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      beans.setMatrixAt(i, dummy.matrix);
    }
    beans.instanceMatrix.needsUpdate = true;
    const colourKey = Math.round(now.roast * 400);
    if (colourKey !== lastColourKey) {
      lastColourKey = colourKey;
      const base = roastColour(now.roast).clone();
      for (let i = 0; i < BEANS; i++) beans.setColorAt(i, colour.copy(base).multiplyScalar(B[i].shade));
      beans.instanceColor.needsUpdate = true;
      M.bean.roughness = 0.72 - 0.22 * now.roast;
    }
  }

  // On narrow screens the text sits above and below the machine, so the canvas is faded out
  // beyond its anchor's band: the hopper never slides under a paragraph.
  let maskNow = '';
  function maskTo(placed) {
    let mask = 'none';
    if (narrow.matches && placed) {
      const top = Math.round(placed.cy - placed.bh / 2);
      const bottom = Math.round(placed.cy + placed.bh / 2);
      mask = `linear-gradient(180deg, transparent ${top - 28}px, #000 ${top + 10}px, #000 ${bottom - 10}px, transparent ${bottom + 28}px)`;
    }
    if (mask !== maskNow) {
      maskNow = mask;
      canvas.style.webkitMaskImage = mask;
      canvas.style.maskImage = mask;
    }
  }

  function draw() {
    const placed = placeCamera();
    maskTo(placed);
    canvas.style.opacity = now.opacity.toFixed(3);
    if (debug) window.__scene = { stage, weights: { ...weights }, opacity: +now.opacity.toFixed(3), roast: +now.roast.toFixed(3), heat: +now.heat.toFixed(3), drop: +now.drop.toFixed(3), anchor: placed && { x: Math.round(placed.cx), y: Math.round(placed.cy), w: Math.round(placed.bw), h: Math.round(placed.bh) }, zoom: +camera.zoom.toFixed(3), clock: +time.toFixed(2), paused };
    if (!placed || now.opacity <= 0.001) return false;
    const heat = now.heat;
    machine.drum.rotation.z = drumAngle;
    machine.arms.rotation.y = trayAngle;
    machine.door.rotation.x = 1.15 * now.door;
    machine.needle.rotation.z = 1.9 - 3.3 * (0.2 + 0.8 * now.roast) * (0.35 + 0.65 * heat);
    machine.flames.material.uniforms.uTime.value = time;
    machine.flames.material.uniforms.uHeat.value = heat;
    const flicker = 0.92 + 0.08 * Math.sin(time * 13.7) * Math.sin(time * 7.3);
    burnerLight.intensity = theme.burner * heat * flicker;
    drumLight.intensity = theme.drum * heat * (1 - 0.65 * now.drop);
    M.drumWall.emissiveIntensity = heat * (theme.embers ? 0.5 : 0.28) * (1 - 0.6 * now.drop);
    M.drumBack.emissiveIntensity = M.drumWall.emissiveIntensity * 0.8;
    M.soot.emissiveIntensity = 0.25 + 0.9 * heat;
    glowMat.opacity = theme.glow * heat * flicker;
    updateBeans();
    const u = emberMat.uniforms;
    u.uTime.value = time;
    u.uOrigin.value.set(0.15 + (TRAY.x - 0.15) * now.drop, 0.5 + 0.12 * now.drop, -0.4 + (TRAY.z + 0.4) * now.drop);
    u.uSpread.value.set(1.5 - 0.5 * now.drop, 0.8 + 0.2 * now.drop);
    u.uRise.value = 2.9 - 1.9 * now.drop;
    u.uAmount.value = theme.embers ? 0.3 + 0.7 * heat : 0.22 + 0.2 * Math.max(heat, now.drop);
    u.uScale.value = renderer.getDrawingBufferSize(buffer).y * 0.5 * camera.projectionMatrix.elements[5];
    renderer.render(scene, camera);
    if (!root.classList.contains('has-scene')) root.classList.add('has-scene');
    return true;
  }

  /* ---------- The loop: runs while the scene is on screen; otherwise waits for a scroll ---------- */
  let raf = 0;
  let last = performance.now();
  function frame(t) {
    raf = 0;
    const dt = Math.min(0.1, Math.max(0, (t - last) / 1000));
    last = t;
    const moving = step(dt);
    const drawn = draw();
    const live = drawn && !reduce.matches && !paused;
    if (!document.hidden && (moving || live)) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function resize() {
    vw = canvas.clientWidth || window.innerWidth;
    vh = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(vw, vh, false);
    wake();
  }

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  reduce.addEventListener && reduce.addEventListener('change', wake);
  window.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || reduce.matches) return;
    pointer = { x: (event.clientX / vw) * 2 - 1, y: (event.clientY / vh) * 2 - 1 };
    if (now.opacity > 0.01) wake();
  }, { passive: true });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    root.classList.remove('has-scene');
    cancelAnimationFrame(raf);
    raf = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => { lastColourKey = -1; wake(); });

  applyTheme();
  resize();
}

/* ---------- Materials ---------- */
function materials() {
  return {
    enamel: new THREE.MeshPhysicalMaterial({ color: 0x5f1a12, roughness: 0.36, metalness: 0.08, clearcoat: 0.85, clearcoatRoughness: 0.2 }),
    enamelDouble: new THREE.MeshPhysicalMaterial({ color: 0x5f1a12, roughness: 0.4, metalness: 0.08, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide }),
    iron: new THREE.MeshStandardMaterial({ color: 0x27221f, roughness: 0.5, metalness: 0.55 }),
    iron2: new THREE.MeshStandardMaterial({ color: 0x3b332e, roughness: 0.42, metalness: 0.65 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8974f, roughness: 0.27, metalness: 1 }),
    brassDouble: new THREE.MeshStandardMaterial({ color: 0xc8974f, roughness: 0.3, metalness: 1, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: 0xbdb8b1, roughness: 0.3, metalness: 1, side: THREE.DoubleSide }),
    soot: new THREE.MeshStandardMaterial({ color: 0x0c0908, roughness: 0.95, metalness: 0, emissive: 0x7a1e06, emissiveIntensity: 0.4 }),
    face: new THREE.MeshStandardMaterial({ color: 0xefe5d4, roughness: 0.6, metalness: 0 }),
    needle: new THREE.MeshStandardMaterial({ color: 0xa3281a, roughness: 0.5, metalness: 0.1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.13, depthWrite: false }),
    drumWall: new THREE.MeshStandardMaterial({ color: 0x40362f, roughness: 0.42, metalness: 0.8, side: THREE.BackSide, emissive: 0xff5418, emissiveIntensity: 0 }),
    drumBack: new THREE.MeshStandardMaterial({ color: 0x2c2420, roughness: 0.5, metalness: 0.7, emissive: 0xff5418, emissiveIntensity: 0 }),
    trayFloor: new THREE.MeshStandardMaterial({ map: perforatedTexture(), roughness: 0.5, metalness: 0.75 }),
    bean: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 }),
  };
}

/* ---------- The machine, from primitives ---------- */
function buildRoaster(M) {
  const group = new THREE.Group();
  const add = (geometry, material, x = 0, y = 0, z = 0, parent = group) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const alongZ = (mesh) => { mesh.rotation.x = Math.PI / 2; return mesh; };

  // Plinth, cabinet (the burner housing) and the saddle the drum sits on.
  add(slab(1.32, 0.12, 0.92, 0.04, 0.01), M.iron, 0, 0.06, -0.06);
  add(slab(1.46, 0.78, 1.04, 0.07, 0.025), M.enamel, 0, 0.51, -0.04);
  add(slab(0.94, 0.2, 0.9, 0.05, 0.02), M.enamel, 0, 0.96, -0.05);

  // The burner window: a sooty recess, the flames, a grille and a brass frame.
  add(new THREE.BoxGeometry(0.58, 0.16, 0.04), M.soot, -0.34, 0.6, 0.47);
  const flames = add(new THREE.PlaneGeometry(0.54, 0.13), flameMaterial(), -0.34, 0.59, 0.493);
  for (let i = 0; i < 8; i++) add(new THREE.BoxGeometry(0.01, 0.16, 0.012), M.iron, -0.6 + i * 0.075, 0.6, 0.5);
  for (const dy of [-0.086, 0.086]) add(new THREE.BoxGeometry(0.62, 0.014, 0.02), M.brass, -0.34, 0.6 + dy, 0.5);
  for (const dx of [-0.31, 0.31]) add(new THREE.BoxGeometry(0.014, 0.186, 0.02), M.brass, -0.34 + dx, 0.6, 0.5);

  // Gauge (bean temperature) and the gas valve.
  const gauge = new THREE.Group();
  gauge.position.set(0.44, 0.7, 0.48);
  group.add(gauge);
  add(new THREE.TorusGeometry(0.085, 0.014, 10, 40), M.brass, 0, 0, 0.012, gauge);
  add(new THREE.CircleGeometry(0.082, 40), M.face, 0, 0, 0.008, gauge);
  const needle = new THREE.Group();
  needle.position.z = 0.014;
  gauge.add(needle);
  add(new THREE.BoxGeometry(0.009, 0.066, 0.004), M.needle, 0, 0.028, 0, needle);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 12), M.brass, 0, 0, 0.004, gauge).rotation.x = Math.PI / 2;
  alongZ(add(new THREE.CylinderGeometry(0.042, 0.046, 0.05, 24), M.brass, 0.44, 0.45, 0.505));

  // Drum housing, back plate, and the front plate with its porthole and door.
  alongZ(add(new THREE.CylinderGeometry(0.58, 0.58, 1.0, 64, 1, true), M.enamel, DRUM.x, DRUM.y, 0));
  alongZ(add(new THREE.CylinderGeometry(0.585, 0.585, 0.04, 64), M.iron, DRUM.x, DRUM.y, -0.5));
  add(new THREE.TorusGeometry(0.585, 0.018, 8, 72), M.brass, DRUM.x, DRUM.y, -0.2); // a band round the housing
  add(plateGeometry(), M.iron, DRUM.x, DRUM.y, 0.5);
  add(new THREE.TorusGeometry(0.622, 0.02, 10, 80), M.brass, DRUM.x, DRUM.y, 0.535);
  add(new THREE.TorusGeometry(0.378, 0.03, 14, 72), M.brass, DRUM.x, DRUM.y, 0.565);
  add(new THREE.CircleGeometry(0.37, 56), M.glass, DRUM.x, DRUM.y, 0.536);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 10;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) + Math.PI / 2) < 0.42) continue; // leave room for the door
    alongZ(add(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), M.brass, DRUM.x + Math.cos(a) * 0.5, DRUM.y + Math.sin(a) * 0.5, 0.567));
  }
  add(new THREE.BoxGeometry(0.26, 0.17, 0.1), M.soot, 0, 1.01, 0.46); // the dark throat behind the door

  // The drum itself: it turns, with four vanes that lift the beans.
  const drum = new THREE.Group();
  drum.position.set(DRUM.x, DRUM.y, 0);
  group.add(drum);
  alongZ(add(new THREE.CylinderGeometry(DRUM_R, DRUM_R, 0.92, 56, 1, true), M.drumWall, 0, 0, 0.01, drum));
  add(new THREE.CircleGeometry(DRUM_R, 56), M.drumBack, 0, 0, -0.44, drum);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + 0.3;
    const vane = add(new THREE.BoxGeometry(0.1, 0.022, 0.88), M.iron2, Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.01, drum);
    vane.rotation.z = a;
  }

  // The door, hinged on its lower edge, and the chute that leads to the tray.
  const door = new THREE.Group();
  door.position.set(0, DRUM.y - 0.575, 0.555);
  group.add(door);
  add(slab(0.3, 0.2, 0.035, 0.03, 0.008), M.iron2, 0, 0.1, 0.018, door);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 10), M.brass, 0, 0.12, 0.06, door).rotation.z = Math.PI / 2;
  for (const dx of [-0.065, 0.065]) alongZ(add(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 8), M.brass, dx, 0.12, 0.04, door));
  const chute = new THREE.Group();
  const from = new THREE.Vector3(0.02, 0.9, 0.62);
  const to = new THREE.Vector3(0.26, 0.76, 1.0);
  const length = from.distanceTo(to);
  chute.position.copy(from).lerp(to, 0.5);
  group.add(chute);
  chute.lookAt(to);
  add(new THREE.BoxGeometry(0.28, 0.014, length), M.iron2, 0, 0, 0, chute);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.014, 0.08, length), M.iron2, sx * 0.14, 0.04, 0, chute);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.012, length), M.brass, sx * 0.14, 0.085, 0, chute);

  // The trier (the sampler a roaster pulls to check the colour).
  alongZ(add(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 16), M.brass, 0.43, 1.79, 0.6));
  add(new THREE.SphereGeometry(0.045, 20, 14), M.iron2, 0.43, 1.79, 0.69);

  // The hopper on top, with its slide gate.
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.17, 24), M.brass, 0, 2.12, -0.06);
  add(new THREE.LatheGeometry([new THREE.Vector2(0.07, 0), new THREE.Vector2(0.08, 0.03), new THREE.Vector2(0.36, 0.42), new THREE.Vector2(0.39, 0.44), new THREE.Vector2(0.39, 0.48), new THREE.Vector2(0.37, 0.48)], 56), M.brassDouble, 0, 2.19, -0.06);
  add(new THREE.BoxGeometry(0.3, 0.022, 0.05), M.brass, 0.17, 2.15, -0.06);
  add(new THREE.SphereGeometry(0.034, 16, 12), M.iron2, 0.33, 2.15, -0.06);

  // The chaff collector (a cyclone) and the exhaust, behind on the right.
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 20), M.iron, 0.76, 1.78, -0.3).rotation.z = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.19, 0.19, 0.46, 40), M.enamel, 1.1, 1.66, -0.3);
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 40), M.iron, 1.1, 1.905, -0.3);
  add(new THREE.LatheGeometry([new THREE.Vector2(0.055, -0.32), new THREE.Vector2(0.19, 0)], 40), M.enamelDouble, 1.1, 1.43, -0.3);
  add(new THREE.BoxGeometry(0.16, 0.1, 0.16), M.iron2, 1.1, 1.06, -0.3);
  add(new THREE.CylinderGeometry(0.028, 0.028, 1.0, 12), M.iron, 1.1, 0.5, -0.3);
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24), M.iron, 1.1, 0.01, -0.3);
  add(new THREE.CylinderGeometry(0.065, 0.065, 1.16, 24), M.iron, 1.1, 2.5, -0.3);
  add(new THREE.CylinderGeometry(0.11, 0.075, 0.06, 24), M.iron, 1.1, 3.1, -0.3);

  // The cooling tray: a perforated floor, a steel wall, and arms that sweep the batch.
  const tray = new THREE.Group();
  tray.position.set(TRAY.x, 0, TRAY.z);
  group.add(tray);
  add(new THREE.CylinderGeometry(0.3, 0.38, 0.52, 40), M.iron, 0, 0.26, 0, tray);
  add(new THREE.CylinderGeometry(0.66, 0.6, 0.07, 64), M.iron, 0, TRAY.y - 0.04, 0, tray); // the fan plenum under the floor
  const floor = add(new THREE.CircleGeometry(0.7, 72), M.trayFloor, 0, TRAY.y, 0, tray);
  floor.rotation.x = -Math.PI / 2;
  add(new THREE.CylinderGeometry(0.7, 0.7, 0.15, 80, 1, true), M.steel, 0, TRAY.y + 0.07, 0, tray);
  add(new THREE.TorusGeometry(0.7, 0.017, 8, 88), M.steel, 0, TRAY.y + 0.145, 0, tray).rotation.x = Math.PI / 2;
  add(new THREE.TorusGeometry(0.7, 0.02, 8, 88), M.iron2, 0, TRAY.y, 0, tray).rotation.x = Math.PI / 2;
  const arms = new THREE.Group();
  tray.add(arms);
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 20), M.iron, 0, TRAY.y + 0.1, 0, arms);
  add(new THREE.SphereGeometry(0.052, 20, 14), M.brass, 0, TRAY.y + 0.2, 0, arms);
  for (let k = 0; k < 4; k++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = k * Math.PI / 2;
    arms.add(pivot);
    add(new THREE.BoxGeometry(0.6, 0.024, 0.024), M.iron2, 0.33, TRAY.y + 0.11, 0, pivot);
    for (const x of [0.2, 0.38, 0.56]) {
      const paddle = add(new THREE.BoxGeometry(0.012, 0.08, 0.075), M.steel, x, TRAY.y + 0.065, 0, pivot);
      paddle.rotation.y = 0.6;
    }
  }

  return { group, drum, door, arms, needle, flames };
}

/* ---------- Geometry helpers ---------- */
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// A box with rounded corners and bevelled edges, centred on the origin.
function slab(w, h, d, r, bevel) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, Math.max(0.002, r - bevel)), {
    depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6,
  });
  geometry.translate(0, 0, -(d - bevel * 2) / 2);
  return geometry;
}

// The drum's front plate: a disc with the porthole and the door cut out.
function plateGeometry() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.62, 0, Math.PI * 2, false);
  const port = new THREE.Path();
  port.absarc(0, 0, 0.37, 0, Math.PI * 2, true);
  s.holes.push(port);
  const door = new THREE.Path();
  door.moveTo(-0.13, -0.57);
  door.lineTo(-0.13, -0.41);
  door.lineTo(0.13, -0.41);
  door.lineTo(0.13, -0.57);
  door.lineTo(-0.13, -0.57);
  s.holes.push(door);
  return new THREE.ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 72 });
}

// One coffee bean: an ellipsoid, rounded on its back, flat on its face, with the crease down the middle.
function beanGeometry() {
  const geometry = new THREE.SphereGeometry(1, 20, 14);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    let Z = z > 0 ? z * 0.0175 : z * 0.0075;
    if (z < 0) {
      const crease = Math.exp(-Math.pow((y - 0.14 * Math.sin(x * 2.6)) / 0.17, 2));
      Z += 0.0078 * crease * Math.sqrt(Math.max(0, 1 - x * x));
    }
    p.setXYZ(i, x * 0.032, y * 0.0235, Z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/* ---------- Textures and the studio light the metal reflects ---------- */
function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gradient = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([at, css]) => gradient.addColorStop(at, css));
  g.fillStyle = gradient;
  g.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function perforatedTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4f4944';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#17120f';
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      g.beginPath();
      g.arc(8 + i * 16, 8 + j * 16, 3.4, 0, Math.PI * 2);
      g.fill();
    }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.anisotropy = 4;
  return texture;
}

function studioEnvironment(renderer) {
  const room = new THREE.Scene();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 14), new THREE.MeshBasicMaterial({ color: 0x2e2825, side: THREE.BackSide }));
  shell.position.y = 3.5;
  room.add(shell);
  const panel = (w, h, hex, strength, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(strength), side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 1.4, 0);
    room.add(mesh);
  };
  panel(6, 3.5, 0xfff3e6, 5.5, -3.5, 6.5, 4); // a softbox above, front left
  panel(1.4, 6, 0xffc69a, 2.4, 6.5, 3, 0.5); // a warm strip to the right
  panel(5, 3, 0xa9bad6, 1.2, -4.5, 3, -6); // a cool bounce behind
  panel(8, 8, 0x8a7d72, 0.6, 0, -0.9, 0); // the floor
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  return env;
}

// The burner seen through its window: a row of gas jets, blue at the root, orange as the heat rises.
function flameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 1 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform float uHeat;
      varying vec2 vUv;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        float x = vUv.x * 11.0;
        float cell = floor(x);
        float fx = fract(x) - 0.5;
        float flick = 0.8 + 0.2 * sin(uTime * (9.0 + hash(cell) * 6.0) + cell * 2.7);
        float h = mix(0.2, 0.92, uHeat) * flick;
        float y = vUv.y / max(h, 0.001);
        float w = 0.42 * (1.0 - y) * (0.6 + 0.4 * smoothstep(0.0, 0.25, y));
        float flame = smoothstep(w, w * 0.35, abs(fx)) * step(y, 1.0);
        vec3 root = vec3(0.24, 0.42, 1.0);
        vec3 tip = vec3(1.0, 0.52, 0.16);
        vec3 col = mix(root, tip, smoothstep(0.15, 0.7, y) * smoothstep(0.05, 0.4, uHeat));
        float a = clamp(flame * mix(0.5, 1.0, uHeat), 0.0, 1.0);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  });
}

// A small seeded random generator, so every visitor sees the same batch.
function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Boot (last, so every table above is initialised) ---------- */
const context = canvas ? canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }) : null;
if (!context) {
  root.classList.add('no-webgl');
} else {
  try {
    start(context);
  } catch (error) {
    root.classList.remove('has-scene');
    root.classList.add('no-webgl');
    console.warn('Ember & Ash: the 3D roaster could not start, so the drawings stay.', error);
  }
}
