/*
 * Ledgerly's desk: one month's money as paper, built from primitives.
 * Stage 0  the desk: a paid invoice, the payment as a stack of slips, a messy pile of receipts
 * Stage 1  the invoice stands up to be read
 * Stage 2  the receipts sort themselves into three category piles
 * Stage 3  the top quarter of the stack lifts off into the amber tax pot
 * Stage 4  three columns stand on one ruled double line: the books balance
 * Scroll picks the stage ([data-stage] sections); the scene eases there and
 * renders only while something is changing. See MOTION.md.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/* ---------- Layout of the desk, stage by stage ---------- */
const SLIPS = 40;
const TAX_FROM = 30; // the top 10 of 40 slips (26% of $2,400 rounds to a quarter of the stack)
const RECEIPTS = 14;
const SLIP_STEP = 0.034;
const RECEIPT_STEP = 0.017;
const YOURS = [0.55, 0.25];
const TAX = [2.2, 0.25];
const EXPENSES = [-1.05, 0.25];
const STAGES = 5;

function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seeded(42);
const jitter = (n) => (rand() * 2 - 1) * n;

// Keys: per stage, per item, [x, y, z, yaw, amber]
const slipKeys = [];
const slipYaw = Array.from({ length: SLIPS }, () => jitter(0.025));
for (let k = 0; k < STAGES; k++) {
  slipKeys.push(Array.from({ length: SLIPS }, (_, i) => {
    const toTax = k >= 3 && i >= TAX_FROM;
    if (toTax) {
      const j = SLIPS - 1 - i; // the top slip leaves first and lands at the bottom
      return [TAX[0], 0.016 + j * SLIP_STEP, TAX[1], slipYaw[i], 1];
    }
    return [YOURS[0], 0.016 + i * SLIP_STEP, YOURS[1], slipYaw[i], 0];
  }));
}

const receiptKeys = [];
const messy = Array.from({ length: RECEIPTS }, () => [jitter(0.22), jitter(0.2), jitter(0.6)]);
const neat = Array.from({ length: RECEIPTS }, () => jitter(0.03));
const PILES = [-1.65, -0.9, -0.15];
for (let k = 0; k < STAGES; k++) {
  receiptKeys.push(Array.from({ length: RECEIPTS }, (_, i) => {
    if (k <= 1) return [-1.0 + messy[i][0], 0.007 + i * RECEIPT_STEP, -1.25 + messy[i][1], messy[i][2], 0];
    if (k <= 3) {
      const pile = i % 3;
      const level = Math.floor(i / 3);
      return [PILES[pile], 0.007 + level * RECEIPT_STEP, 1.3, neat[i], 0];
    }
    return [EXPENSES[0], 0.007 + i * RECEIPT_STEP, EXPENSES[1], neat[i], 0];
  }));
}

const quat = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
const FLAT = -Math.PI / 2;
const invoiceKeys = [
  { p: new THREE.Vector3(-0.85, 0.004, 0.6), q: quat(FLAT, 0, 0.2) },
  { p: new THREE.Vector3(-0.7, 1.02, 0.55), q: quat(-0.1, 0.32, 0) },
  { p: new THREE.Vector3(-0.35, 0.004, -1.45), q: quat(FLAT, 0, -0.08) },
  { p: new THREE.Vector3(-0.35, 0.004, -1.45), q: quat(FLAT, 0, -0.08) },
  { p: new THREE.Vector3(-0.35, 0.004, -1.45), q: quat(FLAT, 0, -0.08) },
];

// Camera: what it looks at, the direction it looks from, how far away
const cameraKeys = [
  { t: [0.0, 0.4, 0.0], d: [0.6, 0.55, 1], r: 9.6 },
  { t: [-0.45, 0.85, 0.45], d: [0.42, 0.22, 1], r: 6.4 },
  { t: [-0.75, 0.1, 0.55], d: [0.12, 1.05, 0.75], r: 7.4 },
  { t: [1.3, 0.35, 0.15], d: [0.7, 0.45, 1], r: 7.6 },
  { t: [0.55, 0.42, 0.2], d: [0, 0.3, 1], r: 9.4 },
].map((c) => ({ t: new THREE.Vector3(...c.t), d: new THREE.Vector3(...c.d).normalize(), r: c.r }));

/* ---------- Easing ---------- */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ---------- Materials that read as paper ---------- */
function invoiceTexture() {
  const c = document.createElement('canvas');
  c.width = 600; c.height = 848;
  const g = c.getContext('2d');
  const serif = 'Charter, "Iowan Old Style", Georgia, serif';
  const mono = 'ui-monospace, Menlo, Consolas, monospace';
  g.fillStyle = '#fffdf7'; g.fillRect(0, 0, 600, 848);
  g.fillStyle = '#1f5c45'; g.fillRect(0, 0, 600, 14);
  g.fillStyle = '#15211b'; g.font = `400 52px ${serif}`; g.fillText('Invoice', 52, 112);
  g.fillStyle = '#5b675f'; g.font = `500 20px ${mono}`; g.fillText('INV-0042', 52, 150);
  g.fillText('NORTHWIND STUDIO', 52, 182);
  g.fillStyle = '#d7d2c6';
  [[52, 250, 300], [52, 286, 220], [52, 380, 330], [52, 440, 270], [52, 500, 300]].forEach(([x, y, w]) => g.fillRect(x, y, w, 10));
  [[440, 380], [440, 440], [440, 500]].forEach(([x, y]) => g.fillRect(x, y, 108, 10));
  g.fillStyle = '#15211b'; g.fillRect(52, 560, 496, 2);
  g.font = `600 26px ${mono}`; g.fillText('TOTAL', 52, 612);
  g.textAlign = 'right'; g.fillText('$2,400.00', 548, 612);
  g.fillRect(52, 636, 496, 2); g.fillRect(52, 643, 496, 2);
  g.save();
  g.translate(410, 740); g.rotate(-0.12);
  g.strokeStyle = '#1f5c45'; g.lineWidth = 5; g.strokeRect(-92, -34, 184, 68);
  g.fillStyle = '#1f5c45'; g.textAlign = 'center'; g.font = `700 38px ${mono}`; g.fillText('PAID', 0, 14);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function main() {
  const layer = document.querySelector('.scene-layer');
  const stageEls = Array.from(document.querySelectorAll('[data-stage]'));
  const heroStage = document.querySelector('.hero .stage');
  if (!layer || !stageEls.length || !heroStage) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (error) {
    return; // no WebGL: the drawn stand-in stays
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  layer.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);

  const key = new THREE.DirectionalLight(0xfff0d8, 1.7);
  key.position.set(3.5, 7, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -5; key.shadow.camera.right = 5;
  key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
  key.shadow.camera.near = 1; key.shadow.camera.far = 20;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  scene.add(key);
  const fill = new THREE.HemisphereLight(0xdfe9ff, 0x8a7a60, 0.35);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = FLAT;
  ground.receiveShadow = true;
  scene.add(ground);

  // The payment: slips of paper. Sage for yours, amber once set aside for tax.
  const SAGE = new THREE.Color('#c6d8c9');
  const AMBER = new THREE.Color('#e6bd6a');
  const slipMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0 });
  const slips = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.026, 1.0), slipMat, SLIPS);
  slips.castShadow = true; slips.receiveShadow = true;
  scene.add(slips);

  const receiptMat = new THREE.MeshStandardMaterial({ color: '#fbfaf5', roughness: 0.9 });
  const receipts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.011, 0.92), receiptMat, RECEIPTS);
  receipts.castShadow = true; receipts.receiveShadow = true;
  scene.add(receipts);

  const invoice = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.84),
    new THREE.MeshStandardMaterial({ map: invoiceTexture(), roughness: 0.82, side: THREE.DoubleSide }),
  );
  invoice.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  invoice.castShadow = true; invoice.receiveShadow = true;
  scene.add(invoice);

  // The accountant's double rule under the balanced columns
  const ruleMat = new THREE.MeshStandardMaterial({ color: '#1f5c45', roughness: 0.6 });
  const rule = new THREE.Group();
  [0.98, 1.06].forEach((z) => {
    const line = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.01, 0.035), ruleMat);
    line.position.set(0, 0.005, z);
    rule.add(line);
  });
  rule.position.x = 0.55;
  scene.add(rule);

  /* ---------- Theme ---------- */
  function applyTheme() {
    const mode = document.documentElement.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
    const dark = mode === 'dark';
    ground.material.opacity = dark ? 0.42 : 0.16;
    ruleMat.color.set(dark ? '#7cc6a1' : '#1f5c45');
    key.intensity = dark ? 1.25 : 1.7;
    scene.environmentIntensity = dark ? 0.32 : 0.6;
    fill.intensity = dark ? 0.15 : 0.35;
    kick();
  }

  /* ---------- Framing: the desk sits in the hero's stage column ---------- */
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  let aspect = 1;
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    frame();
  }
  // Called on scroll for phones, so it must not resize (that clears the canvas)
  function frame() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const r = heroStage.getBoundingClientRect();
    let fw, fh, ax, ay;
    if (w > 860) {
      fw = Math.max(r.width * 1.25, 420); fh = h;
      ax = r.left + r.width / 2; ay = h * 0.54;
    } else {
      fw = w; fh = Math.max(320, r.height * 1.1);
      ax = w / 2; ay = Math.max(r.top + r.height / 2, fh * 0.3);
    }
    aspect = fw / fh;
    camera.aspect = aspect;
    camera.setViewOffset(fw, fh, fw / 2 - ax, fh / 2 - ay, w, h);
    camera.updateProjectionMatrix();
  }

  /* ---------- Pose the desk at a (fractional) stage ---------- */
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  const v = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();

  function moveItems(mesh, keys, count, a, b, f, order) {
    for (let i = 0; i < count; i++) {
      const A = keys[a][i];
      const B = keys[b][i];
      const delay = order(i) * 0.35;
      const e = easeInOut(clamp01((f - delay) / 0.65));
      const dist = Math.hypot(B[0] - A[0], B[2] - A[2]);
      const lift = dist > 0.05 ? Math.sin(Math.PI * e) * (0.3 + dist * 0.12) : 0;
      v.set(A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e + lift, A[2] + (B[2] - A[2]) * e);
      q.setFromAxisAngle(up, A[3] + (B[3] - A[3]) * e);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
      if (mesh === slips) {
        const amber = A[4] + (B[4] - A[4]) * e;
        mesh.setColorAt(i, col.copy(SAGE).lerp(AMBER, amber));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const right = new THREE.Vector3();

  function pose(stage) {
    stage = Math.max(0, Math.min(STAGES - 1, stage || 0));
    const a = Math.min(STAGES - 1, Math.floor(stage));
    const b = Math.min(STAGES - 1, a + 1);
    const f = stage - a;

    moveItems(slips, slipKeys, SLIPS, a, b, f, (i) => (i >= TAX_FROM ? (SLIPS - 1 - i) / (SLIPS - TAX_FROM) : 0));
    moveItems(receipts, receiptKeys, RECEIPTS, a, b, f, (i) => i / RECEIPTS);

    const e = easeInOut(f);
    invoice.position.lerpVectors(invoiceKeys[a].p, invoiceKeys[b].p, e);
    invoice.position.y += a !== b ? Math.sin(Math.PI * e) * 0.15 : 0;
    invoice.quaternion.slerpQuaternions(invoiceKeys[a].q, invoiceKeys[b].q, e);

    const ruled = easeInOut(clamp01((stage - 3.2) / 0.8));
    rule.scale.x = Math.max(0.0001, ruled);
    rule.visible = ruled > 0.001;

    const ca = cameraKeys[a];
    const cb = cameraKeys[b];
    camTarget.lerpVectors(ca.t, cb.t, e);
    camDir.lerpVectors(ca.d, cb.d, e).normalize();
    const fit = Math.max(1, 0.95 / aspect);
    const dist = (ca.r + (cb.r - ca.r) * e) * fit;
    camPos.copy(camTarget).addScaledVector(camDir, dist);
    right.crossVectors(up, camDir).normalize();
    camPos.addScaledVector(right, lean.x * 0.35).addScaledVector(up, lean.y * 0.2);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
  }

  /* ---------- Scroll picks the stage; idle settles on the nearest ---------- */
  function stageFromScroll() {
    const vh = window.innerHeight;
    const keys = stageEls.map((el) => {
      // A section's visible stage column is where its moment is centred; on phones only the hero has one
      const column = el.querySelector('.stage');
      const r = (column && column.offsetParent ? column : el).getBoundingClientRect();
      return { at: r.top + Math.min(r.height, vh) * 0.5 - vh * 0.5, stage: Number(el.dataset.stage) };
    });
    if (keys[0].at >= 0) return keys[0].stage;
    for (let i = 0; i < keys.length - 1; i++) {
      const A = keys[i];
      const B = keys[i + 1];
      if (A.at <= 0 && B.at > 0) {
        const f = -A.at / (B.at - A.at);
        return A.stage + (B.stage - A.stage) * smooth(0.3, 0.7, f);
      }
    }
    return keys[keys.length - 1].stage;
  }

  let current = stageFromScroll();
  let target = current;
  let idleTimer = 0;
  let running = false;
  let last = 0;

  function tick(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0.016));
    last = now;
    const k = 1 - Math.exp(-dt * 9);
    if (reduce.matches) current = target;
    else current += (target - current) * k;
    if (Math.abs(target - current) < 0.0008) current = target;
    lean.x += (lean.tx - lean.x) * k;
    lean.y += (lean.ty - lean.y) * k;
    const leaning = Math.abs(lean.tx - lean.x) + Math.abs(lean.ty - lean.y) > 0.001;
    pose(current);
    renderer.render(scene, camera);
    if (current !== target || leaning) requestAnimationFrame(tick);
    else running = false;
  }
  function kick() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  function onScroll() {
    const raw = stageFromScroll();
    target = reduce.matches ? Math.round(raw) : raw;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { target = Math.round(stageFromScroll()); kick(); }, 180);
    if (window.innerWidth <= 860) frame();
    kick();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { resize(); onScroll(); });
  window.addEventListener('ledgerly:theme', applyTheme);

  if (finePointer.matches) {
    document.addEventListener('pointermove', (event) => {
      if (reduce.matches) return;
      lean.tx = (event.clientX / window.innerWidth) * 2 - 1;
      lean.ty = (event.clientY / window.innerHeight) * 2 - 1;
      kick();
    }, { passive: true });
  }

  resize();
  applyTheme();
  target = current = reduce.matches ? Math.round(stageFromScroll()) : stageFromScroll();
  pose(current);
  renderer.render(scene, camera);
  document.documentElement.classList.add('has-scene');
  document.body.classList.add('has-scene');
  window.__ledgerScene = { get stage() { return current; }, get target() { return target; } };
}

main();
