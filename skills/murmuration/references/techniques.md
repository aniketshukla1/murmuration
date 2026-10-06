# Techniques

Each one is in the templates or described here well enough to build. Use the ones the concept calls for.

## The 3D header logo (CSS only)
Give the mark a motion of the brand's own: a moon that waxes and wanes (an SVG mask whose shadow circle slides), a stamp that inks, a dial that ticks, a needle that settles. One way to make any flat mark read as solid: five copies stacked in a `perspective` box with `transform-style: preserve-3d`, each `translateZ` 1.3px deeper and a shade darker (`color-mix` with black), turned a little in 3D. Choose the motion from the brief; a turning stack is not a default.

## Boxes under the particles
A card with an opaque gradient (a closing call to action, a night panel) would hide the particles. Paint the box as `.backdrop`, absolutely positioned inside the section with `top/bottom: var(--pad)` and left/right `max(var(--gutter), calc((100% - var(--page)) / 2))`, and keep the content in `.wrap` over it.

## Skies per section
Use CSS gradients on the sections, chained so neighbouring sections share an edge colour. Interludes carry the big changes (day to dusk to night, night to dawn). Decorations such as a sun glow, a moon, clouds or CSS starfields are absolutely positioned with no z-index, so they paint under the particles.

CSS starfield: three pseudo-element tiles of `radial-gradient(circle at x y, #fff 0 1px, transparent 1.6px)` at 241, 389 and 619px, each twinkling out of step. It costs nothing and needs no JS.

## Instrument tags
Small dark boxes with mono uppercase text and a status dot, floating beside the hero object: "1,847 M · HIGHEST POINT", "06:20 · ARRIVES". Use real units from the product.

## The statement that fills in
A large paragraph with `data-fill`. `site.js` wraps each word, and words turn from `--ink-3` to `--ink` as the paragraph crosses the screen. At rest it is fully readable; the fill only adds emphasis.

## Giant numbers on hairlines
A 2×2 grid with 1px rules. Each cell has a number (display face, ~8rem, `white-space: nowrap` so "10–20" never wraps), a small unit, and one sentence. Numbers count up when they enter view and rest on the real value.

## Chips and cards that show the product working
- Chips around a phone: an icon tile, a strong line and a small line, floating with a 7-second bob at staggered delays.
- Cards: a checklist with ticks that pop in sequence, a seat grid of dots that light up, a before-and-after track with dots that slide. Mark illustrative data "Example".

## Buttons with a knob
A pill with the label and a white 40px circle holding the arrow. The circle rotates −45° on hover.

## Drawn stand-ins for browsers without WebGL
Draw each moving thing's still in SVG or CSS and hide it under `.has-scene` (or the technique's own live class): a route as a dashed line with its stops, a dial with its hands, the sun as a disc on a horizon, a platform's lamps in perspective. The stand-in is the page's rest state, so it should look intended, not like an error.

## Pointer light (patterns seen on 21st.dev)
- **Card spotlight:** `site.js` adds `.spot` to cards and sets `--sx`/`--sy`. CSS layers `radial-gradient(340px circle at var(--sx) var(--sy), var(--spot-light), transparent 62%)` over the card's own background. Use `background-image` only, so the card keeps its colour and no positioning changes.
- **Border beam:** `.beam::after` is a conic gradient of `--beam-angle`, a registered `@property` animated through 360°. It is masked to a 1.5px ring with `mask-composite: exclude`, so light runs round the card's edge. Use it on one or two key cards only.
- **Button sheen:** a 110° white band crosses `.button-primary` in the last quarter of a 6-second loop, under `overflow: hidden`.
- **Phone tilt:** phones in a stage lean toward the pointer, `perspective(1000px) rotateY(var(--tx)·9°) rotateX(var(--ty)·−7°)`. A glass highlight (`::after` linear gradient, `background-position` driven by `--tx`) slides across the screen.
- **Horizon:** a 160vw circle filled with the next section's colour sits mostly below the band. Its box-shadow rim (a thin bright line, then two wide warm glows) is a sunrise over the curve of the earth.
- **Footer wordmark:** the brand name at about 19rem. Use transparent text with a 1px stroke and `background-clip: text` over a radial glow that follows the pointer (`--fx`/`--fy`). It fills the footer and rewards a hover.

More effects, written up in `references/effects.md`: shader backgrounds (mesh and grain gradients, aurora, light rays, liquid metal, dither, halftone, ASCII), liquid-glass, holographic and liquid-metal buttons, kinetic type (scramble, word-by-word reveal, text on a path, a gallery heading, the cloud spelling a word), pinned chapters, a torch reveal and film finishes. Also an italic serif accent word inside a grotesque headline, and a magnifying dock. Use one only when it fits the subject.

## Theme toggle
An inline boot script in `<head>` sets `data-theme` from `localStorage` before paint and adds `.js`. The toggle sets `data-theme` on `<html>` inside `document.startViewTransition` when available. Tokens are defined in three places: the bare `:root` for light, `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`, and `:root[data-theme="dark"]`.

