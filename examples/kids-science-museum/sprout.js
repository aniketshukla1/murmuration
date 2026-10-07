/*
 * Sprout Lab's signature: a seedling in a lab beaker, built in code with Three.js,
 * that sprouts as the page is read (see MOTION.md). Scroll sets growth through
 * [data-grow] stops; the pointer turns the plant; "Make it fizz" sends bubbles up
 * the water. Reduced motion shows the grown, flowering plant, still. Without WebGL
 * (or if this module fails to load) the SVG still in the hero stays in place.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
const layer = document.querySelector('.scene-layer');
const anchorEl = document.querySelector('[data-plant-anchor]');
const fizzButton = document.querySelector('[data-fizz]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const backOut = (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
} catch (error) {
  renderer = null; // no WebGL: the drawn still stays
}
if (renderer && layer && anchorEl) start();

function start() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  layer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xfff0d8, 1.7);
  key.position.set(3, 6, 5);
  const hemi = new THREE.HemisphereLight(0xd8f0ff, 0x8a5a32, 0.55);
  scene.add(key, hemi);

  /* ---------- Materials: matte toy plastic, cork, and glass that never outshines its alpha ---------- */
  const solid = (color, roughness = 0.55) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const clear = (color, opacity, roughness = 0.08) => new THREE.MeshStandardMaterial({
    color, roughness, metalness: 0, transparent: true, opacity, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide,
  });

  const plant = new THREE.Group();
  scene.add(plant);

  // Contact shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.38)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.14)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.42;
  plant.add(shadow);

  // Cork mat
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.1, 0.16, 64), solid(0xd9a066, 0.9));
  cork.position.y = -1.33;
  plant.add(cork);

  // Pebbles and water
  const gravel = new THREE.Mesh(new THREE.CylinderGeometry(0.565, 0.565, 0.33, 48), solid(0x8a6a4f, 0.95));
  gravel.position.y = -1.015;
  plant.add(gravel);
  const pebbleColors = [0xb08968, 0x7f5f45, 0xc9b49a, 0x9c7b5c];
  const pebbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), solid(0xffffff, 0.8), 16);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const color = new THREE.Color();
  for (let i = 0; i < 16; i++) {
    const a = i * 2.39996;
    const r = 0.12 + ((i * 37) % 10) / 10 * 0.36;
    const s = 0.045 + ((i * 13) % 7) / 7 * 0.035;
    m4.compose(v.set(Math.cos(a) * r, -0.85, Math.sin(a) * r), q.identity(), sc.set(s, s * 0.7, s));
    pebbles.setMatrixAt(i, m4);
    pebbles.setColorAt(i, color.setHex(pebbleColors[i % pebbleColors.length]));
  }
  plant.add(pebbles);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.555, 0.555, 0.95, 48), clear(0x6ec3ff, 0.22, 0.05));
  water.position.y = -0.375;
  water.renderOrder = 1;
  plant.add(water);

  // Beaker: a turned profile with a lip, and white graduations
  const profile = [[0, -1.25], [0.56, -1.25], [0.62, -1.19], [0.62, 0.24], [0.68, 0.32], [0.65, 0.34], [0.58, 0.27], [0.575, -1.18], [0, -1.18]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const beaker = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), clear(0xe8f6ff, 0.26));
  beaker.renderOrder = 2;
  plant.add(beaker);
  const tickMat = solid(0xffffff, 0.4);
  for (let i = 0; i < 4; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(i % 2 ? 0.1 : 0.17, 0.016, 0.012), tickMat);
    const a = -0.55;
    tick.position.set(Math.sin(a) * 0.626, -0.95 + i * 0.27, Math.cos(a) * 0.626);
    tick.rotation.y = a;
    plant.add(tick);
  }

  // Seed: two halves that split as it sprouts
  const SOIL = -0.85;
  const seedMat = solid(0xc98b45, 0.6);
  const seedHalves = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.01, SOIL, 0);
    const half = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), seedMat);
    half.scale.set(0.55, 1, 0.85);
    half.position.set(side * 0.05, 0.09, 0);
    pivot.add(half);
    pivot.userData.side = side;
    plant.add(pivot);
    return pivot;
  });

  // Stem: a tube along a gentle S, revealed segment by segment
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, SOIL, 0),
    new THREE.Vector3(0.1, -0.2, 0.04),
    new THREE.Vector3(-0.12, 0.6, -0.02),
    new THREE.Vector3(0.12, 1.4, 0.03),
    new THREE.Vector3(-0.07, 2.2, 0),
    new THREE.Vector3(0, 2.9, 0),
  ]);
  const TUBE_SEGMENTS = 220;
  const RADIAL = 10;
  const stemMat = solid(0x3da35a, 0.5);
  const stemGeo = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, 0.05, RADIAL, false);
  const stem = new THREE.Mesh(stemGeo, stemMat);
  plant.add(stem);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), solid(0x6fcf6b, 0.5));
  plant.add(tip);

  // Leaves: a pair of seed leaves, then one per zone in the zone's colour
  function leafGeometry(len, wid) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(len * 0.25, wid, len * 0.75, wid * 0.9, len, 0);
    shape.bezierCurveTo(len * 0.75, -wid * 0.9, len * 0.25, -wid, 0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.016, bevelSegments: 2, curveSegments: 18 });
    geo.translate(0, 0, -0.01);
    geo.rotateX(-Math.PI / 2); // lie flat, pointing along +x
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / len;
      const z = pos.getZ(i) / wid;
      pos.setY(i, pos.getY(i) - x * x * len * 0.3 + z * z * wid * 0.35); // droop at the tip, cupped at the edges
    }
    geo.computeVertexNormals();
    return geo;
  }
  const LEAVES = [
    { t: 0.06, color: 0x7ccf6b, len: 0.42, wid: 0.15, yaw: 0.25 },
    { t: 0.06, color: 0x7ccf6b, len: 0.42, wid: 0.15, yaw: Math.PI - 0.25 },
    { t: 0.3, color: 0x2d8cff, len: 0.8, wid: 0.26, yaw: -0.35 },          // Splash
    { t: 0.45, color: 0xf2b100, len: 0.78, wid: 0.25, yaw: Math.PI + 0.35 }, // Spark
    { t: 0.6, color: 0x7d5cff, len: 0.72, wid: 0.24, yaw: -0.05 },          // Sky
    { t: 0.74, color: 0x23a45f, len: 0.66, wid: 0.22, yaw: Math.PI + 0.1 },  // Grow
  ];
  const leaves = LEAVES.map((def) => {
    const pivot = new THREE.Group();
    pivot.position.copy(curve.getPointAt(def.t));
    pivot.rotation.y = def.yaw;
    const tilt = new THREE.Group();
    tilt.add(new THREE.Mesh(leafGeometry(def.len, def.wid), solid(def.color, 0.5)));
    pivot.add(tilt);
    pivot.scale.setScalar(0.0001);
    plant.add(pivot);
    return { ...def, pivot, tilt };
  });

  // Flower: a bud at the top that opens at Tickets
  const flower = new THREE.Group();
  flower.position.copy(curve.getPointAt(1));
  flower.rotation.x = 0.45;
  const petalMat = solid(0xff6f5b, 0.45);
  const petals = [];
  for (let i = 0; i < 7; i++) {
    const yaw = new THREE.Group();
    yaw.rotation.y = (i / 7) * Math.PI * 2;
    const tilt = new THREE.Group();
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 12), petalMat);
    petal.scale.set(1.25, 0.32, 0.7);
    petal.position.x = 0.19;
    tilt.add(petal);
    yaw.add(tilt);
    flower.add(yaw);
    petals.push(tilt);
  }
  flower.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), solid(0xffc93c, 0.5)));
  plant.add(flower);

  // Bubbles
  const MAX_BUBBLES = 48;
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), clear(0xffffff, 0.6, 0.05), MAX_BUBBLES);
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bubbles.renderOrder = 1;
  plant.add(bubbles);
  const pool = Array.from({ length: MAX_BUBBLES }, () => ({ alive: false, x: 0, y: 0, z: 0, r: 0, speed: 0, phase: 0 }));
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAX_BUBBLES; i++) bubbles.setMatrixAt(i, hide);
  function spawn(n) {
    for (const b of pool) {
      if (n <= 0) break;
      if (b.alive) continue;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.44;
      Object.assign(b, { alive: true, x: Math.cos(a) * r, z: Math.sin(a) * r, y: SOIL + 0.04 - Math.random() * 0.1, r: 0.022 + Math.random() * 0.035, speed: 0.45 + Math.random() * 0.55, phase: Math.random() * 6.28 });
      n--;
    }
  }
  function stepBubbles(dt, t) {
    let any = false;
    pool.forEach((b, i) => {
      if (!b.alive) { bubbles.setMatrixAt(i, hide); return; }
      any = true;
      b.y += b.speed * dt;
      const x = b.x + Math.sin(t * 5 + b.phase) * 0.015;
      const pop = clamp01((0.09 - b.y) / 0.08); // shrink as it reaches the surface
      if (b.y > 0.09) b.alive = false;
      const s = b.r * (0.4 + 0.6 * pop);
      m4.compose(v.set(x, b.y, b.z), q.identity(), sc.set(s, s, s));
      bubbles.setMatrixAt(i, m4);
    });
    bubbles.instanceMatrix.needsUpdate = true;
    return any;
  }

  /* ---------- Growth from scroll ---------- */
  let stops = [];
  function measure() {
    const vh = window.innerHeight;
    stops = [[0, 0.17]];
    document.querySelectorAll('[data-grow]').forEach((el) => {
      const y = el.getBoundingClientRect().top + window.scrollY - vh * 0.6;
      stops.push([Math.max(1, y), Number(el.dataset.grow)]);
    });
    stops.sort((a, b) => a[0] - b[0]);
  }
  function growthAt(y) {
    if (y <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (y < stops[i][0]) {
        const [y0, g0] = stops[i - 1];
        const [y1, g1] = stops[i];
        return lerp(g0, g1, (y - y0) / (y1 - y0));
      }
    }
    return stops[stops.length - 1][1];
  }

  function grow(g) {
    const split = easeOut(clamp01(g / 0.06));
    seedHalves.forEach((pivot) => { pivot.rotation.z = -pivot.userData.side * split * 0.9; });

    const sp = clamp01((g - 0.03) / 0.97); // stem progress
    stemGeo.setDrawRange(0, Math.floor(sp * TUBE_SEGMENTS) * RADIAL * 6);
    tip.visible = sp > 0.004 && sp < 0.985;
    tip.position.copy(curve.getPointAt(Math.max(sp, 0.001)));

    leaves.forEach((leaf) => {
      const k = clamp01((sp - leaf.t) / 0.09);
      leaf.pivot.scale.setScalar(Math.max(0.0001, backOut(k)));
      leaf.tilt.rotation.z = lerp(1.3, 0.38, easeOut(k)); // unfurl from against the stem
    });

    const bud = clamp01((sp - 0.96) / 0.04);
    const open = easeOut(clamp01((g - 1) / 0.1));
    flower.visible = bud > 0;
    flower.scale.setScalar(Math.max(0.0001, bud * lerp(0.55, 1, open)));
    petals.forEach((p) => { p.rotation.z = lerp(1.35, 0.22, open); });
    return { sp, open };
  }

  /* ---------- Framing: the whole plant in view, placed on the hero stage ---------- */
  const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let width = 0;
  let height = 0;
  let wide = true;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    wide = width > 860;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    measure();
  }
  function frame(sp, open) {
    const tipY = curve.getPointAt(Math.max(sp, 0.001)).y;
    const top = Math.max(tipY + 0.55, 0.55) + open * 0.2;
    const bottom = -1.5;
    const h = top - bottom;
    const cy = (top + bottom) / 2;
    const share = wide ? 0.4 : 0.9; // the plant's share of the screen width
    let d = Math.max((h * 0.62) / halfTan, 1.45 / (halfTan * camera.aspect * share));
    if (!wide) d *= 1.8;
    camera.position.set(0, cy + d * 0.12, d);
    camera.lookAt(0, cy, 0);

    const r = anchorEl.getBoundingClientRect();
    const ax = r.left + r.width / 2;
    const ay = Math.max(r.top + r.height / 2, height * 0.52);
    camera.setViewOffset(width, height, -(ax - width / 2), -(ay - height / 2), width, height);
    camera.updateProjectionMatrix();
    layer.classList.toggle('dim', !wide && r.bottom < height * 0.35);
  }

  /* ---------- Light per theme ---------- */
  function light() {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : darkQuery.matches;
    hemi.intensity = dark ? 0.32 : 0.55;
    key.intensity = dark ? 1.45 : 1.7;
    renderer.toneMappingExposure = dark ? 0.95 : 1.05;
    dirty = true;
  }

  /* ---------- Pointer and fizz ---------- */
  let px = 0;
  let py = 0;
  let turn = 0;
  let lean = 0;
  let wobble = 0;
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      px = (e.clientX / width) * 2 - 1;
      py = (e.clientY / height) * 2 - 1;
    }, { passive: true });
  }
  if (fizzButton) {
    fizzButton.addEventListener('click', () => {
      if (reduce.matches) return;
      spawn(32);
      wobble = 1;
    });
  }

  /* ---------- Loop ---------- */
  let g = 0;
  let dirty = true;
  let last = performance.now();
  let t = 0;
  let nextIdle = 1.2;
  resize();
  light();
  window.addEventListener('resize', () => { resize(); dirty = true; });
  window.addEventListener('scroll', () => { dirty = true; }, { passive: true });
  window.addEventListener('load', () => { measure(); dirty = true; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); dirty = true; });
  new MutationObserver(light).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', light);
  reduce.addEventListener && reduce.addEventListener('change', () => { dirty = true; });

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    const still = reduce.matches;

    const target = still ? 1.1 : growthAt(window.scrollY);
    const rate = t < 2 ? 2.2 : 6;
    const prev = g;
    g = still ? target : g + (target - g) * (1 - Math.exp(-dt * rate));
    if (Math.abs(target - g) < 0.0005) g = target;
    let moving = g !== prev;

    let alive = false;
    if (!still) {
      turn += (px * 0.45 - turn) * (1 - Math.exp(-dt * 4));
      lean += (py * 0.06 - lean) * (1 - Math.exp(-dt * 4));
      wobble *= Math.exp(-dt * 2.5);
      plant.rotation.y = turn;
      plant.rotation.x = lean;
      plant.rotation.z = Math.sin(t * 0.8) * 0.02 + Math.sin(t * 16) * wobble * 0.05;
      if (t > nextIdle) { spawn(1); nextIdle = t + 0.9 + Math.random() * 0.6; }
      alive = stepBubbles(dt, t);
      moving = true; // idle sway
    } else if (plant.rotation.y || plant.rotation.z || plant.rotation.x) {
      plant.rotation.set(0, 0, 0);
      pool.forEach((b) => { b.alive = false; });
      stepBubbles(0, t);
      moving = true;
    }

    if (moving || alive || dirty) {
      const { sp, open } = grow(g);
      frame(sp, open);
      renderer.render(scene, camera);
      dirty = false;
      if (!root.classList.contains('has-scene')) root.classList.add('has-scene');
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
