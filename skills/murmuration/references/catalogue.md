# Catalogue: signature motion techniques

The loud thing a page is remembered by. Choose one with `motion-language.md`; quiet supporting moves are in `effects.md` and `techniques.md`. Each entry says what the technique is, which subjects it fits, how to build it without a framework, what it costs, and what the page shows at rest. "Seen on" names public sites where the idea can be studied: take the principle, never the look, code or assets.

Libraries: the default is plain HTML, CSS and JS with no build step. Where a technique genuinely needs a library (a 3D model needs a glTF loader), load one ES module through an import map, vendored next to the page for real hosting, and say so in the brief.

## Scenes and objects

### 1. A particle cloud that re-forms
- **What:** thousands of points, fixed behind the page, that take a different shape per section and stream between them as you scroll. Shapes, idle motions and transitions are designed for the subject.
- **Fits:** subjects made of many small things (stars, snow, seeds, sparks, crowds, data points, lights in windows), night and sky imagery, brands without product photography.
- **How:** `templates/murmuration.js` with a scene file written for the site. Load `particles.md`.
- **Cost:** one WebGL2 canvas; 6,500 to 14,000 points.
- **At rest:** each section's drawn stand-in (SVG or CSS) when WebGL is missing; shapes held still under reduced motion.

### 2. A 3D object
- **What:** one object rendered with weight: a product turning toward the pointer or under drag, a hero object relit section by section, a configurator, a camera moving through real depth as you scroll.
- **Fits:** products that have a model (shoes, watches, devices, furniture, cars, bottles); with no model, any object from the subject's world that can be built from primitives (a frame, a vessel, a stack, a tool, a machine part, a building); architecture; collectibles.
- **How:** Three.js as an ES module through an import map, `GLTFLoader` (with Draco if the model is compressed), one environment light plus one key light, tone mapping. Render on demand: only when the camera, pointer or scroll changes. Scroll drives a single number (0 to 1) that the camera, light and materials read. For a few flat faces (cards, boxes, a device lid), CSS 3D transforms are enough and need no library.
- **How, with no model:** build it in code: `BoxGeometry` and `CylinderGeometry` for parts, `LatheGeometry` for turned shapes, `ExtrudeGeometry` for profiles, `InstancedMesh` for repeats, `MeshStandardMaterial` lit by `RoomEnvironment` through `PMREMGenerator`. Animate the subject's verb on the scroll number: the object assembled piece by piece, filled, turned, opened, loaded. Map both entry points, pinned, so addons resolve: `{"imports": {"three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}` (vendor both for real hosting).
- **Make it look made, not default:** ACES tone mapping and sRGB output; one warm key light and a cool fill; fog matched to the page background so the object sits in the page, not in a box; a soft contact shadow under it; materials with roughness (wood, ceramic, steel, paper), never plain shiny plastic; a slow camera that lands on a framed composition at each section and holds while text is read.
- **Cost:** model weight (aim under 2 MB compressed), a WebGL context, loading time; show a still render until the model is ready.
- **At rest:** the finished object held still under reduced motion; without WebGL, a rendered or drawn (SVG) still of it.
- **Seen on:** Oryzo (the product travels through Z depth as you scroll), Scout Motors (cinematic vehicle configurator).

### 3. A 3D world or flythrough
- **What:** a small world the visitor moves through: a camera on a spline driven by scroll, a landscape under fog, a tiny planet to drive around, rooms that open one by one.
- **Fits:** places (resorts, estates, parks), games, campaigns, portfolios that want play.
- **How:** Three.js; a `CatmullRomCurve3` for the camera path, `getPointAt(progress)` and a look-at target ahead on the same curve; fog and baked lighting instead of real-time shadows; instanced meshes for repeats. With no models, build the world from primitives and instancing (terrain from a displaced plane, water from a shader surface, repeated buildings, trees or crates as instanced boxes and cones), lit and finished as in 2.
- **Cost:** the heaviest technique. Needs a strong art direction and a phone plan (a shorter path, fewer objects).
- **At rest:** a sequence of stills, one per stop on the path, as a normal scrolling page.
- **Seen on:** Explore Primland (aerial flythrough), Messenger (a tiny planet to deliver on), Bruno Simon's portfolio (a world to drive through).

### 4. A globe or a map with routes
- **What:** the world as dots, contours, hexagons or ink, with arcs or lines drawing between places; or a flat map where a route draws itself as you scroll.
- **Fits:** logistics, airlines, shipping, travel, global teams, climate, supply chains.
- **How (globe, no library):** points on a sphere from a land mask (sample a small equirectangular PNG of land in a canvas; keep pixels that are land), orthographic projection `x = cos(lat) sin(lon - lon0)`, `y = cos(lat0) sin(lat) - sin(lat0) cos(lat) cos(lon - lon0)`, drawn front-facing only (`z > 0`), on a 2D canvas or as WebGL points. Routes are great-circle arcs (spherical interpolation, lifted by `sin(πt)` for height), drawn progressively with scroll. **How (flat map):** an SVG map; the route a `<path>` drawn with `stroke-dashoffset` (see 10).
- **Cost:** light; a 2D canvas handles a few thousand dots.
- **At rest:** the globe or map fully drawn, routes complete.
- **Seen on:** unitedcarriers.com (a dotted globe with glowing routes and port labels).
- **Avoid the cliché:** a deep-blue globe of dots with glowing arcs is what this whole category already looks like. Unless the user asks for it, give the world a material from the subject: contour lines like a nautical chart, an engraved or inked atlas, meridians only, night-side city lights with routes as light trails, a flat chart whose route is ruled in pencil. The route and the camera can still do the storytelling.

### 5. An image sequence scrubbed by scroll
- **What:** frames of a rendered or filmed moment drawn to a canvas by scroll position: a product assembling or exploding, a crane lifting, a pour, a door opening, a flower blooming.
- **Fits:** physical products, machines, processes, food and drink, anything with a moment worth slowing down.
- **How:** `templates/sequence.js`. A pinned stage (`position: sticky`) inside a tall section; scroll progress picks the frame; frames load first-and-last, then every eighth, then the rest, so scrubbing works early. 60 to 150 frames, WebP or AVIF, about 1600 px wide.
- **Cost:** bandwidth (keep the whole set under about 6 MB); frames must exist (renders, or a video exported to stills).
- **At rest:** the most telling frame as a normal image.
- **Seen on:** unitedcarriers.com (a crane and a truck), Apple product pages.

### 6. Video
- **What:** a muted background loop; a video that plays forward and back with scroll; video seen through type or a mask.
- **Fits:** places, food, fashion, sport, hospitality, events: subjects whose motion is real footage.
- **How:** `<video muted playsinline loop autoplay preload="metadata" poster>`; pause when off screen (IntersectionObserver). For scroll-linked playback, encode every frame as a keyframe (`ffmpeg -i in.mp4 -an -vf scale=1600:-2 -c:v libx264 -x264-params keyint=1 -crf 24 out.mp4`) and set `currentTime` from progress in `requestAnimationFrame`; short clips only. Video in type: `mix-blend-mode: screen` on white text over the video inside a black block, or `mask-image` with an SVG text mask.
- **Cost:** bandwidth; offer a lower bitrate on small screens (`<source media>`).
- **At rest:** the poster; paused under reduced motion and when Save-Data is on.

## Surfaces and fields

### 7. A shader field
- **What:** a full-bleed fragment shader: mesh or grain gradients, aurora, light rays, liquid metal, dither, halftone, ASCII, fluid, volumetric light; or a photo distorted by a displacement shader on hover.
- **Fits:** mood-led brands (fragrance, music, wellness), AI and software without a product image, editorial covers.
- **How:** `templates/shader-bg.js` for the programs it ships; write a new program in the same shape for anything else. Recipes in `effects.md`.
- **Cost:** one canvas at half resolution; draws only while visible.
- **At rest:** a CSS gradient in the same colours; one still frame under reduced motion.
- **Seen on:** Unicorn Studio's effect library (distortion, lighting, fluid, aurora) shows the range.

### 8. A generative canvas
- **What:** a drawing that grows or flows by rule: flow fields of thin lines, branching growth, contour lines from noise, falling sand, rain on glass, cellular patterns.
- **Fits:** nature, science, research, wellness, weather, data and AI.
- **How:** a 2D canvas with `globalAlpha` trails (draw a translucent background each frame for fading strokes), value noise for fields, a fixed seed so the same visitor sees the same drawing. Tie growth to scroll progress so the drawing completes as the section is read.
- **Cost:** CPU per frame: cap agents (a few thousand) and stop when off screen.
- **At rest:** the finished drawing, pre-rendered on load without animating.

### 9. Physics
- **What:** things with weight: tiles, letters or products that fall and stack, bounce off the pointer, hang on ropes or flutter as cloth.
- **Fits:** playful brands, toys, food and candy, games, team pages, campaigns.
- **How:** Verlet integration for ropes and cloth (positions, previous positions, three constraint passes a frame); circles and boxes with simple impulse collisions for falling things; DOM elements positioned from the bodies with `transform`. Start it when the section enters view.
- **Cost:** keep bodies under a few hundred; sleep bodies at rest.
- **At rest:** the settled arrangement, laid out statically.
- **Seen on:** Victor Furuya's portfolio (scroll as a playable instrument).

## Drawing and type

### 10. Line drawing
- **What:** lines that draw themselves: plans, routes, signatures, diagrams, constellations, a product's outline; SVG masks that open onto full-screen images.
- **Fits:** architecture, engineering, craft, education, maps, editorial.
- **How:** give each path `pathLength="1"`, `stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--p))`, and set `--p` from scroll (site.js's `[data-progress]`) or a view timeline inside the `@supports` gate. Mask reveals: an SVG `<mask>` whose circle or shape scales with progress over a full-bleed image.
- **Cost:** almost none.
- **At rest:** every line fully drawn.
- **Seen on:** Codrops' SVG mask transitions on scroll.

### 11. Type as the image
- **What:** the headline is the visual: oversized type that splits into lines rising into place, letters that stretch and snap with scroll speed, variable-font weight and width that respond, words that scramble or flip, rows of marquee type, text filling as it is read.
- **Fits:** agencies, editorial, fashion, events, manifestos, portfolios, any brand whose voice is the product.
- **How:** recipes in `effects.md` (Kinetic type). Split into lines by wrapping words in spans and grouping by `offsetTop` after fonts load; re-split on resize. Keep the real text in the DOM and readable at rest.
- **Cost:** layout work on resize; avoid animating `font-variation-settings` on long passages.
- **At rest:** the type, set and still.
- **Seen on:** Lando Norris (oversized type driving the story), Mat Voyce (letters stretch and recombine on scroll).

### 12. Illustration in motion
- **What:** drawn characters and objects that move like drawings: frame-by-frame loops, rigged SVG parts, collage pieces sliding in, hand-made wobble.
- **Fits:** children's brands, food, indie products, education, studios with a drawn identity.
- **How:** SVG groups animated with CSS (`transform-box: fill-box`), frame-by-frame with a sprite sheet and `steps()`, a boiling-line wobble with an animated `feTurbulence` displacement. For complex character animation exported from a design tool (Rive, Lottie), load its player as the one dependency.
- **At rest:** the key pose.
- **Seen on:** Charmer Studio (hand-made, character-led motion).

## Space and structure

### 13. Depth layers
- **What:** a scene cut into planes (sky, far hills, near trees, foreground) that move at different rates; or the camera pushing through the layers as you scroll.
- **Fits:** travel, illustration, storytelling, children's brands, landscapes, hospitality.
- **How:** layers in a `perspective` container, each at its own `translateZ`, the container moved by scroll; or per-layer `translateY(calc(var(--p) * speed))`. On phones, tilt from `deviceorientation` only after a tap grants permission.
- **At rest:** the flat composite.

### 14. Pinned chapters
- **What:** a stage that stays while its content changes: features one by one, a process in steps, a timeline; a horizontal track; a hero that zooms out into the page; planes that tilt with scroll speed.
- **Fits:** software, product launches, processes, histories, case studies.
- **How:** sticky stage, progress variable and chapter switching (recipes in `effects.md`, Scroll choreography).
- **At rest:** every chapter readable as a normal list.

### 15. Image transitions
- **What:** photographs that hand over to each other with intent: wipes, blinds, iris, doors, pixel dissolves, a displacement melt; macro photography to drag around.
- **Fits:** fashion, jewellery, real estate, food, portfolios: subjects told in photographs.
- **How:** `clip-path` or `mask-image` animations on stacked images (blinds: several masks staggered; iris: a circle; doors: two halves); a WebGL displacement shader for melts; for drag to explore, a large image moved by pointer with inertia (speed times 0.95 each frame).
- **At rest:** each image in place.
- **Seen on:** Bulgari's Emerald Strata (drag to explore macro photography with chapters).

## Interaction and pacing

### 16. Cursor-led
- **What:** the pointer reveals: a torch over a hidden layer, geometry uncovered under the cursor, a cursor that labels what it hovers, links whose letters scramble.
- **Fits:** portfolios, galleries, mysteries, luxury details. Desktop-first by nature.
- **How:** recipes in `effects.md` (Pointer and light). Keep the system cursor or replace it with something at least as visible; give touch a deliberate alternative (a drag, a slow drift).
- **Seen on:** Hubtown (the cursor uncovers a monolith's geometry and light), unitedcarriers.com (cursor labels).

### 17. Page choreography
- **What:** how the site arrives and moves between pages: an intro that counts or draws, page transitions that keep a shared element, menus that open like curtains.
- **Fits:** multi-page brand sites, studios, portfolios, launches.
- **How:** cross-document View Transitions with `@view-transition { navigation: auto; }` and `view-transition-name` on shared elements (Chromium and Safari 18.2+ at last check; others navigate normally). An intro shows only on the first visit (sessionStorage), lasts under 1.5 s and never blocks content.
- **Seen on:** By-Kin and Uncommon Studio (transitions as camera moves; a continuous surface).

### 18. A mechanic
- **What:** one verb the visitor performs to advance: hold to continue, drag to assemble, a small game, a word puzzle, a score, sound that answers.
- **Fits:** campaigns, launches, fashion stories, games, sponsorships.
- **How:** keep it to one verb; every state reachable by keyboard; a skip link; sound only after an explicit tap.
- **Seen on:** Max Mara's The Jacket Circle (a word game as the story), Santioni Spirits (hold to advance).

### 19. Data in motion
- **What:** numbers and charts that build: lines that draw, bars that grow, counters, tickers, live maps.
- **Fits:** fintech, analytics, climate, reports, public data.
- **How:** SVG charts drawn with the line-drawing recipe; counters that rest on the real value; values from the real dataset, labelled "Example" when illustrative.
- **At rest:** the finished chart with its numbers.
