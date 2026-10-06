# Effects: what the best component libraries do, rebuilt without a library

Patterns studied on threeui.com, reactbits.dev, magicui.design, ui.aceternity.com, animate-ui.com, vengenceui.com and shaders.paper.design, written as recipes for plain HTML, CSS and JS. Copy no code or assets from those sites: they are under their own licences, and some are paid. Take the idea, write it small.

## Choose before you build

- **One loud effect per screen.** The signature technique from the motion brief is it. Everything here supports it; never two loud effects in one viewport.
- **Quiet effects support reading:** grain, a glow ring on the one primary button, a word-by-word reveal, a torch over one image. Pick two or three, not ten.
- **Each effect must:** look finished at rest (nothing waits at `opacity: 0`), hold still under reduced motion, keep a fallback where a browser lacks the feature, and stop drawing when off screen.
- **Native scroll only.** Never move the whole page in JS to smooth it: it breaks find-in-page, anchor links and assistive technology. The particle hold already gives the calm.

## Shader backgrounds (one canvas, one fragment shader)

Put a `<canvas>` absolutely inside the section, draw a full-screen triangle (`[-1,-1, 3,-1, -1,3]`) and do everything in the fragment shader. Render at half the CSS size (cap about 960px wide) and let CSS stretch it, as the fog does. Draw only while the section is visible (IntersectionObserver), free the context with `WEBGL_lose_context` once the section is more than a screen away, draw one frame and stop under reduced motion, and leave a CSS gradient on the element for browsers without WebGL. Output opaque colour, or valid premultiplied colour if the canvas is transparent.

The heart of each look:

- **Mesh gradient:** four colours on slow Lissajous orbits, weighted by `1 / (0.03 + d²)`, over a plane warped by fbm. Add ±1% hash noise per pixel so the blend never bands.
- **Grain gradient:** fbm through a four-stop ramp, plus per-pixel hash grain re-seeded about 24 times a second.
- **Aurora:** two or three layers, each with a wavy baseline `y0(x)`. With `h = y − y0`, a curtain is `smoothstep(0., .025, h) * exp(-h * k)`: a sharp lower edge that fades upward. Multiply by vertical streaks, `fbm(vec2(x * 7., y * 1.5 − t))`.
- **Light rays:** take the angle from a source just above the frame; shafts are `pow(noise(vec2(angle * 8., t)), 2.5)` plus a finer octave, faded with distance. Let the pointer lean the source a little.
- **Liquid metal (chrome):** `0.5 + 0.5 * sin(q.x * 3. + q.y * 2. + fbm(q) * 4.5)` over a warped plane, through a dark → mid → bright ramp, plus speculars `pow(smoothstep(.82, 1., v), 5.)`.
- **Dither:** a Bayer 8×8 threshold on drifting noise, in two inks, drawn in chunky cells with `image-rendering: pixelated`. `bayer2(a) = fract(a.x / 2. + a.y * a.y * .75)`; each larger matrix is `bayer(a / 2.) * .25 + bayer2(a)`.
- **Halftone:** rotate the pixel coordinate 45°, find its cell, sample the field at the cell's centre, and size the dot as `sqrt(value) * .5` so its area tracks the value. A second ink, offset, gives riso.
- **ASCII field:** cells of six pixel units holding 5×5 glyphs from light to dark (` . : - + = * # @`), chosen by the field's density. Pack each glyph into two floats (rows 0 to 2, and rows 3 to 4) and read a bit with `mod(floor(n / exp2(b)), 2.)`, which works in WebGL 1 where bitwise operators do not.
- **CRT:** only when the subject is a screen. Scanlines, a slight barrel warp of the coordinates, and a vignette.

Text over a shader needs calm under it: keep headings on the quiet part of the field, or lay a soft scrim behind the text block.

## Surfaces and buttons

- **Liquid glass:** frost as the default, `backdrop-filter: blur(14px) saturate(1.6)`, with a 1px inner rim (`inset 0 1px 0 rgba(255,255,255,.5)`), a top-left specular radial gradient, and a faint chromatic edge (a conic gradient masked to a 1px ring). Real refraction, `backdrop-filter: url(#lens)` with `feTurbulence` or a displacement-map image into `feDisplacementMap`, rendered only in Chromium at last check: Safari and Firefox drew nothing at all for that declaration (caniuse.com has the current state). So add it only behind a Chromium check (`'userAgentData' in navigator`) and keep the frost for everyone else. For a lens that bends at the edges, build the displacement map from a radial gradient at the element's size, with red and green as the x and y offsets.
- **Holographic foil:** a conic gradient of four to six hues, rotated by the pointer (`from calc(var(--px) * 1turn)`), blended with `color-dodge` over a dark base. Add a 110° glare band that follows the pointer and a sparkle mask of tiny radial dots, and tilt the card toward the pointer as in the phone tilt.
- **Liquid-metal pill:** a registered `@property --angle` turning `conic-gradient(from var(--angle), #8d939c, #f4f6f8, #5c616a, #e9edf2, #8d939c)` through a full turn over about six seconds, a dark inset rim and a dark label.
- **Glow ring (the "AI thinking" button):** the border beam with a multi-hue conic gradient, plus a copy of it blurred 16–24px behind as a halo. Pulse the halo only while something is working.
- **Magnetic button:** within about 80px of the pointer, move the button by 0.3 of the offset and its label by 0.15, and spring back with `transition: transform .4s cubic-bezier(.2,.8,.2,1)`. Fine pointers only.
- **Click ripple:** on `pointerdown`, add a span at the point that scales from 0 to 2.4 and fades over 600 ms, then remove it.
- **Hold to confirm:** a fill that grows over 800–1200 ms while pressed, masked by a dot pattern so it reads as dithered; letting go early cancels it. Enter and Space confirm at once, so keyboard users never have to hold.
- A shimmer or star border is the sheen and beam already in `techniques.md`. Do not add a second.

## Kinetic type

- **Scramble (decrypt):** each frame, letters not yet resolved show random glyphs; resolve left to right over about 600 ms, once, when the line enters view or on first hover. The real text stays in the DOM at rest and in `aria-label`.
- **Word-by-word reveal on scroll:** wrap words (characters only for short display lines) in spans with `--i`. Inside `@supports (animation-timeline: view())`, give each `animation-timeline: view()` and `animation-range: entry calc(var(--i) * 3%) cover 35%`. Outside that block nothing is hidden. Chrome 115+ and Safari 26+ run it; at last check Firefox kept it behind a flag (caniuse.com/css-scroll-driven-animations has the current state), so the gate is required.
- **Glitch:** two copies of the text from `data-text` in `::before` and `::after`, offset ±2px in cyan and magenta with `mix-blend-mode: screen`, cut by `clip-path: inset()` slices that change every 120 ms during 400 ms bursts a few seconds apart. None under reduced motion.
- **Riso or halftone heading:** fill the text with `radial-gradient(circle, currentColor 38%, transparent 41%) 0 0 / 6px 6px` under `background-clip: text`, and add a second ink as an offset copy (`mix-blend-mode: multiply`, 2px out of register).
- **Text on a path:** SVG `<textPath href="#curve">` over a doubled string, with `startOffset` animated by `<animate attributeName="startOffset" from="0%" to="-50%" dur="20s" repeatCount="indefinite"/>` so it loops without a seam. A circle path makes a rotating badge.
- **Weight that follows the pointer:** per-letter spans whose `font-variation-settings: 'wght'` moves from 300 to 800 as the pointer comes within about 160px. It needs a variable font; update in `requestAnimationFrame`.
- **Gallery heading:** a large heading inside a `transform-style: preserve-3d` stage, with N image cards on a cylinder (`rotateY(i × 360° / N) translateZ(r)`), the ring tilted `rotateX(-12deg)` and turning once every 40–60 seconds. Heading and cards share one 3D context, so cards pass in front of the words and behind them. Pause on hover; hold still under reduced motion.
- **The cloud spells a word:** when the signature is the particle cloud, a `kit.text` shape in the scene (`particles.md`) in the display face, fitted with `data-fit="width"`, with a motion of its own.

## Scroll choreography

- **Cinematic chapters:** a section `N × 100vh` tall holding a `position: sticky; top: 0; height: 100vh` stage. JS sets `--p` (0 to 1) from the section's rect, and `data-chapter`; chapters cross-fade over 300 ms and a thin rail shows progress. Every chapter must read well when scrolling stops anywhere inside it.
- **Horizontal track:** the same sticky stage, with the track at `translateX(calc(var(--p) * (100vw - 100%)))`. On phones, fall back to a plain vertical list.
- **Velocity marquee:** a duplicated row moved by CSS. JS reads scroll speed and sets `--skew` (±6°) and the speed; both return to rest within 300 ms.
- **Device that opens:** a laptop lid from `rotateX(-80deg)` to `0` across its section's view timeline, screen content fading in, inside the same `@supports` gate.
- **Edge blur:** four to six stacked `backdrop-filter: blur()` layers, each masked to its own band of a linear gradient, so the blur deepens toward the edge, under a fixed header.

## Pointer and light

- **Torch:** a dark layer with `mask-image: radial-gradient(220px circle at var(--mx) var(--my), transparent 0, #000 70%)` reveals what lies under it (a blueprint under a photo, the night city under the day one). On touch, centre it and let it drift slowly.
- **Image trail:** inside one section, each time the pointer has moved 80px, place the next image of a set at the pointer and fade and shrink it over 700 ms. At most eight at once.
- When the signature is the particle cloud, it already parts around the pointer (`particles.md`). Do not add a second cursor effect on top.
- Keep the system cursor. A custom cursor that hides it costs more than it adds.

## Film and print finishes

- **Grain:** an SVG `feTurbulence` (`baseFrequency` 0.8, three octaves) as a data-URL background on a fixed layer at 6–10% opacity, `mix-blend-mode: overlay`, jumping position eight times a second. Still under reduced motion.
- **Vignette:** a fixed `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.35))`.
- **Chromatic split:** on hover, three stacked copies of an image filtered to red, green and blue channels, offset by 2–3px with `mix-blend-mode: screen`.

## 3D stages without a 3D library

- **Product on a pedestal:** an ellipse floor with a soft radial shadow, a spotlight cone from above (a conic gradient, blurred), the product image tilted toward the pointer, and a reflection with `-webkit-box-reflect: below 0 linear-gradient(transparent 70%, rgba(255,255,255,.18))` where supported.
- **One hero, relit through the story:** the same hero shot in several lights (dawn, noon, dusk, night), stacked and cross-faded per section or chapter. The section palettes already change with the story; the hero follows them.
- **3D marquee:** a grid of cards in a `perspective: 1200px` stage at `rotateX(55deg) rotateZ(-45deg)`, columns moving at different speeds.
- **Drag gallery:** the gallery-heading ring with images, turned by dragging (`rotateY += dx × 0.2`) and coasting to a stop (multiply the speed by 0.95 each frame).
- **Cloth or rope (optional):** Verlet points on a 2D canvas with gravity and three constraint passes a frame, for a flag or a hanging badge. About 60 lines; use it only when the subject calls for it.

## More from component libraries

- **A book that opens:** pages as cards in a `preserve-3d` spine, each turning `rotateY(-180deg)` about its left edge in turn as the section scrolls; the back face carries the next spread (`backface-visibility: hidden` on both faces).
- **A perspective grid floor:** repeating lines (`linear-gradient` in both directions) on a plane at `rotateX(70deg)` that moves toward the viewer by animating `background-position`; fade it with a mask toward the horizon.
- **Displacement on hover:** an SVG `feTurbulence` into `feDisplacementMap` on a photo, its `scale` raised on hover and eased back; or a small WebGL plane for a stronger melt. Keep the photo legible at rest.
- **A radial intro or menu:** items placed on a circle (`rotate(a) translate(r) rotate(-a)`) that fan out from the trigger in a short stagger and fold back on close.
- **A flip card:** two faces in a `preserve-3d` card, turned `rotateY(180deg)` on hover, focus or tap, with the back face's text readable to assistive technology either way.
- **A gravity well:** a canvas of dots that lean toward the pointer (or a fixed point) by inverse distance and spring back, for a "pull" the subject can claim (a black hole, a magnet, a marketplace).

## Budget

- At most one signature animating on screen; three live WebGL contexts at most.
- Anything that runs every frame stops when off screen.
- Under reduced motion: no loops, scrambles, glitches or marquee movement, and every effect shows its final state.
