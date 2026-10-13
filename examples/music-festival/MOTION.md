# Lowtide: motion brief

Read this before changing how anything on the page moves.

## The brief

1. **Signature:** a 3D bay built in code (Three.js, no models). Scroll takes the tide out across rippled sand. As the sea goes out it uncovers the Ring, a 26 m ring of light standing on piles on the flats, and the dance floor around it. The camera drops from the dunes to crowd height and climbs back. At the end the flood returns at dawn.
2. **Why this subject:** the festival's verb is the ebb. The sea walks out about a kilometre and the party happens on the sand it leaves ("we dance where the sea was"). The second verb is the kick: at 124 BPM it pulses the Ring, the beams and the crowd, and it sends rings across the water and the wet sand.
3. **Intensity:** 9 of 10 (Bold tier). It is a festival, and the brief asked for bold, loud and animated.
4. **Supporting moves (four, and nothing else moves):**
   - the header mark's waterline rises and falls with the tide on the page;
   - the LOWTIDE letters surface from a waterline on load, in under a second;
   - the lineup rows sway sideways with scroll, like a crowd;
   - the tide chart draws itself as it comes into view.
5. **What drives it:** scroll sets the tide height, the time of day and the camera's stop for each section. The scene holds between sections and makes each hop in about 0.6 s. A fine pointer leans the camera by up to 2°. Touch screens get nothing extra, because the scene keeps moving on its own. Time runs the waves and the 124 BPM kick, and the **Pause the beat** button freezes both.
6. **At rest:** with reduced motion, each section shows a still frame: no kick, no waves, and the scene snaps from stop to stop instead of scrubbing. Without WebGL or JavaScript, each section has its own CSS sky and an SVG drawing of the Ring (at high water, at night under its beams, and in the dawn flood). Every section reads as finished.

**Clichés stepped around:** for music, equaliser bars, an audio-reactive blob, a synthwave grid sun and a neon laser grid; for beaches, palm trees and surfboards. The Ring and its beams are the festival's own stage, not stock rave imagery. The loud part is the tide plus the kick.

## The journey

| Section | What it says | What moves (the scene) | Sky: light theme / dark theme |
|---|---|---|---|
| Hero: high water | LOWTIDE · 27–29 Aug 2027 · Merrow Sands. Three nights on the sand the sea gives back. Tickets. | The camera stands on the dunes. The sea is high around the Ring's piles, with sun glitter and swash on the beach. Readouts float beside the Ring. | golden afternoon / night with stars |
| Ebb | How it works. Every evening the sea walks out 1.2 km; the floor opens; the horns sound at the flood. | The tide drops and the flats come up wet and mirror-bright. The camera lowers. In the light theme the setting sun sits inside the Ring. | sunset / night |
| Lineup | Three nights, with headliners and full bills. | The camera stands at crowd height behind the crowd, which has filled the dry flats. The beams are on and the kick pulses. | blue hour / night |
| Tides | The tide sets the times: a chart and a table. | A wide, high view of the dry flats: the Ring, the crowd, the lamp line to the shore and the sea far out. | night |
| Beach | Getting there, camping, safety, access, the numbers. | The camera climbs over the dunes and looks back at the Ring. | night |
| Tickets | Three tiers, with tier 1 sold out. | The flood comes back and the Ring stands in the water at dawn. | dawn / before dawn |

Night sections (lineup, tides, beach) stay night in both themes and keep their own ink.

## Timing tokens

The page uses only these; they are defined once on `:root` in `styles.css`.

```css
--beat: 484ms;                              /* 124 BPM: the kick */
--dur-hover: 420ms;                         /* hover and press: a spring */
--ease-spring: cubic-bezier(.34, 1.56, .64, 1);
--dur-rise: 520ms;                          /* LOWTIDE letters surfacing on load: 6 x 70 + 520 = 940 ms, under a second */
--stagger: 70ms;                            /* between letters; short headlines only */
--dur-settle: 600ms;                        /* the scene's hop between section stops */
--dur-tide: 900ms;                          /* the header mark's waterline */
--ease-out: cubic-bezier(.16, 1, .3, 1);
```

Reveals are scrubbed by scroll (the lineup sway and the tide chart), so they have no duration. Loops are allowed but stop when the tab is hidden or the beat is paused.

## Assumptions (nobody was asked)

- The name, dates, place, lineup, prices, tide times and every number are placeholders I invented. The footer says so. Replace them before launch.
- Fri 27 to Sun 29 August 2027, the next late-August weekend. Merrow Sands is a fictional west-facing tidal beach. Prices are in pounds.
- The Ring, a stage on the tidal flats that only opens around the evening low tide, is my concept to make the name literal. The Dunes stage runs all day.
- Visitors are mostly on phones, so the scene has a phone plan: a lighter crowd, a lower pixel ratio, the camera centred, and the text above the action.
- Both themes are provided. The light theme follows the real day (afternoon, sunset, night, dawn); the dark theme stays at night.
- There are no photographs, video or 3D models, so everything 3D is built from primitives and shaders. There is no fake photography.
- No sound. It would be opt-in, after a tap, if it were ever added.
- The buy buttons point to `#tickets` until a ticketing link exists.

## Building and hosting

- Three.js r170 is vendored in `vendor/` (MIT, licence alongside). `bay.js` loads it through an import map.
- Fonts come from Google Fonts (Archivo with its width axis, and DM Mono). Self-host them before launch if the festival makes privacy promises.
- Serve over http (`python3 -m http.server`). ES modules do not run from `file://`, and there the page falls back to its drawings, which are still complete.
- Files: `index.html`, `styles.css`, `site.js` (theme, story value, sway, chart, pause), `bay.js` (the 3D bay), `vendor/`.
