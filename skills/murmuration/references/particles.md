# Particles: one cloud, re-formed for each section (templates/murmuration.js)

Use this technique when the brief chose it (`motion-language.md`). The engine has no shapes of its own: the site's scene file defines every shape, its idle motion and how particles travel into it. Copy `templates/murmuration.js` unchanged and write a new `scene.js` for the subject; `templates/scene.js` shows the format with placeholders that must not ship.

## Design the shapes and motions

For each section, from the motion brief:

1. **The thing.** One thing from the subject's world that the section is about, made of many small parts: lit windows, a flock, seed heads, a route with stops, a dial, the sun on water, a word. Avoid symbols that belong to every subject (a sphere, a wave, a grid of dots) unless the subject itself is that.
2. **How it moves when held.** The subject's verb: carriages glide, snow drifts, a dial ticks, a fern unfurls, a crowd sways. Use a built-in motion when it is exactly that verb; otherwise write one (below).
3. **How particles arrive.** A transition that fits the story beat: `sweep` for arrival from one side, `stream` for something poured or travelled, `scatter` for a burst, `spiral` for something turning, `flock` for many moving as one, `drift` (the default) for a loose gathering.
4. **What scroll does.** Motions get `prog` (0 as the section enters, 1 as it leaves): a sun that rises, a plan that completes, lights that come on.

Write the table at the top of `scene.js`: section, shape, motion, arrival. Every row should be impossible to move to another brand's site.

## The scene file

```js
window.MURMURATION_SCENE = (kit) => ({
  palettes: { name: { light: [base, accent, alpha, glow, fog, fogAmount], dark: [...] } },
  motions: { name: { k: [4 defaults], glsl: '...' } },
  shapes: {
    name: { build, motion: [up to 3], view: [yaw, pitch], palette, size, settle, reach },
  },
});
```

- `palettes`: colours as hex. `glow` 0 is ink on a light sky (crisp, normal blending); 1 is light on a dark sky (soft, additive). Give `dark` only when it differs; night sections use the same entry in both themes.
- `shapes[name].build`: from the kit (below).
- `motion`: a name, or `{ use, k, part }`. `k` overrides the motion's four numbers; `part` limits it to one part of a mixed shape.
- `view`: a fixed turn of the shape, in radians.
- `size`: point size multiplier. `settle: false` for shapes that fill their section (a sky) and should not be clamped. `reach: [low, high]` overrides the vertical extent the engine measures from the points.

## The kit

| Builder | Makes |
|---|---|
| `kit.svg({ view, paths, accent, stroke, depth })` | filled SVG paths (or stroked, with `stroke` > 0); circles in `accent` take the accent colour |
| `kit.text({ text, font, depth })` | a word in a font the page has loaded |
| `kit.points((i, out, random, count) => …)` | any form: set `out[0..3]` to x, y, z, w |
| `kit.mix([builder, share], …)` | parts in one shape; part k's particles get `w += 2k` |
| `kit.move(builder, { x, y, z, scale })` | place a part |
| `kit.random()`, `kit.gauss()`, `kit.N` | seeded randomness, the particle count |

Shapes live in about −1..1 with y up and z toward the viewer; the engine centres SVG and text shapes and scales their longer side to −1..1. `w`'s whole part divided by 2 is the particle's part; the rest (0..1) is how much it takes the accent colour. Build repeating things (a train of windows, a row of lamps) so the pattern divides the −1..1 span evenly if a `flow` motion will wrap it.

## Motions

Built in: `sway`, `spin`, `breathe`, `flow` (rigid, wraps in −1..1 along a direction), `drift` (each particle at its own speed, wraps, with a little sideways wander), `orbit`, `swell`, `flutter`, `twinkle` (brightness), `pulse` (accent brightness), `lift` (moves with `prog`). Their four numbers are in the comments in `murmuration.js`.

A custom motion is GLSL that may change `p` (the particle, vec3), `lit` (brightness) and `acc` (accent mix), given `w`, `r` (four random numbers, vec4), `t` (seconds), `k` (vec4) and `prog`. Helpers: `rotX`, `rotY`, `rot2`, `hash(float)`, `wrap(x)` (into −1..1). For example, hands of a clock rotating by part:

```js
clock: { k: [0, 0, 0, 0], glsl: `
  float part = floor(w / 2.0);
  float a = part > 2.5 ? min(mod(t, 60.0) / 58.5, 1.0) : 0.0;
  p.xy = rot2(p.xy, -6.28318 * a);` },
```

When a motion needs the same curve the builder used (a route, a ridge), write the curve once in JS and once in GLSL with the same constants, as a small function that returns the expression string.

## Anchors

| Attribute | Values | Meaning |
|---|---|---|
| `data-shape` | a key of the scene's shapes | which shape |
| `data-palette` | a key of the scene's palettes | colours (defaults to the shape's palette) |
| `data-fit` | contain (default), width, height, cover, long | how size comes from the anchor box; `long` turns the shape vertical when the box is tall |
| `data-scale` | number | multiplier on that size |
| `data-hold` | `anchor` | scroll away with the anchor instead of waiting on screen; use it where the shape must line up with content (a route over its stop cards) or where content would cover a waiting shape |
| `data-enter` | drift, sweep, scatter, stream, spiral, flock | how particles travel into this shape |

Place the anchor as an empty, absolutely positioned `div` where the shape belongs. Hidden anchors (`display: none`) drop out at that width. Give every section people stop on an anchor.

## How it works

- 14,000 particles on desktop and 6,500 on small or low-core devices, in one draw call. Every shape is built once into a float texture; the vertex shader reads the two shapes in play by `gl_VertexID`, so the number of shapes is limited only by memory. WebGL2 is required; without it the page shows its drawn stand-ins.
- **Hops:** while the edge between two sections is on screen, each section keeps its shape and particles cross in proportion to how much of the next section shows. Each hop takes about 0.6 s, so nothing hangs mid-air when scrolling stops.
- **Settle:** a shape in play stays inside the visible part of its section, using its measured vertical reach. A shape that fits the screen but not the visible part is centred on that part; one taller than the screen keeps at least a band showing.
- **Quiet zones:** particles dim to 28% behind headings, `.lead` text and `[data-quiet]` blocks (up to four on screen at once).
- **Blending:** colour is always valid premultiplied colour; palettes with `glow` above 0.5 blend additively inside the canvas.
- **Fog:** a second, tiny canvas of value noise, coloured per palette.
- **Pointer:** particles within about 95 px of a fine pointer are pushed aside by up to 26 px; off on touch and under reduced motion.
- **Reduced motion:** time stands still (motions hold one pose), hops snap, the scene redraws only on scroll.
- **Debug:** `?debug-scene` puts the pair, the arrival, the target and both frames on `window.__scene`; `scripts/shoot.mjs` prints it with `DEBUG=1`.
