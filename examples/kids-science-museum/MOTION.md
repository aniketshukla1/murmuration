# Sprout Lab: motion brief

## Brief

1. **Signature:** a 3D scene built in code with Three.js: a seedling in a lab beaker of water, on a cork mat. As the page is read it *sprouts*: the seed splits, the stem climbs, one leaf unfurls for each of the four zones in that zone's colour (Splash blue, Spark yellow, Sky violet, Grow green), and at Tickets a flower opens. The camera rises and pulls back with the stem so the whole plant is always framed.
2. **Why this subject:** the museum's name is a verb, *sprout*, and so is its promise: curiosity grows by doing. The beaker puts the lab and the living thing in one object.
3. **Intensity:** 7 (Standard tier, at its playful end: springy hovers, a short pop-in headline).
4. **Supporting moves (three):** the hero headline pops in word by word on load with a spring (done in under 1 s); cards rise into place as they scroll in (scroll-driven CSS, gated); springy hover and press on buttons, cards and steppers. One mechanic is attached to the signature: **Make it fizz** sends bubbles up the beaker and wobbles the plant.
5. **What drives it:** scroll sets the growth through `data-grow` stops on sections and zone cards, smoothed so it settles in about 0.6 s. The pointer turns the plant a little toward it. Touch screens get the fizz button and the idle sway. On phones the plant sits in the hero, then stays dimmed behind the cards.
6. **At rest:** the fully grown, flowering plant, held still (reduced motion). Without WebGL, or if the module fails to load, an SVG drawing of the same plant stands in the hero stage. Every section's content lives in opaque cards, so nothing depends on the scene.

**Cliché avoided:** cartoon mascots, rainbow-primary "kids' site" chaos and a bubbling green chemistry flask. Instead there is one calm, toy-like object, and the colour lives in the four zone leaves.

## Journey

| Section | What it says | What moves | Sky |
|---|---|---|---|
| Hero | Hands-on science for ages 5–12; open today? tickets | seed has split, first pair of leaves; fizz button | morning mint |
| Explore | four zones, real exhibits | one zone-coloured leaf unfurls per zone card | cream |
| Shows | today's free shows by time | stem climbs, a bud forms | cream to butter |
| Visit | opening hours (today highlighted), getting here, access, food | stem complete | butter |
| Tickets | prices, ticket builder with family saver | the flower opens | butter to peach |
| FAQ | the questions parents actually ask | held, flowering | peach to cream |
| Footer | address, hours, contact | still | deep green (night in both themes) |

## Timing tokens (styles.css `:root`)

```css
--dur-hover: 260ms;
--dur-pop: 620ms;
--stagger: 70ms;
--ease-out: cubic-bezier(.22, 1, .36, 1);
--ease-spring: cubic-bezier(.34, 1.56, .64, 1);
```
Scene smoothing: growth eases toward its target at rate 6/s (rate 2.2/s for the first two seconds, so the opening sprout is visible).

## Assumptions (no interview: the brief said decide)

- Sprout Lab is a single venue in the UK, so prices are in £ and times are shown in Europe/London.
- Hours: Tue–Fri 9:30am–4:30pm, Sat–Sun 9:30am–5:30pm, closed Mondays except school holidays; last entry one hour before closing.
- Prices: child (5–12) £9, adult £11, under-5s free, family (2+2) £34, carers free, annual family pass £85.
- Address, phone (Ofcom drama range), email, shows and exhibits are placeholders to replace with the real ones.
- Checkout is not connected: the ticket builder prices the visit and stops at "Continue to payment".
- Fonts come from Google Fonts (Fredoka and Nunito) and Three.js from jsDelivr (pinned 0.170.0). Vendor both for production.
