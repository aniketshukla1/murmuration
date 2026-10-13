# Ember & Ash: motion brief

Read this before changing how anything on the page moves.

## Assumptions (no interview: the user asked for decisions, not questions)

- Ember & Ash is a small roastery with one drum roaster. It roasts once a week, on Tuesday, and posts everything it roasted by Thursday, so a bag lands about three days off roast. No brand assets exist: the mark, palette, type, copy and the roaster itself are made here.
- Visitors are home brewers who buy beans online, about half on phones. The page asks for one thing: **order this Tuesday's roast** (a single bag or a subscription).
- Every name, figure and price is a **placeholder** to replace with real ones: the three coffees and their prices, Bristol and the street address, 12 kg batches, 72 h, "since 2019", the roast times and temperatures, and the example roast profile.
- The order deadline (Monday 23:59) and the dates on the page (next roast, post-by) are computed in the browser from today's date. Without JavaScript the page says "every Tuesday" instead.
- Light theme is **Ash** (warm ash-grey paper, the machine as a dark object on it); dark theme is **Ember** (charcoal, the burner and the porthole glow). The statement band is night in both.
- Three.js r170 is vendored in `vendor/` (MIT). Fonts load from Google Fonts (Instrument Serif, Hanken Grotesk, IBM Plex Mono); self-host them for production.

Questions I would have asked: what the first five seconds should feel like (warm and hand-made, quiet luxury, precise like a lab); whether there is photography of the coffees, the roaster or the people; the real coffees, prices and shipping area; whether subscriptions exist; whether the roaster has a name or a colour people know it by.

## Brief

1. **Signature:** a 3D drum roaster built in code (Three.js, primitives only): oxblood enamel, a brass hopper, a steel cooling tray, and a round glass porthole in the drum front where one Tuesday batch tumbles. Scroll follows that batch through one morning: the burner lit at 06:00, the camera pushing in to the porthole while the beans turn from green to straw to cinnamon to brown (each roast step holds its colour), the door dropping them into the cooling tray where the arms sweep them, and at the close the burner out and the machine standing still until next Tuesday.
2. **Why this subject:** the roastery's verbs are *roast* and *drop*, once a week, and its promise is time: roasted Tuesday, posted the same week. So the scene is one batch on one morning, with real times and temperatures beside it. "Ember & Ash" is the burner and the chaff, so a few embers rise from the burner in the dark theme and flakes of chaff in the light one. **Cliché avoided:** steam curling off a cup and coffee beans floating in space. There is no cup and no steam, and the beans appear only inside the machine that changes them.
3. **Intensity: 5 of 10 (Standard tier).** Premium means calm and exact: the camera eases and then holds, the drum turns at a steady pace, nothing bounces or loops for show.
4. **Supporting moves (four):**
   - the header mark (a porthole with its bed of beans and an ember) turns once on load: the ring draws, the bed rolls up the wall and settles, the ember flares (under a second);
   - the roast profile curve draws itself step by step as the roast is read;
   - the night statement fills in word by word as it is read;
   - the giant footer wordmark warms like an ember under the pointer.
5. **What drives it:** scroll picks the stage (hero, roast, drop, close) and, inside the roast, the step; the scene eases to it and settles within about 0.6 s, so it is never mid-move where someone stops to read. The drum turns and the beans tumble while the scene is on screen (paused off screen and in hidden tabs); because that loops for longer than five seconds, a **Pause the roaster** button in the header stops the drum, beans, embers and flames, and the choice is remembered. A fine pointer leans the camera a few degrees. Touch gets the same scroll story without the lean. On phones the machine sits in a band of its own: the canvas fades out beyond that band so no paragraph ever sits over the machine, and in the roast only the porthole sticks while the step cards pass under it one at a time, with the profile chart after the steps.
6. **At rest:** every section is complete as copy plus real cards: the four roast steps with times and temperatures, the roast profile chart, the five days of the week, three coffees with prices, subscription plans. Under reduced motion the camera cuts between stages, the drum stands still with its batch held mid-turn, the chart is fully drawn and the statement is filled. Without WebGL, drawn SVGs stand in: the roaster (hero and close), the porthole (roast) and the cooling tray (drop).

## Journey

| Section | What it says | What moves | Sky (Ash / Ember) |
|---|---|---|---|
| Hero · Tuesday 06:00 | Roasted on Tuesday, in your cup by Friday; next roast date; order | the roaster at three-quarters, burner lit, drum turning with the green batch just charged; embers or chaff rise; the pointer leans the camera | ash paper / charcoal |
| The roast · 06:00 to 06:11 | Charge, yellowing, first crack, drop, with times and bean temperatures; the roast profile | camera pushes in to the porthole and holds; the beans take each step's colour; the flame drops at first crack; the profile curve draws | kiln-warm paper / ember brown |
| The drop · 06:11 | Four minutes in the cooling tray; the chaff is the ash in the name | the door opens, the batch pours down the chute into the tray, the arms sweep; camera tilts down over the tray | kiln-warm paper / ember brown |
| The week · Mon to Fri | Order by Monday 23:59, roast Tuesday, rest and cup Wednesday, post Thursday, at your door Friday | the scene fades out; still cards, Tuesday marked with the ember | daylight paper / charcoal |
| This Tuesday's roast | Three coffees: origin, process, notes, roast level, price | still | daylight paper / charcoal |
| Statement (night) | Coffee is best from day three to week three; Tuesday roasting gives you all of it | the words fill as they are read | night in both themes |
| Numbers | 12 kg, 1 day, 72 h, 0 bags on a shelf | still (the numbers rest on their values) | daylight paper / charcoal |
| Subscribe | Join the Tuesday roast; plans; next roast date | the roaster again from the other side, burner out, the batch resting in the tray | ash dusk card / ember dusk card |
| Footer | wordmark, address, collection hours | the wordmark warms under the pointer | page |

## Timing tokens (Standard tier, in `styles.css`)

```css
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--dur-hover: 240ms;    /* hover and press */
--dur-reveal: 520ms;   /* the profile curve between steps */
--dur-section: 600ms;  /* the scene settling on a stage, the stand-ins fading out, the mark's ring drawing */
--dur-load: 900ms;     /* the header mark on load: the bed rolling and the ember flaring */
```

The scene eases every value with a time constant of 0.15 s (98% settled in about 0.6 s). The drum turns at about 18 rpm; the cooling arms at about 5 rpm. Nothing else loops.

## Files

- `index.html`: the page and its content, with the drawn SVG stand-ins inline in each scene anchor (their shared gradients and bean pattern sit in one `<defs>` sheet at the top of `<body>`). The order and subscribe buttons point at `#subscribe`: wire them to the shop's checkout.
- `styles.css`: tokens (Ash and Ember), layout, the stacking rules for the fixed scene layer.
- `site.js`: theme toggle, the statement fill, the footer glow, the roast steps and profile drawing, the computed roast dates.
- `roastery.js`: the Three.js scene (an ES module): the machine, the batch, the embers, the stages, the pause button. `?debug-scene` puts the stage, weights, anchor and clock on `window.__scene`.
- `vendor/three.module.min.js`: Three.js r170, MIT (`vendor/LICENSE-three.txt`).
- `favicon.svg`: the mark (a porthole with its bed of beans and an ember).

## Verified

Headless Chrome (`shoot.mjs`, software WebGL) at 1440×900 in both themes, 1000×520 with the in-between stops, 390×844 and 360 wide in both themes, without WebGL (`--disable-3d-apis`), with reduced motion forced, with JavaScript off, and timed frames of the mark on load; then a real GPU browser (Chrome on Apple M1 Pro, ANGLE Metal) for each scene stage in dark and the hero in light, the theme toggle and the pause button by click. No console errors and no shader errors in any run.
