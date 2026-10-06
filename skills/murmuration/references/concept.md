# Concept: find the journey before writing code

A cinematic site is a sequence, not a stack of sections. Decide the sequence first. A page that skips this step ends up as nice effects with nothing holding them together, which reads as AI-made even when every part is well built.

## 1. Name the journey

Take it from the subject's own world, never from a stock theme:

- A night train: the city at dusk, the route through the night, the sleeping cabin, a mountain pass, a sky with no city in it, the sea at dawn.
- A logistics or travel firm: a route from origin to destination, with each leg a section.
- An observatory or science museum: dusk, the first stars, a planet up close, deep sky.
- A tool for builders: from a blank site to a finished building, floor by floor.
- A food brand: field, harvest, kitchen, table.

Write it out as a table before building:

| Section | What it says | What moves | Sky |
|---|---|---|---|
| Hero | the thesis | the signature, at its most telling | dawn |
| How it works | the steps | the signature moves on a step, or a quiet reveal | morning |
| … | … | … | … |

Everything that moves must stand for the section's own idea. Motion chosen because it looks nice (a random torus, a generic glow) is decoration. The motion has to tell the story.

## 2. Pick one bold moment

The signature from the motion brief (`motion-language.md`) is the boldness. Keep everything else quiet: one display face used with restraint, a supporting face for small labels, generous space. Do not add a second loud effect, such as a cursor trail or a heavy marquee, on top of the signature.

## 3. Give every section real content

The commonest failure is an "empty" section: a big heading over a shape, and nothing else. Each section needs at least one of:

- a product shot, with two floating chips that state real numbers from the product
- a card that shows the product working (a checklist, a mini dashboard, a before-and-after), marked "Example" if the data is illustrative
- giant numbers on hairlines, each with one plain sentence
- a list of real items (the practices, the services, the steps)

Then add the shape behind or beside that content.

## 4. Light, dark and night

Plan both themes from the start. Sections that are night in the story (a night interlude, a "calm" section) stay dark in both themes and carry their own ink. Interludes, the text-light bands between day and night, are where the sky changes. Put no body text where the gradient is mid-tone.

## Patterns worth borrowing

These come from studying sites people point to as exceptional (getlayers.ai, unitedcarriers.com). They are patterns; copy none of those sites' content.

- **Morphing particle objects:** an orb that opens into a galaxy, then gathers into something new, all one cloud.
- **A low-resolution shader canvas** (about 128×150 pixels) stretched to full screen, for soft cinematic fog that costs almost nothing.
- **Thin display type** at very large sizes, with small mono uppercase labels for navigation and tags.
- **A 3D hero object with floating tags** beside it, set like instrument readouts (a dark box with mono text and a status dot).
- **A statement that fills in as you scroll:** words move from a muted ink to full ink as they are read.
- **Giant numbers separated by thin rules**, each with a one-line caption.
- **Pill buttons with a round knob** holding the icon.
- **Glass panels** with a 1px inner light edge.
- From component libraries such as 21st.dev:
  - a spotlight that follows the pointer across cards
  - a beam of light running round a card's border
  - a sheen across buttons
  - a horizon glow
  - a giant footer wordmark that lights up under the pointer
  - 3D tilt on product shots
  - an italic serif accent word in a sans headline
- From threeui.com (Three.js sections and landing pages):
  - **cinematic chapters:** a pinned stage whose scene changes chapter by chapter
  - **one hero, relit through the story:** the same object at dawn, noon, dusk and night
  - **a gallery heading:** a ring of work orbiting through a large heading
  - **a product on a pedestal** under a spotlight, turning toward the pointer
  - **the call to action as the shader moment** (a liquid-glass or liquid-metal button) on pages without a particle cloud

Recipes for all of these are in `effects.md`.

## Where to look for more

Galleries, component libraries and guidelines worth studying are listed in `study-a-reference.md`, with how to read a reference site without copying it.
