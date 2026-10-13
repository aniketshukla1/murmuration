/*
 * Atelier Brenner's signature (MOTION.md): a timber house built in code with Three.js,
 * raised as you read. Each [data-stage] section names a stage: how far the build has got,
 * the light of the day and a framed view. Scroll picks the stage under the middle of the
 * screen; a critically damped spring carries everything there in about 0.6 s, then the
 * loop stops and nothing renders until something changes. The camera never tilts:
 * verticals stay vertical and the framing comes from lens shift, as in architectural
 * photography. Without WebGL nothing loads and the drawn stand-ins in index.html stay.
 */

const root = document.documentElement;
const layer = document.querySelector('.scene-layer');
const canvas = document.createElement('canvas');
const gl = layer && canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
if (gl) start().catch((error) => console.warn('frame.js: the scene could not start, so the drawn stand-ins stay.', error));

/* ---------- The house, in metres (the stand-ins in index.html use the same numbers) ---------- */
const FL = 0.65;                 // floor level: top of the sills
const EH = FL + 3.0;             // top of the posts
const TIE_TOP = EH + 0.24;
const HALF = 3.2;                // posts stand at z = ±HALF
const PITCH = (38 * Math.PI) / 180;
const TAN = Math.tan(PITCH);
const COS = Math.cos(PITCH);
const SIN = Math.sin(PITCH);
const RAF_H = 0.22;
const yb = (z) => TIE_TOP + (HALF - Math.abs(z)) * TAN; // rafter underside
const yt = (z) => yb(z) + RAF_H / COS;                    // rafter top
const yu = (z) => yt(z) + 0.16 / COS;                     // roof deck underside, on the purlins
const BENTS = [-6, -3, 0, 3, 6];
const D2R = Math.PI / 180;

/* ---------- Stages, one per section ----------
 * build: 0 plinth and bents lying on the deck · 1 bents raised · 2 purlins, ridge and the
 * Richtfest tree · 3 floor, walls and roof · 4 battens and glass.
 * radius: how much of the house the view must hold, in metres. On a wide screen the copy
 * is always on the left and the house in the right-hand window, so text and house never
 * meet as one section hands over to the next. */
const STAGES = [
  { build: 1, lamp: 0, time: 'dawn', az: -34, el: 5, target: [0, 3.3, 0], radius: 7.4, fov: 30 },
  { build: 2, lamp: 0, time: 'morning', az: -84, el: 3, target: [-6, 3.5, 0], radius: 4.3, fov: 42 },
  { build: 3, lamp: 0, time: 'noon', az: 38, el: 14, target: [0, 3.3, 0], radius: 8.4, fov: 30 },
  { build: 4, lamp: 0, time: 'afternoon', az: 146, el: 16, target: [0, 3.2, 0], radius: 8.6, fov: 30 },
  { build: 4, lamp: 0.55, time: 'sunset', az: 0, el: 2, target: [0, 3.4, 0], radius: 7.6, fov: 20, caption: true },
  { build: 4, lamp: 1, time: 'night', az: -26, el: 7, target: [0, 3.2, 0], radius: 9.2, fov: 30 },
  { build: 4, lamp: 1, time: 'night', az: 64, el: 4, target: [2.0, 3.0, 0], radius: 7.4, fov: 34 },
  { build: 4, lamp: 1, time: 'night', az: -34, el: 5, target: [0, 3.3, 0], radius: 8.0, fov: 30 },
];

/* The light of the day (light theme). The dark theme dims the day times (DARK_DAY). */
const TIMES = {
  dawn: { sunAz: 18, sunEl: 20, sun: '#ffbf86', sunI: 3.6, sky: '#c7d0dc', ground: '#6e6556', hemiI: 0.55, env: 0.28, exposure: 1.0 },
  morning: { sunAz: -125, sunEl: 34, sun: '#ffdcb2', sunI: 3.6, sky: '#d3dce6', ground: '#756a5a', hemiI: 0.6, env: 0.35, exposure: 1.0 },
  noon: { sunAz: 14, sunEl: 50, sun: '#fff1df', sunI: 3.4, sky: '#d6dee6', ground: '#7a705f', hemiI: 0.65, env: 0.4, exposure: 1.0 },
  afternoon: { sunAz: 74, sunEl: 26, sun: '#ffd09a', sunI: 3.4, sky: '#d0d4dc', ground: '#76695a', hemiI: 0.6, env: 0.35, exposure: 1.0 },
  sunset: { sunAz: 96, sunEl: 4, sun: '#ff8d50', sunI: 2.6, sky: '#b58c88', ground: '#3b2e2b', hemiI: 0.5, env: 0.2, exposure: 1.05 },
  night: { sunAz: -128, sunEl: 34, sun: '#9db0e6', sunI: 0.42, sky: '#2c3350', ground: '#0c0c11', hemiI: 0.22, env: 0.05, exposure: 1.1 },
};
const DAY = new Set(['dawn', 'morning', 'noon', 'afternoon']);
const DARK_DAY = { sunI: 0.8, hemiI: 0.5, env: 0.55 };

/* State: every animated number, eased by one spring each */
const KEYS = ['build', 'lamp', 'tx', 'ty', 'tz', 'az', 'el', 'dist', 'fov', 'sx', 'sy', 'sunAz', 'sunEl', 'sunR', 'sunG', 'sunB', 'sunI', 'skyR', 'skyG', 'skyB', 'gndR', 'gndG', 'gndB', 'hemiI', 'env', 'exposure', 'fogR', 'fogG', 'fogB', 'leanX', 'leanY'];
const K = Object.fromEntries(KEYS.map((key, i) => [key, i]));
const cur = new Float64Array(KEYS.length);
const vel = new Float64Array(KEYS.length);
const goal = new Float64Array(KEYS.length);

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t) => t * t * (3 - 2 * t);
const phase = (b, from, span) => ease(clamp01((b - from) / span));

async function start() {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && darkQuery.matches);
  const narrow = () => window.innerWidth <= 860;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.fog = new THREE.Fog(0xffffff, 30, 90);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 220);

  /* ---------- Materials: wood with a grain, concrete, zinc, a dark membrane, glass ---------- */
  const grain = woodTexture(THREE);
  const spruce = new THREE.MeshStandardMaterial({ color: '#e6cfa6', map: grain, roughness: 0.74 });
  const larch = new THREE.MeshStandardMaterial({ color: '#cf9d6c', map: grain, roughness: 0.8 });
  const concrete = new THREE.MeshStandardMaterial({ color: '#bdb8ae', roughness: 0.95 });
  const zinc = new THREE.MeshStandardMaterial({ color: '#56595c', roughness: 0.46, metalness: 0.35 });
  const membrane = new THREE.MeshStandardMaterial({ color: '#7a5d43', roughness: 0.95 }); // wood-fibre board on the wall panels
  const battenMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.84 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1a2125', roughness: 0.07, metalness: 0.0, envMapIntensity: 1.4, emissive: '#ffae62', emissiveIntensity: 0 });
  const needles = new THREE.MeshStandardMaterial({ color: '#3d4a3b', roughness: 0.92, flatShading: true });
  const bark = new THREE.MeshStandardMaterial({ color: '#4a3a2e', roughness: 1 });

  const house = new THREE.Group();
  scene.add(house);
  const shadowed = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };

  /* A timber member from a to b: a box whose length runs along its grain */
  const UP = new THREE.Vector3(0, 1, 0);
  const geometries = new Map();
  function beamGeometry(len, h, w) {
    const key = `${len.toFixed(3)}|${h}|${w}`;
    if (geometries.has(key)) return geometries.get(key);
    const geometry = new THREE.BoxGeometry(len, h, w);
    const uv = geometry.attributes.uv;
    for (let i = 8; i < 24; i++) uv.setX(i, uv.getX(i) * (len / 2.4)); // the long faces: grain at a steady scale
    geometries.set(key, geometry);
    return geometry;
  }
  function member(a, b, w, h, material = spruce) {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const X = B.clone().sub(A).normalize();
    const side = new THREE.Vector3().crossVectors(X, UP);
    if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
    side.normalize();
    const Y = new THREE.Vector3().crossVectors(side, X).normalize();
    const Z = new THREE.Vector3().crossVectors(X, Y);
    const mesh = shadowed(new THREE.Mesh(beamGeometry(A.distanceTo(B), h, w), material));
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    mesh.position.copy(A).add(B).multiplyScalar(0.5);
    return mesh;
  }

  /* ---------- Plinth and sills: always there ---------- */
  const plinth = shadowed(new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.45, 7.4), concrete));
  plinth.position.y = 0.225;
  house.add(plinth);
  house.add(member([-6.2, 0.55, -HALF], [6.2, 0.55, -HALF], 0.2, 0.2));
  house.add(member([-6.2, 0.55, HALF], [6.2, 0.55, HALF], 0.2, 0.2));
  house.add(member([-6, 0.55, -3.1], [-6, 0.55, 3.1], 0.2, 0.2));
  house.add(member([6, 0.55, -3.1], [6, 0.55, 3.1], 0.2, 0.2));

  /* ---------- The five bents, each raised about the feet of its posts ---------- */
  const c = RAF_H / 2 / COS;
  const bents = BENTS.map((x) => {
    const bent = new THREE.Group();
    bent.position.set(x, FL, 0);
    const y = (v) => v - FL;
    for (const s of [-1, 1]) {
      bent.add(member([0, 0, s * HALF], [0, 3.0, s * HALF], 0.2, 0.2));
      bent.add(member([0, y(yb(3.75) + c), s * 3.75], [0, y(yb(0) + c), 0], 0.12, RAF_H));
      bent.add(member([0, y(EH - 0.9), s * HALF], [0, y(EH), s * 2.3], 0.1, 0.12));
    }
    bent.add(member([0, 3.12, -3.45], [0, 3.12, 3.45], 0.16, 0.24));
    bent.add(member([0, y(5.1), -1.6], [0, y(5.1), 1.6], 0.1, 0.18));
    house.add(bent);
    return bent;
  });

  /* ---------- Purlins and the ridge: dropped in, the ridge last ---------- */
  const drops = [];
  const drop = (mesh, from) => { drops.push({ mesh, from, y: mesh.position.y }); house.add(mesh); };
  for (const [z, from] of [[3.05, 1.0], [-3.05, 1.06], [1.65, 1.14], [-1.65, 1.2]]) {
    const s = Math.sign(z);
    const n = new THREE.Vector3(0, COS, s * SIN);
    const p = new THREE.Vector3(0, yt(z), z).addScaledVector(n, 0.08);
    const purlin = shadowed(new THREE.Mesh(beamGeometry(13.1, 0.16, 0.14), spruce));
    purlin.position.copy(p);
    purlin.rotation.x = s * PITCH;
    drop(purlin, from);
  }
  const ridge = shadowed(new THREE.Mesh(beamGeometry(13.1, 0.26, 0.16), spruce));
  ridge.position.set(0, yt(0) - 0.13, 0);
  drop(ridge, 1.28);

  /* ---------- The Richtfest tree, tied to the ridge for the topping-out ---------- */
  const richtbaum = new THREE.Group();
  richtbaum.position.set(-6.45, yt(0) - 0.05, 0);
  const smallCone = new THREE.ConeGeometry(0.36, 0.8, 7);
  const tip = shadowed(new THREE.Mesh(smallCone, needles));
  tip.position.y = 0.95;
  const low = shadowed(new THREE.Mesh(smallCone, needles));
  low.position.y = 0.62;
  low.scale.setScalar(1.25);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6), bark);
  stem.position.y = 0.2;
  richtbaum.add(stem, low, tip);
  ['#c0392b', '#2f5d9a', '#efe6d2'].forEach((color, i) => {
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.75, 0.006), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
    ribbon.position.set(0, 0.95, 0);
    ribbon.rotation.set(0, (i * 2 * Math.PI) / 3, 0.5);
    ribbon.translateY(-0.38);
    richtbaum.add(ribbon);
  });
  house.add(richtbaum);

  /* ---------- Closing in: the floor, four wall panels stood up, the roof lowered on ---------- */
  const floor = shadowed(new THREE.Mesh(beamGeometry(12.2, 0.1, 6.2), spruce));
  floor.position.set(0, FL + 0.05, 0);
  house.add(floor);

  const walls = [];
  const wallH = TIE_TOP - 0.5;
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.5, s * 3.33);
    const panel = shadowed(new THREE.Mesh(new THREE.BoxGeometry(12.2, wallH, 0.06), membrane));
    panel.position.y = wallH / 2;
    pivot.add(panel);
    house.add(pivot);
    walls.push({ pivot, axis: 'x', flat: s * 80 * D2R, from: s > 0 ? 2.12 : 2.22 });
  }
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-3.36, 0);
  gableShape.lineTo(3.36, 0);
  gableShape.lineTo(3.36, yt(3.36) - 0.5);
  gableShape.lineTo(0, yt(0) - 0.5);
  gableShape.lineTo(-3.36, yt(3.36) - 0.5);
  gableShape.closePath();
  const gableGeometry = new THREE.ExtrudeGeometry(gableShape, { depth: 0.06, bevelEnabled: false });
  for (const s of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 6.13, 0.5, 0);
    const panel = shadowed(new THREE.Mesh(gableGeometry, membrane));
    panel.rotation.y = -Math.PI / 2;
    panel.position.x = 0.03;
    pivot.add(panel);
    house.add(pivot);
    walls.push({ pivot, axis: 'z', flat: -s * 80 * D2R, from: s > 0 ? 2.3 : 2.36 });
  }

  const roofs = [];
  const slope = 3.95 / COS;
  for (const s of [1, -1]) {
    const side = new THREE.Group();
    const n = new THREE.Vector3(0, COS, s * SIN);
    const zc = s * 1.975;
    const base = new THREE.Vector3(0, yu(zc), zc);
    const deck = shadowed(new THREE.Mesh(beamGeometry(13.3, 0.06, slope), larch));
    deck.position.copy(base).addScaledVector(n, 0.03);
    deck.rotation.x = s * PITCH;
    const skin = shadowed(new THREE.Mesh(new THREE.BoxGeometry(13.3, 0.03, slope), zinc));
    skin.position.copy(base).addScaledVector(n, 0.075);
    skin.rotation.x = s * PITCH;
    const seams = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 0.045, slope), zinc, 27);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s * PITCH);
    for (let i = 0; i < 27; i++) {
      const p = base.clone().addScaledVector(n, 0.11);
      p.x = -6.5 + i * 0.5;
      seams.setMatrixAt(i, m.compose(p, q, new THREE.Vector3(1, 1, 1)));
    }
    seams.castShadow = true;
    side.add(deck, skin, seams);
    house.add(side);
    roofs.push({ group: side, from: s > 0 ? 2.52 : 2.6 });
  }

  /* ---------- Openings: glass in a larch reveal ---------- */
  const openings = [
    // wall: 'front' (+z), 'back' (-z), 'east' (+x), 'west' (-x); a..b along the wall, y0..y1 high
    { wall: 'front', a: -1.2, b: 2.1, y0: FL + 0.02, y1: FL + 2.7 },
    { wall: 'front', a: -4.55, b: -3.85, y0: FL + 0.45, y1: FL + 2.7 },
    { wall: 'front', a: 3.85, b: 4.55, y0: FL + 0.45, y1: FL + 2.7 },
    { wall: 'back', a: -4.4, b: -3.4, y0: FL + 0.9, y1: FL + 2.4 },
    { wall: 'back', a: 1.2, b: 2.6, y0: FL + 0.9, y1: FL + 2.4 },
    { wall: 'east', a: -0.5, b: 0.5, y0: FL + 0.02, y1: FL + 2.3 },
    { wall: 'east', a: -0.55, b: 0.55, y0: EH + 0.55, y1: EH + 1.75 },
    { wall: 'west', a: -0.35, b: 0.35, y0: FL + 0.35, y1: 5.6 },
  ];
  const WALLS = {
    front: { n: [0, 0, 1], at: 3.375 },
    back: { n: [0, 0, -1], at: -3.375 },
    east: { n: [1, 0, 0], at: 6.175 },
    west: { n: [-1, 0, 0], at: -6.175 },
  };
  const panes = openings.map((o, i) => {
    const wall = WALLS[o.wall];
    const along = (o.a + o.b) / 2;
    const w = o.b - o.a;
    const h = o.y1 - o.y0;
    const unit = new THREE.Group();
    const frame = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.05), larch));
    frame.position.z = -0.02;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), glass);
    unit.add(frame, pane);
    const normal = new THREE.Vector3(...wall.n);
    const pos = normal.x !== 0 ? new THREE.Vector3(wall.at, (o.y0 + o.y1) / 2, along) : new THREE.Vector3(along, (o.y0 + o.y1) / 2, wall.at);
    unit.position.copy(pos);
    unit.lookAt(pos.clone().add(normal)); // face outward, from where it stands
    house.add(unit);
    return { unit, pos, normal, from: 3.55 + i * 0.03 };
  });

  /* ---------- Larch battens, run up the walls around the house ---------- */
  const battens = [];
  const addRun = (wallName, fixed, from, to, top) => {
    const wall = WALLS[wallName];
    const steps = Math.round(Math.abs(to - from) / 0.1);
    for (let k = 0; k <= steps; k++) {
      const t = from + ((to - from) * k) / steps;
      const y1 = top(t);
      let spans = [[0.52, y1]];
      for (const o of openings) {
        if (o.wall !== wallName || t < o.a - 0.08 || t > o.b + 0.08) continue;
        spans = spans.flatMap(([s0, s1]) => [[s0, Math.min(s1, o.y0 - 0.08)], [Math.max(s0, o.y1 + 0.08), s1]]).filter(([s0, s1]) => s1 - s0 > 0.05);
      }
      for (const [y0, y1s] of spans) {
        battens.push(wall.n[0] !== 0 ? { x: fixed, z: t, y0, h: y1s - y0, sx: 0.04, sz: 0.045 } : { x: t, z: fixed, y0, h: y1s - y0, sx: 0.045, sz: 0.04 });
      }
    }
  };
  const eave = () => yu(3.38) - 0.02;
  addRun('front', 3.38, -6.1, 6.1, eave);
  addRun('east', 6.18, 3.38, -3.38, (z) => yu(z) - 0.02);
  addRun('back', -3.38, 6.1, -6.1, eave);
  addRun('west', -6.18, -3.38, 3.38, (z) => yu(z) - 0.02);
  const battenMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), battenMat, battens.length);
  battenMesh.castShadow = true;
  battenMesh.receiveShadow = true;
  battenMesh.frustumCulled = false;
  const tone = new THREE.Color();
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  battens.forEach((bt, i) => {
    bt.order = i / battens.length;
    battenMesh.setColorAt(i, tone.set('#c8935f').offsetHSL((rand() - 0.5) * 0.02, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.08));
  });
  house.add(battenMesh);
  const bm = new THREE.Matrix4();
  let lastBattens = -1;
  function updateBattens(b) {
    const pb = clamp01((b - 3.0) / 0.75);
    if (pb === lastBattens) return;
    lastBattens = pb;
    battens.forEach((bt, i) => {
      const p = Math.max(1e-4, ease(clamp01((pb - bt.order * 0.6) / 0.4)));
      bm.makeScale(bt.sx, bt.h * p, bt.sz);
      bm.setPosition(bt.x, bt.y0 + (bt.h * p) / 2, bt.z);
      battenMesh.setMatrixAt(i, bm);
    });
    battenMesh.instanceMatrix.needsUpdate = true;
  }

  /* ---------- The site: a meadow that fades into the page, a contact shadow, lamplight on the grass ---------- */
  const fade = radialTexture(THREE, [[0, 1], [0.5, 1], [1, 0]]);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 72), new THREE.MeshStandardMaterial({ color: '#d6cfbf', roughness: 1, alphaMap: fade, transparent: true, premultipliedAlpha: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.renderOrder = -2;
  scene.add(ground);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(16, 10.5), new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: radialTexture(THREE, [[0, 1], [0.55, 0.55], [1, 0]]), transparent: true, opacity: 0.32, premultipliedAlpha: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.006;
  contact.renderOrder = -1;
  scene.add(contact);

  const glowTex = radialTexture(THREE, [[0, 1], [0.35, 0.55], [1, 0]]);
  const poolMat = new THREE.MeshBasicMaterial({ color: '#ffae62', alphaMap: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, premultipliedAlpha: true, depthWrite: false, fog: false });
  [[0.45, 5.6, 6.5, 4.2], [8.0, 0, 3.2, 3.2], [-7.3, 0, 2.2, 2.6]].forEach(([x, z, w, d]) => {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(w, d), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.012, z);
    pool.renderOrder = 1;
    scene.add(pool);
  });

  /* ---------- Light ---------- */
  const sun = new THREE.DirectionalLight('#ffffff', 3);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(narrow() ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.target.position.set(0, 2, 0);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
  scene.add(hemi);

  /* ---------- Stages: from a section to the numbers the springs aim for ---------- */
  const sections = Array.from(document.querySelectorAll('[data-stage]'));
  let stage = -1;
  let intro = false;
  const color = new THREE.Color();
  const setColor = (key, value) => {
    color.setStyle(value);
    goal[K[key + 'R']] = color.r;
    goal[K[key + 'G']] = color.g;
    goal[K[key + 'B']] = color.b;
  };
  function pickStage() {
    const line = window.innerHeight * 0.5;
    let found = 0;
    for (const el of sections) if (el.getBoundingClientRect().top <= line) found = Number(el.dataset.stage);
    return found;
  }
  function frameFor(s) {
    const w = window.innerWidth;
    const aspect = w / Math.max(1, window.innerHeight);
    let sx = 0.73; // wide: the right-hand window
    let sy = 0.5;
    let fw = 0.42;
    let fh = 0.68;
    if (narrow()) { // phones: the top of the screen, or lower where a caption sits on top
      sx = 0.5;
      sy = s.caption ? 0.58 : 0.3;
      fw = 0.92;
      fh = 0.4;
    }
    const t = Math.tan((s.fov * D2R) / 2);
    const half = Math.min(Math.atan(t * fh), Math.atan(t * aspect * fw));
    return { sx, sy, dist: s.radius / Math.tan(half) };
  }
  function resolve() {
    const s = STAGES[stage];
    const tm = TIMES[s.time];
    const dim = isDark() && DAY.has(s.time) ? DARK_DAY : { sunI: 1, hemiI: 1, env: 1 };
    const f = frameFor(s);
    if (!intro) goal[K.build] = s.build;
    goal[K.lamp] = s.lamp;
    [goal[K.tx], goal[K.ty], goal[K.tz]] = s.target;
    goal[K.az] = s.az;
    goal[K.el] = s.el;
    goal[K.dist] = f.dist;
    goal[K.fov] = s.fov;
    goal[K.sx] = f.sx;
    goal[K.sy] = f.sy;
    goal[K.sunAz] = tm.sunAz;
    goal[K.sunEl] = tm.sunEl;
    setColor('sun', tm.sun);
    goal[K.sunI] = tm.sunI * dim.sunI;
    setColor('sky', tm.sky);
    setColor('gnd', tm.ground);
    goal[K.hemiI] = tm.hemiI * dim.hemiI;
    goal[K.env] = tm.env * dim.env;
    goal[K.exposure] = tm.exposure;
    const el = sections.find((section) => Number(section.dataset.stage) === stage);
    setColor('fog', (el && getComputedStyle(el).getPropertyValue('--fog').trim()) || '#f2eee6');
  }
  function snap(keys) {
    (keys || KEYS).forEach((key) => { cur[K[key]] = goal[K[key]]; vel[K[key]] = 0; });
  }

  /* ---------- Apply the state to the scene ---------- */
  const v = new THREE.Vector3();
  function apply() {
    const b = cur[K.build];
    bents.forEach((bent, i) => { bent.rotation.z = (1 - phase(b, i * 0.13, 0.48)) * 88 * D2R; });
    drops.forEach((d) => {
      const p = phase(b, d.from, 0.38);
      d.mesh.visible = p > 0.001;
      d.mesh.position.y = d.y + (1 - p) * 2.4;
    });
    const tree = phase(b, 1.7, 0.24) * (1 - phase(b, 3.0, 0.25));
    richtbaum.visible = tree > 0.001;
    richtbaum.scale.setScalar(Math.max(tree, 0.001) * 0.6);
    const pf = phase(b, 2.0, 0.3);
    floor.visible = pf > 0.001;
    floor.scale.x = Math.max(pf, 0.001);
    floor.position.x = -6.1 + 6.1 * pf;
    walls.forEach((w) => {
      const p = phase(b, w.from, 0.36);
      w.pivot.visible = p > 0.001;
      w.pivot.rotation[w.axis] = w.flat * (1 - p);
    });
    roofs.forEach((r) => {
      const p = phase(b, r.from, 0.36);
      r.group.visible = p > 0.001;
      r.group.position.y = (1 - p) * 2.6;
    });
    updateBattens(b);
    panes.forEach((pane) => {
      const p = phase(b, pane.from, 0.3);
      pane.unit.visible = p > 0.001;
      pane.unit.position.copy(pane.pos).addScaledVector(pane.normal, (1 - p) * 0.9);
    });
    glass.emissiveIntensity = cur[K.lamp] * 2.4;
    poolMat.opacity = cur[K.lamp] * 0.5;

    const sAz = cur[K.sunAz] * D2R;
    const sEl = cur[K.sunEl] * D2R;
    sun.position.set(Math.sin(sAz) * Math.cos(sEl), Math.sin(sEl), Math.cos(sAz) * Math.cos(sEl)).multiplyScalar(40).add(sun.target.position);
    sun.color.setRGB(cur[K.sunR], cur[K.sunG], cur[K.sunB]);
    sun.intensity = cur[K.sunI];
    hemi.color.setRGB(cur[K.skyR], cur[K.skyG], cur[K.skyB]);
    hemi.groundColor.setRGB(cur[K.gndR], cur[K.gndG], cur[K.gndB]);
    hemi.intensity = cur[K.hemiI];
    scene.environmentIntensity = cur[K.env];
    renderer.toneMappingExposure = cur[K.exposure];
    scene.fog.color.setRGB(cur[K.fogR], cur[K.fogG], cur[K.fogB]);
    ground.material.color.setRGB(cur[K.fogR] * 0.85, cur[K.fogG] * 0.85, cur[K.fogB] * 0.85); // the ground is the page, catching shadows
    scene.fog.near = cur[K.dist] * 0.92;
    scene.fog.far = cur[K.dist] * 2.6;

    // Camera: orbit the target, look level, then shift the lens to frame the house
    const az = (cur[K.az] + cur[K.leanX]) * D2R;
    const el = (cur[K.el] + cur[K.leanY]) * D2R;
    const d = cur[K.dist];
    const [tx, ty, tz] = [cur[K.tx], cur[K.ty], cur[K.tz]];
    camera.position.set(tx + Math.sin(az) * Math.cos(el) * d, ty + Math.sin(el) * d, tz + Math.cos(az) * Math.cos(el) * d);
    camera.fov = cur[K.fov];
    camera.aspect = Math.max(1, layer.clientWidth) / Math.max(1, layer.clientHeight);
    camera.updateProjectionMatrix();
    camera.lookAt(tx, camera.position.y, tz);
    camera.updateMatrixWorld();
    v.set(tx, ty, tz).project(camera);
    const P = camera.projectionMatrix.elements;
    P[8] -= cur[K.sx] * 2 - 1 - v.x;
    P[9] -= 1 - cur[K.sy] * 2 - v.y;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  /* ---------- The spring and the render-on-demand loop ---------- */
  function step(dt) {
    let moving = false;
    const n = Math.ceil(dt / 0.02);
    const h = dt / n;
    for (let i = 0; i < KEYS.length; i++) {
      const w = i === K.build && intro ? 7.5 : 10;
      if (Math.abs(cur[i] - goal[i]) < 1e-3 && Math.abs(vel[i]) < 1e-3) { cur[i] = goal[i]; vel[i] = 0; continue; }
      for (let k = 0; k < n; k++) {
        vel[i] += (-2 * w * vel[i] - w * w * (cur[i] - goal[i])) * h;
        cur[i] += vel[i] * h;
      }
      moving = true;
    }
    return moving;
  }
  let raf = 0;
  let last = 0;
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    const moving = step(dt);
    apply();
    renderer.render(scene, camera);
    window.__scene = { stage, build: +cur[K.build].toFixed(3), lamp: +cur[K.lamp].toFixed(3), moving };
    if (moving) raf = requestAnimationFrame(tick);
  }
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function onScroll() {
    const next = pickStage();
    if (next === stage) return;
    stage = next;
    intro = false;
    resolve();
    if (reduce.matches) snap();
    kick();
  }
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; onScroll(); });
  }, { passive: true });

  function resize() {
    renderer.setSize(Math.max(1, layer.clientWidth), Math.max(1, layer.clientHeight), false);
    resolve();
    snap(['dist', 'sx', 'sy']);
    kick();
  }
  new ResizeObserver(resize).observe(layer);

  const retheme = () => { resolve(); if (reduce.matches) snap(); kick(); };
  new MutationObserver(retheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', retheme);

  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (event) => {
      if (reduce.matches) return;
      goal[K.leanX] = ((event.clientX / window.innerWidth) * 2 - 1) * 1.2;
      goal[K.leanY] = ((event.clientY / window.innerHeight) * 2 - 1) * -0.5;
      kick();
    }, { passive: true });
  }

  /* ---------- First frame ---------- */
  layer.appendChild(canvas);
  renderer.setSize(Math.max(1, layer.clientWidth), Math.max(1, layer.clientHeight), false);
  stage = pickStage();
  intro = stage === 0 && !reduce.matches;
  resolve();
  snap();
  if (intro) {
    cur[K.build] = 0;
    goal[K.build] = 0;
    setTimeout(() => { if (intro) { goal[K.build] = STAGES[stage].build; kick(); } }, 150);
  }
  apply();
  renderer.render(scene, camera);
  window.__scene = { stage, build: +cur[K.build].toFixed(3), lamp: +cur[K.lamp].toFixed(3), moving: false };
  root.classList.add('has-scene');
}

/* Fine grain along the length, with the glue lines of glulam lamellae */
function woodTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 110; i++) {
    const y = rand() * c.height;
    const amp = 0.6 + rand() * 2.4;
    const freq = 1 + Math.floor(rand() * 3);
    g.strokeStyle = `rgba(120, 72, 30, ${0.04 + rand() * 0.1})`;
    g.lineWidth = 0.6 + rand() * 1.6;
    g.beginPath();
    for (let x = 0; x <= c.width; x += 16) {
      const yy = y + Math.sin((x / c.width) * Math.PI * 2 * freq + i) * amp;
      if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.stroke();
  }
  g.fillStyle = 'rgba(110, 70, 35, 0.22)';
  for (let y = 0; y < c.height; y += 32) g.fillRect(0, y, c.width, 1.2);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/* A round greyscale ramp for alpha maps: stops are [radius 0..1, value 0..1] */
function radialTexture(THREE, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gradient = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([at, value]) => { const k = Math.round(value * 255); gradient.addColorStop(at, `rgb(${k}, ${k}, ${k})`); });
  g.fillStyle = gradient;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
