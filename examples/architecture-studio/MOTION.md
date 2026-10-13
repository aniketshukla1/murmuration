# Atelier Brenner: motion brief

## Assumptions (no interview: the user asked for decisions, not questions)

- Atelier Brenner is five people: three architects, a timber engineer and a master carpenter, with a drawing room and a workshop in Kempten (Allgäu), southern Germany. The town, the people's names, the projects, the figures and the email address are **placeholders** to be replaced with the studio's own.
- No brand assets exist (no logo, photographs, drawings or models). The mark, palette, type and copy are new. The 3D house is a **type study built in code** and is captioned as one; it never stands in for a photograph of a real project.
- Visitors are families planning a house and parishes or municipalities commissioning a small public building, on desktop and phone in roughly equal numbers. The page asks for one thing: **start a project** (write to the studio).
- Light and dark themes both ship; the evening sections stay night in both.
- English copy, with one German word kept and explained (Richtfest, the topping-out).
- "Tasteful motion" sets the intensity at 4 (Quiet tier).
- Fonts load from Google Fonts and Three.js r170 from jsDelivr through an import map. Vendor both next to the page for real hosting.

## Brief

1. **Signature:** a 3D timber house built in code (Three.js, primitives only), raised as you read. On load its five bents swing up off the deck one after another. Scrolling sets the purlins and the ridge (with a small spruce tied to it for the Richtfest), stands the wall panels up, lowers the roof on, runs the larch battens up the walls and sets the glass, then carries the finished house from first light to a lamp-lit night. The camera keeps verticals vertical, as an architectural photographer's shift lens does, and lands on a framed view for each section.
2. **Why this subject:** a timber building's verb is *raise*. Its frame is cut in the workshop, raised bent by bent in a couple of days and topped out with a tree. The category's cliché is a white massing model turning on a plinth, or a blueprint grid that draws itself. Here the building is made, member by member, in the studio's own material, under the light of one working day.
3. **Intensity:** 4 of 10 (Quiet tier). Nothing loops and nothing bounces. The scene renders only while something changes.
4. **Supporting moves (three):**
   - the header mark is a bent whose two rafters swing up and meet at the ridge, once, on load;
   - the hairlines of the project index and the numbers are ruled from left to right as they come into view (scroll-driven CSS, gated; drawn at rest);
   - the material statement fills in word by word as it is read.
5. **What drives it:** scroll picks the stage (the section under the middle of the screen) and the scene eases there in about 0.6 s, then holds. Between two sections it is always one stage or the other, never in between. On a wide screen the copy is always on the left and the house always holds the right-hand window, so text and house never meet while one section hands over to the next. A fine pointer leans the camera by about a degree. Touch gets the same stages without the lean. On phones the house sits in the top 40 % of the screen; each section opens on a clear view of it, then its text on a frosted panel.
6. **At rest:** under reduced motion each section cuts to its finished stage (no travel, no intro raise). Without WebGL, or if the module fails to load, the hero shows an axonometric line drawing of the raised frame (dimensioned, like a drawing sheet) and the closing section shows an elevation of the finished house at night with its windows lit. The same drawing shows while Three.js loads, then cross-fades into the scene. Every section is complete without the scene.

## Journey (one raising day)

| Section | What it says | What moves (scene stage) | Sky |
|---|---|---|---|
| Hero `#top` | timber houses and small public buildings, drawn to the last peg | the five bents swing up off the deck; camera low, front-left | first light |
| Practice `#practice` | how a building comes to stand: walk, draw, cut, raise | purlins drop in, the ridge last, the Richtfest tree on top; camera at the gable, looking down the row of bents | morning |
| Houses `#houses` | houses for one family | floor laid, wall panels stood up, roof lowered on; camera front-right | midday |
| Public `#public` | small public buildings | larch battens run up the walls, glass goes in, the tree comes down; camera high, from behind | afternoon |
| Interlude `#evening` | the finished house at sundown | low red sun, the lamps come on; a straight front elevation | dusk |
| Material `#timber` | wood grows back; the numbers | moonlight, windows lit | night |
| Studio `#studio` | five people, one long table | close at the gable, lit windows | night |
| Contact `#contact` | bring us your site | the house small and lit below the ask | night, stars |

## Timing

```css
:root {
  --dur-hover: 180ms;      /* buttons, links, the knob */
  --dur-reveal: 360ms;     /* the statement's words, the stand-in handing over to the scene */
  --dur-mark: 720ms;       /* the header bent, once */
  --ease-out: cubic-bezier(0.22, 0.8, 0.24, 1);
  --stagger: 40ms;         /* the mark waits four of these before its rafters rise */
  /* scene (frame.js): a critically damped spring, omega 10, settles in about 0.6 s;
     the load raise takes about 0.8 s; pointer lean at most 1.2 degrees */
}
```

## Files

- `index.html`: the page, its content and the two drawn stand-ins.
- `styles.css`: tokens (light, dark, night), layout, the stacking rules for the fixed scene layer.
- `site.js`: theme toggle and the statement fill (trimmed from the skill's template).
- `frame.js`: the Three.js scene: geometry, stages, lighting, the spring and the render-on-demand loop. The ground takes each section's page colour (`--fog`), so the house sits on the page in both themes.
- `favicon.svg`: the mark.

## Checked

Headless Chrome (`shoot.mjs`): every section at 1440×900 in light and dark, 1000×520 with in-between stops, 390×844, no WebGL, reduced motion, the load raise in timed frames, and the scroll-driven gate switched off. A real GPU browser (Chrome on Apple M1 Pro, Metal): the night sections, the theme toggle. No console errors or shader errors in any run.
