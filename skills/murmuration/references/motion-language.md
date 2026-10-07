# Motion language: decide how this site moves

Every site gets its own motion language, chosen from what the user pictures (`interview.md`) and what the subject is. The signature is a 3D scene unless the user asks for flat, but no technique is the default: not particles, not a turning hero object, not a flythrough. Which 3D, and what it shows, comes from the subject. Two briefs about different subjects must not come out moving the same way by habit. The catalogue of techniques is in `catalogue.md`; this file is how to choose among them.

## 1. Read the brief for motion

Before naming any technique, write down:

- **The subject's verbs.** What moves in its world, and how: a crane lifts, coffee pours, a fern unfurls, a train glides, ink bleeds, dough rises, a ledger balances, a crowd surges, a lock clicks. Nouns tell you what to draw; verbs tell you how it moves.
- **The assets that exist.** Product renders, a 3D model, photography, film, illustration, nothing at all. Assets rule techniques in and out (section 4).
- **The tone.** Calm and slow (luxury, wellness, hospitality), precise and mechanical (engineering, fintech), loose and playful (food, toys, culture), raw (editorial, activism).
- **The one thing the page asks for.** Book, buy, sign up, read, apply. Motion leads there; it never competes with it.
- **The visitors' devices.** A page most people see on phones needs a signature that works with a thumb and no hover.

## 2. Write the motion brief

Six lines, before any code, from the interview's answers and the direction the user chose (`interview.md`). Show them to the user before building.

1. **Signature:** one technique and what it shows, in 3D unless the user asked for flat. ("A 3D scene built in code: a loaf rises and splits in the oven as you scroll, the camera easing in to the crust.")
2. **Why this subject:** the verb it comes from, in the subject's own words.
3. **Intensity, 1 to 10:** how much moves. 2 to 3 for a bank or a clinic (reveals and one quiet signature), 5 to 6 for most brands, 8 to 9 for a launch, a festival or a portfolio that is the work. The number sets the tier in the timing table below and caps the supporting moves.
4. **Supporting moves:** two to four quiet ones (a line-by-line headline reveal, a cursor that labels links, a marquee of port names).
5. **What drives it:** what scroll drives, what the pointer drives, what a touch screen gets instead.
6. **At rest:** the still frame shown under reduced motion, without JavaScript and without WebGL. It must look finished.

If these lines would fit a competitor's site unchanged, the brief is generic. Rewrite it around something only this subject has.

Save the brief as `MOTION.md` in the project, with the timing tokens the page uses (below) as CSS custom properties. Later edits, by you or anyone else, read it first and keep the page's motion consistent.

### Timing and easing

Pick durations from the tier the intensity sets, write them down once as tokens (`--dur-hover`, `--dur-reveal`, `--ease-out`), and use only those.

| Moment | Quiet (intensity 1 to 4) | Standard (5 to 7) | Bold (8 to 10) |
|---|---|---|---|
| Hover and press | 150 to 200 ms, ease-out | 200 to 300 ms, ease-out | 300 to 500 ms, a spring with a little overshoot |
| Reveal on entering view | 300 to 400 ms, fade and small rise | 400 to 600 ms, rise with a stagger | scrubbed by scroll, no duration |
| Stagger between items | 40 ms, at most 8 items | 60 to 80 ms, at most 8 items | 80 to 100 ms, short headlines only |
| Page or section change | 200 to 300 ms | 400 to 600 ms | 500 to 800 ms, one shared element at most |
| Loops (ambient) | none, or one very slow | slow, paused off screen | allowed, paused off screen |

Limits at every tier: split text into words or letters only in headlines under about eight words; pin at most one or two sections per page; never parallax body copy; magnetic or elastic effects on one or two elements per screen; an exit never longer than about 250 ms before the next page can show; anything that autoplays longer than five seconds gets a visible pause.

## 3. Choose the signature

Start from the cues in the brief. Candidates, strongest first; the last column names what usually fails for that kind of subject.

| The subject is | Strong candidates | Usually wrong |
|---|---|---|
| A physical product with renders or a model | image sequence, 3D object, pinned chapters, depth scroll | abstract shader fields that hide the product |
| A machine, a process, manufacturing | image sequence, line drawing (diagrams), video | particles that never show the machine |
| A place: hotel, travel, real estate | video, depth layers, flythrough, image transitions, line-drawn map | generic gradients |
| A network: logistics, airline, supply chain | globe or map with routes, line drawing, data in motion | stock video of trucks |
| Software, AI, fintech, data | shader field, generative canvas, data in motion, type, particles as data | 3D mascots, playful physics |
| Luxury, fashion, jewellery, fragrance | video, image transitions, drag to explore, liquid-metal or glass fields, type | busy cursor tricks |
| Food and drink | video, image sequence (a pour), physics, illustration | cold technical motion |
| Children, toys, education, games | physics, illustration, a mechanic or mini-game, depth layers | slow luxury pacing |
| Music, events, culture | kinetic type, shader field (audio-reactive), video, marquees | static product shots |
| Nature, science, wellness | generative canvas, particles, depth layers, shader field | hard mechanical easing |
| Architecture, engineering, craft | line drawing, 3D object, image transitions, type | glitter and glow |
| Agency, studio, portfolio | type, page choreography, cursor-led reveals, image transitions | one more particle hero |
| Sport and cars | video, 3D object, speed lines (generative), physics | gentle sway |
| Editorial, manifesto, non-profit | kinetic type, illustration, line drawing, pinned chapters | spectacle that buries the words |

The table proposes; the subject decides. A night-train company can be told with particles (stars, lit windows, snow); a ceramics studio with a 3D vase turning under the cursor; a bank with ledger lines that draw themselves. When two candidates fit, pick the one the subject's verbs describe best and the assets allow.

The candidates are ideas, not the final form. Unless the user asked for flat, tell the chosen idea in 3D: a pottery studio's vase thrown on a turning wheel, a bike maker's frame joined tube by tube, a vineyard's rows rolling past at dusk. A flat line drawing or a type treatment is a supporting move or a chapter, not the signature.

## 4. Assets decide what is possible

- **No assets at all:** a 3D object or small world built in code from primitives (`catalogue.md` 2 and 3), kinetic type, line drawing, generative canvas, particles, shader fields, CSS 3D, physics with simple shapes. Never fake a product photo or a render.
- **Photography:** image transitions, depth layers cut from the photo, mask reveals, drag to explore.
- **Film:** background loops, scroll-scrubbed video, video inside type or masks.
- **Renders or a turntable export:** image sequence.
- **A 3D model (glTF):** 3D object, configurator, relit hero.
- **Illustration:** depth layers, frame-by-frame or rigged SVG motion, physics with the illustrated pieces.

Ask for an asset when the right technique needs one and none exists; say what it would look like without it.

## 5. Combine with restraint

- **One signature per page.** Two only when the story moves to a different world halfway down, and never two in one viewport.
- **Supporting moves stay quiet:** a reveal, a label, a marquee, a counter. Pick two to four, not ten. `effects.md` and `techniques.md` hold them.
- **Transitions carry meaning.** A section change should feel like the story's next beat (the sky descending, the camera moving on), not a fade for its own sake.
- **Continuity.** Elements that appear on both sides of a cut (a logo, a product, a line) should travel, not vanish and reappear.

## 6. Make it unique, every time

- The brief names something only this subject has.
- **Name the category's cliché and step around it.** Freight gets a blue globe of dots, fintech floating coins, AI a purple orb, coffee steam and beans, music equaliser bars. Write the cliché in the brief, then do something else unless the user asked for it.
- Do not reproduce this skill's demo or examples: their shapes, motions and section order are illustrations of the method, not parts to reuse.
- When the user points at a reference site ("like unitedcarriers.com"), study it with `study-a-reference.md` and take its principle (descending from orbit to the ground; the product assembling as you scroll), not its look. Name the principle in the brief.
- In one session, two different briefs should not get the same signature unless both subjects demand it. Say why when they do.
- Vary pacing too: a slow luxury page and a quick playful one should not share the same durations and easing.

## 7. Check it against the visitor

- Is the page complete with the motion removed? It must be.
- Does the signature still work on a phone, by touch, at 60 fps on a mid-range device? If not, plan the phone version in the brief.
- Under `prefers-reduced-motion`, every technique shows its finished still, and nothing loops.
- Sound is always opt-in, never on load.
