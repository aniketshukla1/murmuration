/*
 * Vesper's scene: every shape and motion here comes from one night on a sleeper train, and
 * belongs to this page only. Another subject gets its own scene, built the same way.
 *
 *   section      shape        motion                                   travels in by
 *   hero         nightline    lit carriages glide past under the moon  -
 *   departure    platform     station lamps slide away behind you      sweep
 *   route        route        a light runs down the line; stops pulse  stream
 *   cabin        window       town lights pass; the carriage rocks     scatter
 *   pass         snowline     snow drifts; a small train crosses       drift
 *   night        trails       star trails turn about the pole star     spiral
 *   arrival      sunrise      the sun clears the sea as you scroll     sweep
 *   terminus     clock        a railway clock keeps time (21:40 on)    flock
 *   booking      moon         the mark, swaying; the star pulses       spiral
 */
window.MURMURATION_SCENE = (kit) => {
  const { random, gauss, points, svg, mix, move } = kit;
  const TAU = Math.PI * 2;
  const CRESCENT = 'M21.34 11.02A14 14 0 1 0 34.66 30.98A12 12 0 0 1 21.34 11.02Z';
  const STAR = { cx: 37.5, cy: 12, r: 2.6 };

  // Three carriages of six windows across -1..1, so the train repeats seamlessly as it wraps.
  const train = points((i, o) => {
    const slots = 21;
    const pitch = 2 / slots;
    const pick = random();
    if (pick < 0.58) {
      let k;
      do { k = (random() * slots) | 0; } while (k % 7 === 6);
      o[0] = -1 + (k + 0.5) * pitch + (random() - 0.5) * pitch * 0.62;
      o[1] = -0.33 + (random() - 0.5) * 0.085;
      o[2] = (random() - 0.5) * 0.02;
      o[3] = random() < 0.86 ? 1 : 0.35;
    } else if (pick < 0.84) {
      o[0] = random() * 2 - 1;
      o[1] = (random() < 0.5 ? -0.255 : -0.41) + (random() - 0.5) * 0.008;
      o[2] = (random() - 0.5) * 0.02;
    } else {
      o[0] = random() * 2 - 1;
      o[1] = -0.465 + (random() - 0.5) * 0.006;
      o[2] = (random() - 0.5) * 0.05;
    }
  });
  const moon = svg({ view: 48, paths: [CRESCENT], accent: [STAR], depth: 0.1 });

  // A station seen from the last carriage: two rows of lamps, their posts, rails and sleepers.
  const platform = points((i, o) => {
    const pick = random();
    const side = random() < 0.5 ? -1 : 1;
    const lamp = -1 + ((random() * 8) | 0) * 0.25 + 0.125;
    if (pick < 0.24) {
      o[0] = side * 0.55 + gauss() * 0.018;
      o[1] = 0.3 + gauss() * 0.018;
      o[2] = lamp + gauss() * 0.018;
      o[3] = 1;
    } else if (pick < 0.42) {
      o[0] = side * 0.55 + gauss() * 0.004;
      o[1] = -0.28 + random() * 0.56;
      o[2] = lamp;
    } else if (pick < 0.72) {
      o[0] = side * 0.12 + gauss() * 0.004;
      o[1] = -0.33;
      o[2] = random() * 2 - 1;
    } else if (pick < 0.86) {
      o[0] = (random() - 0.5) * 0.4;
      o[1] = -0.345;
      o[2] = -1 + ((random() * 40) | 0) * 0.05 + 0.025;
    } else {
      o[0] = side * 0.36;
      o[1] = -0.27;
      o[2] = random() * 2 - 1;
      o[3] = 0.3;
    }
  });

  // The line from the city to the sea, with its four stops at x = -1, -1/3, 1/3 and 1.
  const curve = (x) => 0.07 * Math.sin(x * 2.4 + 0.6) + 0.03 * Math.sin(x * 5.3 + 1.7);
  const CURVE_GLSL = (x) => `(0.07 * sin(${x} * 2.4 + 0.6) + 0.03 * sin(${x} * 5.3 + 1.7))`;
  const route = mix(
    [points((i, o) => {
      if (random() < 0.76) {
        const x = random() * 2 - 1;
        o[0] = x;
        o[1] = curve(x) + gauss() * 0.01;
        o[2] = gauss() * 0.01;
      } else {
        const s = [-1, -1 / 3, 1 / 3, 1][(random() * 4) | 0];
        o[0] = s + gauss() * 0.025;
        o[1] = curve(s) + gauss() * 0.025;
        o[2] = gauss() * 0.02;
        o[3] = 1;
      }
    }), 0.68],
    [points((i, o) => {
      const x = random() * 2 - 1;
      o[0] = x;
      o[1] = curve(x) + gauss() * 0.006;
      o[3] = 0.7;
    }), 0.32],
  );

  // The cabin window: a double frame, and the lights of the towns outside in rows.
  const streaks = Array.from({ length: 30 }, () => ({ y: (random() - 0.5) * 0.74, x: (random() - 0.5) * 1.2, length: 0.06 + random() * 0.3, warm: random() < 0.6 }));
  const frame = (w, h, r) => {
    const straight = [2 * (w - r), 2 * (h - r)];
    const total = 2 * straight[0] + 2 * straight[1] + TAU * r;
    return (u) => {
      let d = u * total;
      const sides = [[-w + r, h, 1, 0, straight[0]], [w, h - r, 0, -1, straight[1]], [w - r, -h, -1, 0, straight[0]], [-w, -h + r, 0, 1, straight[1]]];
      const corners = [[w - r, h - r, Math.PI / 2], [w - r, -h + r, 0], [-w + r, -h + r, -Math.PI / 2], [-w + r, h - r, Math.PI]];
      for (let s = 0; s < 4; s++) {
        const [x, y, dx, dy, len] = sides[s];
        if (d < len) return [x + dx * d, y + dy * d];
        d -= len;
        const arc = (Math.PI / 2) * r;
        if (d < arc) {
          const [cx, cy, a0] = corners[s];
          const a = a0 - d / r;
          return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        }
        d -= arc;
      }
      return [-w + r, h];
    };
  };
  const outer = frame(0.72, 0.5, 0.12);
  const inner = frame(0.66, 0.44, 0.09);
  const cabin = mix(
    [points((i, o) => {
      const [x, y] = (random() < 0.6 ? outer : inner)(random());
      o[0] = x + gauss() * 0.006;
      o[1] = y + gauss() * 0.006;
      o[2] = gauss() * 0.01;
    }), 0.55],
    [points((i, o) => {
      const s = streaks[(random() * streaks.length) | 0];
      o[0] = s.x + random() * s.length;
      o[1] = s.y + gauss() * 0.004;
      o[2] = gauss() * 0.01;
      o[3] = s.warm ? 1 : 0.2;
    }), 0.45],
  );

  // Hollin Pass: the ridge, the snow, and a train of eight lit windows crossing below it.
  const ridge = (x) => -0.2 + 0.42 * Math.exp(-x * x * 2.6) + 0.07 * Math.abs(Math.sin(x * 6.3)) + 0.035 * Math.sin(x * 17);
  const RIDGE_GLSL = (x) => `(-0.2 + 0.42 * exp(-${x} * ${x} * 2.6) + 0.07 * abs(sin(${x} * 6.3)) + 0.035 * sin(${x} * 17.0))`;
  const snowline = mix(
    [points((i, o) => {
      const x = random() * 2 - 1;
      o[0] = x;
      o[1] = random() < 0.66 ? ridge(x) + gauss() * 0.006 : ridge(x) - Math.pow(random(), 2) * 0.5;
      o[2] = gauss() * 0.03;
    }), 0.68],
    [points((i, o) => {
      o[0] = random() * 2 - 1;
      o[1] = random() * 1.7 - 0.7;
      o[2] = random() - 0.5;
    }), 0.27],
    [points((i, o) => {
      const k = (random() * 8) | 0;
      o[0] = -0.07 + k * 0.02 + (random() - 0.5) * 0.012;
      o[1] = (random() - 0.5) * 0.014;
      o[3] = 1;
    }), 0.05],
  );

  // Star trails: 900 stars, each drawn as a short arc about the pole, brightest at its head.
  const stars = Array.from({ length: 900 }, () => ({ r: 0.08 + Math.sqrt(random()) * 2.3, a: random() * TAU }));
  const trails = points((i, o) => {
    if (random() < 0.012) {
      o[0] = gauss() * 0.012;
      o[1] = gauss() * 0.012;
      o[3] = 1;
      return;
    }
    const s = stars[(random() * stars.length) | 0];
    const f = random();
    const a = s.a + f * 0.3;
    o[0] = Math.cos(a) * s.r;
    o[1] = Math.sin(a) * s.r;
    o[2] = (random() - 0.5) * 0.05;
    o[3] = f * f * f;
  });

  // Dawn at Saltmere: the horizon, the sun (risen by scrolling) and its path of light on the sea.
  const sunrise = mix(
    [points((i, o) => { o[0] = random() * 2 - 1; o[1] = gauss() * 0.004; }), 0.16],
    [points((i, o) => {
      const r = Math.sqrt(random()) * 0.3;
      const a = random() * TAU;
      o[0] = Math.cos(a) * r;
      o[1] = Math.sin(a) * r;
      o[3] = 1;
    }), 0.4],
    [points((i, o) => {
      const y = -Math.pow(random(), 1.5) * 0.6 - 0.025;
      o[0] = gauss() * (0.04 + Math.abs(y) * 0.42);
      o[1] = y;
      o[3] = random() < 0.3 ? 1 : 0.4;
    }), 0.44],
  );

  // The terminus clock: dial and ticks, then the hour, minute and second hands (pointing up).
  const hand = (from, to, width) => points((i, o) => {
    o[0] = gauss() * width;
    o[1] = from + random() * (to - from);
    o[2] = 0.01;
  });
  const clock = mix(
    [points((i, o) => {
      const pick = random();
      if (pick < 0.3) {
        const a = random() * TAU;
        const r = 0.92 + gauss() * 0.008;
        o[0] = Math.cos(a) * r;
        o[1] = Math.sin(a) * r;
      } else if (pick < 0.62) {
        const a = (((random() * 60) | 0) / 60) * TAU;
        const r = 0.8 + random() * 0.06;
        o[0] = Math.cos(a) * r;
        o[1] = Math.sin(a) * r;
      } else if (pick < 0.95) {
        const a = (((random() * 12) | 0) / 12) * TAU;
        const r = 0.66 + random() * 0.2;
        const side = gauss() * 0.014;
        o[0] = Math.cos(a) * r - Math.sin(a) * side;
        o[1] = Math.sin(a) * r + Math.cos(a) * side;
      } else {
        const a = random() * TAU;
        const r = Math.sqrt(random()) * 0.035;
        o[0] = Math.cos(a) * r;
        o[1] = Math.sin(a) * r;
        o[3] = 1;
      }
    }), 0.5],
    [hand(-0.08, 0.48, 0.022), 0.13],
    [hand(-0.1, 0.74, 0.015), 0.15],
    [points((i, o) => {
      if (random() < 0.55) {
        o[0] = gauss() * 0.006;
        o[1] = -0.18 + random() * 0.72;
      } else {
        const a = random() * TAU;
        const r = Math.sqrt(random()) * 0.06;
        o[0] = Math.cos(a) * r;
        o[1] = 0.6 + Math.sin(a) * r;
      }
      o[2] = 0.02;
      o[3] = 1;
    }), 0.12],
  );

  return {
    palettes: {
      // [base, accent, alpha, glow (0 ink on a light sky, 1 light on a dark one), fog colour, fog amount]
      dusk: { light: ['#2a2160', '#d9821f', 1, 0.05, '#ffffff', 0.22], dark: ['#bfc6ff', '#ffc46b', 0.95, 0.9, '#8b7fc7', 0.14] },
      station: { light: ['#9aa4e8', '#ffcf7a', 0.95, 1, '#9a7aa8', 0.12] },
      line: { light: ['#a9b8ff', '#ffc46b', 0.9, 1, '#6f7fc7', 0.1] },
      cabin: { light: ['#c9b6ff', '#ffcf8a', 0.9, 1, '#a07a5a', 0.1] },
      snow: { light: ['#d6defa', '#ffd27f', 0.92, 1, '#7d8cff', 0.12] },
      sky: { light: ['#7f8fd6', '#ffffff', 0.95, 1, '#5d4bb0', 0.08] },
      dawn: { light: ['#2a4f6a', '#e8833f', 0.95, 0.1, '#ffffff', 0.12], dark: ['#8fb7d9', '#ffb070', 0.9, 1, '#6a5a8a', 0.1] },
      clock: { light: ['#2a2540', '#d9542b', 0.95, 0.05, '#fff6e0', 0.12], dark: ['#e8e2d0', '#ff7a4a', 0.9, 0.9, '#6a6a80', 0.1] },
      moonlit: { light: ['#f5ecd6', '#ffc46b', 0.95, 0.9, '#8b7fc7', 0.1] },
    },
    motions: {
      // The route's travelling lights keep to the line as they run along it.
      along: { k: [0.12, 0, 0, 0], glsl: `
        float x = wrap(p.x + t * k.x * (0.6 + 0.8 * r.y));
        p.y += ${CURVE_GLSL('x')} - ${CURVE_GLSL('p.x')};
        p.x = x;
        lit *= smoothstep(1.0, 0.9, abs(x)) * (0.55 + 0.45 * sin(t * 3.0 + r.x * 30.0));` },
      // Lights outside the window: each row at its own speed, nearer rows faster, inside the frame.
      passing: { k: [0.16, 0.6, 0, 0], glsl: `
        float lane = hash(floor(p.y * 40.0) + 3.7);
        float x = mod(p.x + t * k.x * (0.35 + lane * 1.3) + k.y, 2.0 * k.y) - k.y;
        p.x = x;
        lit *= smoothstep(k.y, k.y - 0.1, abs(x)) * (0.5 + 0.5 * lane);` },
      // The carriage rocks a little, side to side.
      rock: { k: [0.025, 1.1, 0.008, 0], glsl: 'p.xy = rot2(p.xy, sin(t * k.y) * k.x); p.y += sin(t * k.y * 2.0) * k.z;' },
      // A small lit train crossing below the ridge.
      crossing: { k: [0.05, -0.12, 0, 0], glsl: `
        float x = wrap(p.x + t * k.x);
        p.y += ${RIDGE_GLSL('x')} + k.y;
        p.x = x;
        lit *= smoothstep(1.0, 0.85, abs(x));` },
      // The sun clears the horizon as the section scrolls through; below the sea it is hidden.
      rise: { k: [-0.36, 0.14, 0, 0], glsl: 'p.y += mix(k.x, k.y, smoothstep(0.15, 0.75, prog)); lit *= smoothstep(-0.01, 0.03, p.y);' },
      // A railway clock from 21:40: the minute hand jumps once a minute, the second hand
      // sweeps the dial in 58.5 s and waits at the top.
      clock: { k: [0, 0, 0, 0], glsl: `
        float part = floor(w / 2.0);
        float a = 0.0;
        if (part > 2.5) a = min(mod(t, 60.0) / 58.5, 1.0);
        else if (part > 1.5) a = (40.0 + floor(t / 60.0)) / 60.0;
        else if (part > 0.5) a = (9.0 + (40.0 + t / 60.0) / 60.0) / 12.0;
        p.xy = rot2(p.xy, -6.28318 * a);` },
    },
    shapes: {
      nightline: {
        build: mix([train, 0.8], [move(moon, { x: 0.6, y: 0.36, scale: 0.26 }), 0.2]),
        motion: [{ use: 'flow', k: [-1, 0, 0, 0.16], part: 0 }, { use: 'sway', k: [0.18, 0.35], part: 1 }],
        view: [-0.2, 0.08],
        palette: 'dusk',
      },
      platform: { build: platform, motion: [{ use: 'flow', k: [0, 0, -1, 0.16] }], view: [0, 0.22], palette: 'station' },
      route: { build: route, motion: [{ use: 'along', part: 1 }, { use: 'pulse', k: [2.4, 0.4], part: 0 }], palette: 'line' },
      window: { build: cabin, motion: [{ use: 'passing', part: 1 }, { use: 'rock' }], view: [0.12, 0.04], palette: 'cabin' },
      snowline: { build: snowline, motion: [{ use: 'drift', k: [-0.3, -1, 0, 0.1], part: 1 }, { use: 'crossing', part: 2 }], view: [0, 0.1], palette: 'snow' },
      trails: { build: trails, motion: [{ use: 'spin', k: [0, 0, 0.035] }], settle: false, palette: 'sky' },
      sunrise: { build: sunrise, motion: [{ use: 'rise', part: 1 }, { use: 'flutter', k: [0.015, 1.6, 9], part: 2 }, { use: 'twinkle', k: [0.6, 2.2], part: 2 }], palette: 'dawn' },
      clock: { build: clock, motion: [{ use: 'clock' }], palette: 'clock' },
      moon: { build: moon, motion: [{ use: 'sway', k: [0.2, 0.45] }, { use: 'pulse', k: [3, 0.5] }], palette: 'moonlit' },
    },
  };
};
