/*
 * Shader backgrounds: a full-bleed GLSL field behind a section, with no library.
 *
 *   <section class="band">
 *     <div class="shader-bg" data-shader="aurora" aria-hidden="true"></div>
 *     <div class="wrap">…content…</div>
 *   </section>
 *
 * Attributes on the element:
 *   data-shader  mesh | grain | aurora | rays | metal | dither | halftone | ascii
 *   data-colors  up to four hex colours, space-separated (base first); each program has defaults
 *   data-speed   time multiplier (default 1)
 *   data-scale   pattern size multiplier (default 1; larger is busier)
 *   data-pixel   cell size in canvas pixels for dither, halftone and ascii (default 2)
 *   data-res     render resolution as a share of the CSS size (default 0.5; capped at 960px wide)
 *
 * The canvas renders at a fraction of the element's size and CSS stretches it, so a full
 * screen of shader costs a few hundred thousand pixels. It draws only while on screen,
 * holds one still frame under reduced motion, and frees its WebGL context when it is far
 * off screen, so a page can carry several without reaching the browser's context limit.
 * Without WebGL nothing changes: the element keeps its CSS background, so give it one.
 * The element gets .is-live once its first frame is drawn. ?debug-fx puts counts on window.__fx.
 *
 * Every colour written is opaque or valid premultiplied colour (never brighter than alpha);
 * see the skill's rule on GPU compositors.
 */
(() => {
  'use strict';

  const els = Array.from(document.querySelectorAll('[data-shader]'));
  if (!els.length) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const debug = /debug-fx/.test(location.search);

  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

  // Defaults per program: the base (or paper) colour first.
  const DEFAULTS = {
    mesh: ['#1d1b4b', '#5b4bd6', '#e07a5f', '#f4d58d'],
    grain: ['#0d0f1a', '#3d3a8c', '#c16b8f', '#f2c48d'],
    aurora: ['#05060d', '#2de2a6', '#5b8cff', '#c15bff'],
    rays: ['#06070c', '#ffe8b0', '#ff9e6b', '#ffffff'],
    metal: ['#16181d', '#7d838c', '#e9edf2', '#ffffff'],
    dither: ['#0b0d0f', '#8a8cf0', '#8a8cf0', '#8a8cf0'],
    halftone: ['#f3efe6', '#1a1a1a', '#d94f30', '#1a1a1a'],
    ascii: ['#050607', '#2bd46e', '#c8ffd9', '#c8ffd9'],
  };
  // Cell-based programs keep hard pixel edges when CSS scales them up.
  const PIXELATED = new Set(['dither', 'halftone', 'ascii']);

  // Five-by-five glyphs for the ASCII field, from light to dark. Packed into two floats each
  // (rows 0-2 and rows 3-4) so the shader reads them with float maths, which WebGL 1 allows.
  // ' '  '.'  ':'  '-'  '+'  '='  '*'  '#'  '@' — 0, 1, 2, 3, 5, 6, 11, 16, 17 cells of ink.
  const GLYPHS = [
    ['.....', '.....', '.....', '.....', '.....'],
    ['.....', '.....', '.....', '.....', '..#..'],
    ['.....', '..#..', '.....', '..#..', '.....'],
    ['.....', '.....', '.###.', '.....', '.....'],
    ['.....', '..#..', '.###.', '..#..', '.....'],
    ['.....', '.###.', '.....', '.###.', '.....'],
    ['.#.#.', '..#..', '#####', '..#..', '.#.#.'],
    ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'],
    ['.###.', '##.##', '#.###', '##...', '.####'],
  ].map((rows) => rows.join(''));
  const pack = (g, from, to) => { let n = 0; for (let i = from; i < to; i++) if (g[i] === '#') n += 2 ** (i - from); return n.toFixed(1); };
  const GLYPH_FN = `vec2 glyphBits(float level) {\n${GLYPHS.map((g, k) =>
    `  if (level < ${k}.5) return vec2(${pack(g, 0, 15)}, ${pack(g, 15, 25)});`).join('\n')}\n  return vec2(0.0);\n}`;

  const COMMON = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uPointer;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
uniform float uScale; uniform float uPixel;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int k = 0; k < 5; k++) { v += a * noise(p); p = p * 2.02 + 19.1; a *= 0.5; } return v; }
vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  if (t < 1.0) return mix(uC0, uC1, t);
  if (t < 2.0) return mix(uC1, uC2, t - 1.0);
  return mix(uC2, uC3, t - 2.0);
}
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float bit(float n, float b) { return mod(floor(n / exp2(b)), 2.0); }
${GLYPH_FN}
`;

  // Each program is one function: field(uv 0..1, p centred and aspect-correct with y up, frag px).
  const PROGRAMS = {
    // Four colours drifting on slow orbits, blended by distance over a warped plane.
    mesh: `
vec4 field(vec2 uv, vec2 p, vec2 frag) {
  float t = uTime * 0.12;
  vec2 q = p * uScale;
  q += 0.18 * vec2(fbm(q * 1.4 + t), fbm(q * 1.4 - t + 7.0));
  vec2 m = (uPointer - 0.5) * 0.35;
  vec2 a = vec2(sin(t * 1.3) * 0.55, cos(t * 1.1) * 0.35) + m;
  vec2 b = vec2(cos(t * 0.9 + 2.0) * 0.6, sin(t * 1.4 + 1.0) * 0.4);
  vec2 c = vec2(sin(t * 0.7 + 4.0) * 0.5, cos(t * 0.8 + 3.0) * 0.45);
  vec2 d = vec2(cos(t * 1.2 + 5.0) * 0.55, sin(t * 0.6 + 2.5) * 0.4) - m;
  float wa = 1.0 / (0.03 + dot(q - a, q - a));
  float wb = 1.0 / (0.03 + dot(q - b, q - b));
  float wc = 1.0 / (0.03 + dot(q - c, q - c));
  float wd = 1.0 / (0.03 + dot(q - d, q - d));
  vec3 col = (uC0 * wa + uC1 * wb + uC2 * wc + uC3 * wd) / (wa + wb + wc + wd);
  col += (hash(frag + fract(uTime)) - 0.5) * 0.02;
  return vec4(col, 1.0);
}`,
    // A soft gradient under heavy, moving film grain.
    grain: `
vec4 field(vec2 uv, vec2 p, vec2 frag) {
  float t = uTime * 0.08;
  float n = fbm(p * 1.6 * uScale + vec2(t, -t * 0.7) + fbm(p - t) * 0.6);
  vec3 col = ramp(smoothstep(0.18, 0.9, n + 0.3 * (uv.y - 0.5) + 0.15 * (0.5 - distance(uv, uPointer))));
  col += (hash(floor(frag) + floor(uTime * 24.0)) - 0.5) * 0.14;
  return vec4(col, 1.0);
}`,
    // Curtains of light: a sharp lower edge that fades upward, streaked by slow vertical rays.
    aurora: `
vec4 field(vec2 uv, vec2 p, vec2 frag) {
  float t = uTime * 0.12;
  vec3 col = uC0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float x = p.x * (1.1 + fk * 0.35) * uScale + fk * 1.7;
    float base = 0.42 + fk * 0.07 + 0.1 * sin(x * 1.3 + t * (1.0 + fk * 0.3)) + 0.12 * (fbm(vec2(x * 0.7, t + fk)) - 0.5);
    float h = uv.y - base;
    float curtain = smoothstep(0.0, 0.025, h) * exp(-h * (4.0 + fk * 2.0));
    float streak = 0.45 + 0.55 * fbm(vec2(x * 7.0, uv.y * 1.5 - t * 1.5));
    vec3 c = fk < 0.5 ? uC1 : (fk < 1.5 ? uC2 : uC3);
    col += c * curtain * streak * (0.85 - fk * 0.2);
  }
  col += (hash(frag) - 0.5) * 0.015;
  return vec4(min(col, vec3(1.0)), 1.0);
}`,
    // Light falling from above the frame, in shifting shafts; the source leans toward the pointer.
    rays: `
vec4 field(vec2 uv, vec2 p, vec2 frag) {
  vec2 src = vec2(mix(0.3, 0.7, uPointer.x), 1.18);
  vec2 d = uv - src; d.x *= uRes.x / uRes.y;
  float ang = atan(d.x, -d.y);
  float r = length(d);
  float t = uTime * 0.12;
  float shafts = 0.65 * pow(noise(vec2(ang * 8.0 * uScale, t)), 2.5) + 0.45 * pow(noise(vec2(ang * 21.0 * uScale + 3.0, t * 1.6)), 3.5);
  float a = clamp(shafts * smoothstep(1.6, 0.05, r) * 1.5, 0.0, 1.0);
  vec3 light = mix(uC1, uC2, smoothstep(0.2, 1.3, r));
  return vec4(mix(uC0, light, a), 1.0);
}`,
    // Liquid chrome: bands of a warped field through a dark-to-bright metal ramp, with speculars.
    metal: `
vec4 field(vec2 uv, vec2 p, vec2 frag) {
  float t = uTime * 0.18;
  vec2 q = p * 1.6 * uScale;
  q += 0.35 * vec2(fbm(q + t), fbm(q - t + 4.0)) + (uPointer - 0.5) * 0.4;
  float v = 0.5 + 0.5 * sin(q.x * 3.0 + q.y * 2.0 + fbm(q * 1.5) * 4.5);
  vec3 col = mix(uC0, uC1, smoothstep(0.0, 0.5, v));
  col = mix(col, uC2, smoothstep(0.5, 0.88, v));
  col += uC3 * pow(smoothstep(0.82, 1.0, v), 5.0) * 1.1;
  return vec4(min(col, vec3(1.0)), 1.0);
}`,
    // Ordered (Bayer 8x8) dithering of drifting noise into two inks, in chunky pixels.
    dither: `
vec4 field(vec2 uv, vec2 p, vec2 frag) {
  vec2 cell = floor(frag / uPixel);
  vec2 cp = (cell * uPixel - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.1;
  float n = fbm(cp * 2.2 * uScale + vec2(t, t * 0.6) + fbm(cp * 1.3 - t));
  float lum = smoothstep(0.28, 0.82, n + 0.2 * (uv.y - 0.5) + 0.18 * (0.5 - distance(uv, uPointer)));
  return vec4(mix(uC0, uC1, step(bayer8(cell), lum)), 1.0);
}`,
    // Print halftone: a 45-degree dot screen whose dots grow with a moving field; two inks.
    halftone: `
vec4 field(vec2 uv, vec2 p, vec2 frag) {
  float s = uPixel * 3.0 + 3.0;
  vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * frag;
  vec2 cell = floor(g / s);
  vec2 local = fract(g / s) - 0.5;
  vec2 cf = mat2(0.7071, 0.7071, -0.7071, 0.7071) * ((cell + 0.5) * s);
  vec2 cp = (cf - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.12;
  float v = smoothstep(0.2, 0.85, fbm(cp * 2.0 * uScale + vec2(t, -t)) + 0.2 - 0.25 * distance(cf / uRes, uPointer));
  float radius = sqrt(v) * 0.52;
  float aa = 1.5 / s;
  float dotMask = 1.0 - smoothstep(radius - aa, radius + aa, length(local));
  return vec4(mix(uC0, mix(uC1, uC2, smoothstep(0.55, 1.0, v)), dotMask), 1.0);
}`,
    // A field of 5x5 glyphs whose density follows drifting noise, brightest near the pointer.
    ascii: `
vec4 field(vec2 uv, vec2 p, vec2 frag) {
  float px = max(1.0, floor(uPixel));
  float s = px * 6.0;
  vec2 cell = floor(frag / s);
  vec2 cf = (cell + 0.5) * s;
  vec2 cp = (cf - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.15;
  float v = fbm(cp * 2.0 * uScale + vec2(t, t * 0.4) + fbm(cp * 1.2 - t * 0.5));
  v = clamp(smoothstep(0.32, 0.86, v) + 0.35 * (0.45 - distance(cf / uRes, uPointer)), 0.0, 1.0);
  vec2 local = floor((frag - cell * s) / px);
  if (local.x > 4.5 || local.y > 4.5) return vec4(uC0, 1.0);
  float idx = local.x + 5.0 * (4.0 - local.y);
  vec2 g = glyphBits(floor(v * 8.99));
  float on = idx < 14.5 ? bit(g.x, idx) : bit(g.y, idx - 15.0);
  return vec4(mix(uC0, mix(uC1, uC2, v), on), 1.0);
}`,
  };

  const VERT = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';
  const MAIN = `
void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  gl_FragColor = field(uv, p, frag);
}`;

  function compile(gl, frag) {
    const program = gl.createProgram();
    [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, frag]].forEach(([type, source]) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader');
      gl.attachShader(program, shader);
    });
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link');
    return program;
  }

  const fields = els.filter((el) => PROGRAMS[el.dataset.shader]).map((el) => {
    const given = (el.dataset.colors || '').trim().split(/\s+/).filter((c) => /^#[0-9a-f]{6}$/i.test(c));
    const base = DEFAULTS[el.dataset.shader];
    const colors = base.map((c, k) => hex(given[k] || given[given.length - 1] || c));
    return {
      el,
      name: el.dataset.shader,
      colors,
      speed: Number(el.dataset.speed) || 1,
      scale: Number(el.dataset.scale) || 1,
      pixel: Number(el.dataset.pixel) || 2,
      res: Math.min(1, Number(el.dataset.res) || 0.5),
      canvas: null,
      gl: null,
      near: false,
      visible: false,
      drawn: false,
      pointer: [0.5, 0.5],
      target: [0.5, 0.5],
    };
  });
  if (!fields.length) return;
  const byEl = new Map(fields.map((f) => [f.el, f]));

  function boot(f) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;'
      + (PIXELATED.has(f.name) ? 'image-rendering:pixelated;' : '');
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power' };
    const gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
    if (!gl) { f.el.classList.add('no-shader'); return; }
    let program;
    try { program = compile(gl, COMMON + PROGRAMS[f.name] + MAIN); } catch (error) {
      if (debug) console.warn('shader-bg', f.name, error.message);
      f.el.classList.add('no-shader');
      return;
    }
    gl.useProgram(program);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    f.u = {};
    ['uRes', 'uTime', 'uPointer', 'uC0', 'uC1', 'uC2', 'uC3', 'uScale', 'uPixel'].forEach((n) => { f.u[n] = gl.getUniformLocation(program, n); });
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); free(f, true); });
    f.el.prepend(canvas);
    f.canvas = canvas;
    f.gl = gl;
    f.drawn = false;
    size(f);
  }

  function free(f, lost) {
    if (!f.gl) return;
    if (!lost) { const ext = f.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
    f.canvas.remove();
    f.canvas = null;
    f.gl = null;
    f.el.classList.remove('is-live');
  }

  function size(f) {
    if (!f.gl) return;
    const r = f.el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const w = Math.max(2, Math.round(Math.min(r.width * f.res, 960)));
    const h = Math.max(2, Math.round(w * r.height / r.width));
    if (f.canvas.width !== w || f.canvas.height !== h) {
      f.canvas.width = w;
      f.canvas.height = h;
      f.gl.viewport(0, 0, w, h);
    }
    f.drawn = false;
  }

  function draw(f, now) {
    const gl = f.gl;
    const t = still ? 7 : (now / 1000) * f.speed;
    f.pointer[0] += (f.target[0] - f.pointer[0]) * 0.06;
    f.pointer[1] += (f.target[1] - f.pointer[1]) * 0.06;
    gl.uniform2f(f.u.uRes, f.canvas.width, f.canvas.height);
    gl.uniform1f(f.u.uTime, t);
    gl.uniform2f(f.u.uPointer, f.pointer[0], f.pointer[1]);
    ['uC0', 'uC1', 'uC2', 'uC3'].forEach((n, k) => gl.uniform3fv(f.u[n], f.colors[k]));
    gl.uniform1f(f.u.uScale, f.scale);
    gl.uniform1f(f.u.uPixel, f.pixel);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!f.drawn) { f.drawn = true; f.el.classList.add('is-live'); }
  }

  let looping = false;
  function frame(now) {
    let any = false;
    for (const f of fields) {
      if (!f.visible || !f.gl) continue;
      if (still && f.drawn) continue;
      draw(f, now);
      any = true;
    }
    if (debug) window.__fx = { fields: fields.length, live: fields.filter((f) => f.gl).length, drawing: fields.filter((f) => f.visible && f.gl).length };
    looping = any && !still;
    if (looping) requestAnimationFrame(frame);
  }
  const kick = () => { if (!looping) { looping = !still; requestAnimationFrame(frame); } };

  // Near: hold a context while the element is within a screen and a half; free it beyond that.
  const near = new IntersectionObserver((entries) => entries.forEach((e) => {
    const f = byEl.get(e.target);
    f.near = e.isIntersecting;
    if (f.near && !f.gl) boot(f);
    else if (!f.near && f.gl) free(f);
    kick();
  }), { rootMargin: '150% 0px' });
  // Visible: draw only what can be seen.
  const seen = new IntersectionObserver((entries) => entries.forEach((e) => {
    byEl.get(e.target).visible = e.isIntersecting;
    kick();
  }), { rootMargin: '5% 0px' });
  const sizer = new ResizeObserver((entries) => { entries.forEach((e) => size(byEl.get(e.target))); kick(); });
  fields.forEach((f) => { near.observe(f.el); seen.observe(f.el); sizer.observe(f.el); });

  if (fine && !still) {
    window.addEventListener('pointermove', (e) => {
      for (const f of fields) {
        if (!f.visible) continue;
        const r = f.el.getBoundingClientRect();
        f.target = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
      }
    }, { passive: true });
  }
})();
