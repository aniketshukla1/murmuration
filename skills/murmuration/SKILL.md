---
name: murmuration
description: Designs and builds cinematic, motion-rich websites in plain HTML, CSS and JS with no build step. It reads the project, interviews the user about the site they picture (or, told to just build, decides and states its assumptions), finds the subject's verb and chooses a motion language for it instead of reusing one effect, with real 3D built in code by default (a 3D object or small world made from primitives, a particle cloud that re-forms per section, a globe with routes, a scroll-scrubbed image sequence, a shader field, a generative canvas, physics, line drawing, kinetic type, depth layers, pinned chapters, cursor reveals and more), then builds it with real content, fallbacks and screenshot checks. Use when someone asks for a 3D, immersive, cinematic or animated website or landing page, a site that should feel "exceptional" or "like an Awwwards site" or like a reference site they name, scroll-driven animation, WebGL or Three.js scenes, particles, a shader background or an image sequence.
license: MIT
compatibility: Any agent that reads SKILL.md. Self-checks need a shell with Node 22+ and a Chromium-family browser; contact sheets need Python 3 with Pillow.
metadata:
  author: Aniket Shukla and contributors
  source: github.com/aniketshukla1/murmuration
---

# Murmuration

A page is one journey, and how it moves should come from what it is about. A night train glides, a crane lifts, ink bleeds, a ledger balances. This skill interviews the user until it can see the site they picture, decides the page's motion language (one signature technique and a few quiet supporting moves), and builds it in plain HTML, CSS and JS. Many small things moving as one is the idea behind the name; the particle cloud is one technique among many, not the default.

## Needs

```yaml
requires:
  - binary: node      # scripts/shoot.mjs (Node 22+, built-in WebSocket)
  - binary: python3   # scripts/sheet.py, with Pillow (pip install pillow)
```

Screenshots also need Chrome, Chromium, Edge or Brave. `scripts/shoot.mjs` finds them in their usual places on macOS, Linux and Windows; set `CHROME_PATH` for any other location. The site itself needs no framework, no bundler and no CDN; a technique that genuinely needs a library (a 3D scene needs Three.js) loads one ES module through an import map.

## Workflow

Do these in order. Each step names the reference to load at that point.

0. **Read the project, then interview the user.** If there is a project (code, docs, brand files, assets), read it first and summarise what you learned in a few lines. Then ask questions shaped by their prompt and the project, in two short rounds (the vision, then what is real: assets, story, visitors, must and must not), then offer two or three genuinely different directions and let them choose. Skip it when they say "just build it" or nobody can answer; then state the assumptions and write them into `MOTION.md`. Load `references/interview.md`.
1. **Write the motion brief.** Read the subject for its verbs, its assets, its tone and the one thing the page asks for. Choose the signature technique and two to four supporting moves, and write the five-line brief (signature, why this subject, supporting moves, what scroll and pointer drive, the still at rest). Load `references/motion-language.md`, then `references/catalogue.md` for the techniques. No code before the brief.
2. **Find the journey.** Write the sections as `section → what it says → what moves → sky`. The journey comes from the subject's own world (a day, a route, a season, a build), and every moving thing stands for something the section is about. Load `references/concept.md`.
3. **Start the page.** Copy `starter.html`, `starter.css` and `site.js`, then mount the signature technique: the particle engine (`murmuration.js` with a new `scene.js`, load `references/particles.md`), the image sequence (`sequence.js`), the shader field (`shader-bg.js`), or the catalogue's recipe for anything else.
4. **Build the sections.** Real content first in every section (copy, product, numbers, cards), then the motion. Each section must look finished with the motion removed. Give each moving part a drawn stand-in for browsers without WebGL.
5. **Add the supporting moves** the brief named, and only those: header mark, reveals, counters, statement fill, pointer light, marquees, glass, grain. Load `references/techniques.md` and `references/effects.md`.
6. **Verify with your own eyes**, every time: both themes, a desktop window, a short window (1000×520), a phone (390×844), reduced motion, no WebGL, the in-between scroll positions, and one pass in a real GPU browser. Then check the result against the brief and against this skill's examples. Load `references/verify.md`.
7. **Publish.** For a sandboxed preview (a chat app's artifact or canvas), inline the scripts in order; for real hosting, self-host fonts and libraries. Load `references/hosting.md`.
8. **Carry it into the app** if there is one. Load `references/react-native.md`.
9. **Hand over.** Open with one sentence: what moves, and why it belongs to this subject (its verb). Then, briefly: the signature and the subject's verb it comes from, the intensity, the supporting moves, what you verified (which screenshots, which modes) and what you could not, and how to open the site. Point to `MOTION.md` for the full brief.

## Rules

Each rule closes a failure that looks fine in a quick check and breaks for a real visitor.

- **Ask before you build.** A site built on guesses comes out generic. Interview first (`references/interview.md`); every option you offer is about the user's subject, and "you decide" is always one of them.
- **Motion is chosen, never defaulted.** The signature comes from the subject's verbs and assets, written in the brief. A particle hero because the template has one, or a shader because it is easy, is the failure this skill exists to prevent.
- **The signature is real 3D unless the user asks for flat.** This skill exists for cinematic sites, so the signature is a WebGL scene with depth, light and a moving camera (an object, a small world, or particles in depth), built from the subject, in code when there is no model. The subject's verbs decide *what* is 3D; the tone decides how calmly it moves (a bank's 3D is slow and exact), never whether it exists. A 2D idea (a line drawing, kinetic type, data) can still carry a chapter or a supporting move. Choose a flat signature only when the user asks for one or the site must not use WebGL, and say so in the brief.
- **Never reuse the examples.** The demo, the example scene and the catalogue's "seen on" sites illustrate the method. Their shapes, motions, section orders and looks are not parts to copy. A shape or motion named `example-*` must not ship.
- **A reference site gives a principle, not a look.** "Like unitedcarriers.com" means, for example, descending from orbit to the ground as you scroll; it does not mean a dotted globe in the same blue.
- **One signature per page.** Two only when the story changes world, and never two loud techniques in one viewport.
- **Two to four supporting moves, named in the brief; everything else stays still.** A page with eight effects (a marquee, a countdown, bouncing hovers, equaliser bars, a pulsing sun…) is the generic page this skill exists to replace.
- **Assets decide what is shown, not whether there is 3D.** Without renders there is no image sequence, and without a model there is no 3D of the client's own product: ask for it, or show something else. Everything else can be built in code: a 3D scene made of primitives (boxes, cylinders, lathed and extruded shapes, instanced repeats, a shader surface) needs no asset. Never fake product imagery.
- **Every section must look finished with the motion removed.** Motion is a layer over real content, never the content. A heading plus an animation reads as empty to anyone whose browser blocks WebGL or prefers reduced motion.
- **Hold, don't race.** Something must be formed on every screen, at every scroll position, not only when a section is centred; moving things settle within about 0.6 s when scrolling stops. Never leave a scene mid-transition exactly where someone stops to read.
- **Text wins.** Moving things dim or move aside behind headings and body text.
- **The page is complete at rest.** Nothing waits at `opacity: 0` for an observer. Counters rest on the real number. Headline load animations finish within a second; an intro never blocks the content.
- **Reduced motion shows the finished still** of every technique: no loops, no scrubbing, no autoplay.
- **Stacking for a fixed scene layer.** Sections are `position: relative` with no `z-index` and no `isolation`; content wrappers are `z-index: 1`; the layer is the last child of `<body>`, `position: fixed; z-index: 0`. Paint an opaque box that must sit under the scene as a `.backdrop` sibling of the content.
- **Never reuse a decorative class as a modifier.** The failure shape: `.sun` is a 980px glow, so a chip given `.chip.sun` paints a 388px disc over the hero. Name decorations and tone modifiers distinctly (`.sunlight`, `.tone-sun`).
- **Check extracted icons.** Extract library icons by evaluating the library's data object, never with a line regex; allow digits in sprite ids; assert that every `<use>` resolves and each symbol has as many elements as its source.
- **Never write a WebGL pixel whose colour is brighter than its alpha.** GPU compositors such as Chrome on a Mac drop it, while software rendering in headless screenshots shows it. Output `vec4(color * a, a)`; get glow from additive blending inside the canvas.
- **Shaders must compile everywhere.** Never name a GLSL variable after a reserved word: `half`, `fixed`, `input`, `output`, `filter`, `sample`, `common`, `active`, `long`, `short`, `double`, `class`, `this`, `template`. One of them makes Chrome reject the whole shader, and the scene renders without that material (a sea with no water). In the verify pass, any console line with `Shader Error` fails the build.
- **Light and dark are different materials.** On a light sky, moving marks are ink: crisp, opaque, normal blending. On a dark sky they are light: soft and additive. Sections that are night in the story stay night in both themes.
- **Budget.** One signature technique animating at a time; at most three live WebGL contexts; anything that runs every frame stops off screen; device pixel ratio capped at 1.75 to 2.
- **Chromium-only effects are an extra layer.** At last check, refraction through `backdrop-filter: url(#filter)` drew nothing in Safari and Firefox, and cross-document View Transitions ran only in Chromium and Safari (caniuse.com has the current state). The page must be whole without them.
- **Gate scroll-driven CSS** in `@supports (animation-timeline: view())`; outside the gate nothing may be hidden.
- **Native scroll.** Never smooth or hijack the page's scroll in JS; it breaks find-in-page, anchor links and assistive technology.
- **Sound is opt-in**, after an explicit tap, never on load.
- **Sandboxed previews:** a chat preview (an artifact or a canvas) may not run separate script files. Inline the scripts before `</body>` for the preview build, and keep separate files for the real site.

## Files

| Path | What it is |
|---|---|
| `templates/starter.html`, `starter.css` | A page skeleton: header, hero, content sections, statement, numbers, closing card, footer, light and dark tokens, the stacking rules. No motion technique is wired in. |
| `templates/site.js` | Theme toggle with view transition, play-on-enter, count-up, scroll-fill text, `--p` on `[data-progress]`, pointer light, parallax. |
| `templates/murmuration.js` | The particle engine: shapes, motions and arrivals come from the site's scene file; hold and settle, fog, quiet zones, reduced motion. |
| `templates/scene.js` | The scene file format, with `example-*` placeholders that must be replaced. |
| `templates/sequence.js` | An image sequence scrubbed by scroll in a pinned stage, loading coarse to fine. |
| `templates/shader-bg.js` | A full-bleed shader behind one section (mesh, grain, aurora, rays, metal, dither, halftone, ascii): half resolution, draws only while visible. |
| `templates/layered-mark.tsx` | React Native: a logo drawn as layered depth, moved by a motion written for the brand. |
| `scripts/shoot.mjs` | Headless screenshots at scroll stops, timed frames, any Chrome flags, the particle scene's debug readout; prints console errors. |
| `scripts/sheet.py` | Combines screenshots into one contact sheet. |
| `references/*.md` | Loaded at the workflow steps above. |

## Feedback on this skill

If the user has feedback on the method itself, offer to draft an issue for github.com/aniketshukla1/murmuration, after searching its existing issues for the same problem. If the problem is the agent not following these rules, acknowledge it and correct the work instead.

Murmuration: Aniket Shukla and contributors | MIT
