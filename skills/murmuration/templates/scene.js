/*
 * A scene file: everything that makes a site's particles its own. Load it before the engine:
 *   <script src="scene.js" defer></script><script src="murmuration.js" defer></script>
 *
 * THIS FILE IS A FORMAT SAMPLE. Every palette, shape and motion below is a placeholder named
 * example-*. Design the real ones from the subject (references/motion.md) and delete these;
 * a page that ships an example-* shape has skipped the design step.
 *
 * The scene is a function of the kit, which returns { palettes, motions, shapes }.
 *   kit.svg({ view, paths, accent, stroke, depth })  SVG paths, filled (or stroked)
 *   kit.text({ text, font, depth })                  a word or two, in a loaded font
 *   kit.points((i, out, random, count) => {...})     any form at all: set out[0..3] = x, y, z, w
 *   kit.mix([builder, share], ...)                   several parts in one shape (part k: w += 2k)
 *   kit.move(builder, { x, y, z, scale })            place a part
 *   kit.random(), kit.gauss(), kit.N                 seeded randomness and the particle count
 * Shapes live in about -1..1 (y up, z toward the viewer). w's whole part / 2 is the particle's
 * part; the rest (0..1) is how much it takes the palette's accent colour.
 */
window.MURMURATION_SCENE = (kit) => {
  const { random, gauss, points, svg, text } = kit;

  return {
    // [base, accent, alpha, glow (0 = ink on a light sky, 1 = light on a dark sky), fog colour, fog amount]
    palettes: {
      'example-ink': { light: ['#2b2f6b', '#c98a1e', 1, 0.04, '#ffffff', 0.3], dark: ['#b4bcff', '#ffd27f', 0.95, 0.9, '#7f93c7', 0.14] },
      'example-night': { light: ['#9fb1ff', '#ffe2a8', 0.9, 1, '#6f82b5', 0.1] },
    },

    // Motions the site writes itself, in GLSL. Each may change p (the particle), lit (its
    // brightness) and acc (its accent), from w, r (four random numbers), t (seconds), k (the
    // motion's four numbers) and prog (0 as its section enters the screen, 1 as it leaves).
    motions: {
      'example-sonar': { k: [12, 2.4, 0, 0], glsl: 'lit *= 0.45 + 0.55 * pow(0.5 + 0.5 * sin(length(p.xy) * k.x - t * k.y), 3.0);' },
    },

    shapes: {
      // A placeholder mark: a triangle with an accent dot.
      'example-mark': {
        build: svg({ view: 48, paths: ['M24 6 43 40H5Z'], accent: [{ cx: 24, cy: 30, r: 4 }] }),
        motion: [{ use: 'sway', k: [0.22, 0.5] }],
        palette: 'example-ink',
      },
      // A placeholder word.
      'example-word': {
        build: text({ text: 'Your word', font: '600 150px system-ui, sans-serif' }),
        motion: [{ use: 'flutter', k: [0.015, 0.9, 4] }],
        palette: 'example-ink',
      },
      // A placeholder field: a disc of dots, with rings of light running outward.
      'example-dots': {
        build: points((i, o) => {
          const a = random() * Math.PI * 2;
          const r = Math.sqrt(random());
          o[0] = Math.cos(a) * r;
          o[1] = Math.sin(a) * r;
          o[2] = gauss() * 0.02;
          o[3] = random() < 0.08 ? 1 : 0;
        }),
        motion: ['example-sonar'],
        view: [0, 0.5],
        palette: 'example-night',
      },
    },
  };
};
