# Northline: motion brief

## Assumptions (no interview; the user asked for decisions, not questions)
- Northline is an ocean and air forwarder on Asia–Europe lanes. No brand assets exist, so the mark, palette, type and copy are new here.
- Visitors are shippers and procurement teams, mostly on desktop, with real phone traffic. The page asks for one thing: **request a rate**.
- Every figure (48 ports, 31 days, 2 h, 96 %), the lane schedule and the voyage readouts are **placeholders** to be replaced with real data.
- Fonts (Google Fonts) and Three.js (jsDelivr, import map) load from CDNs. For production, vendor both next to the page.

## Brief
1. **Signature:** a real-time Three.js scene built entirely in code: a Northline container ship on a Gerstner-wave ocean. Scroll sails it on one voyage, Yangshan (Shanghai) to Maasvlakte (Rotterdam). It is loaded under the gantry cranes at dawn, puts to sea, passes under an air freighter at dusk, crosses the Mediterranean at night and arrives under Rotterdam's cranes at the next dawn. One ship, relit leg by leg.
2. **Why this subject:** the forwarder's verbs are *load, sail, clear, arrive*. Boxes drop into the bays one by one as you leave the hero, the quay falls behind, the wake opens and the far port comes up ahead. The cliché is a blue dotted globe with glowing arcs. Here the route is ruled as a pencil line on a plotting-sheet graticule instead, and the cinematic weight comes from one physical ship.
3. **Intensity:** 7 (Standard tier, with one bold signature).
4. **Supporting moves (4):** the hero headline rises word by word on load (under 1 s); a fixed voyage rail and readout (place, position, day) follow the section in view; the lane is drawn on the chart as you scroll; the night statement fills in as it is read.
5. **What drives it:** scroll drives the camera, the sky, the sun, the load count, the port positions and the ship's speed. Each section holds its shot, transitions happen only near section boundaries, and state settles in about 0.6 s. Scroll position also moves the air freighter across the dusk sky. The pointer drives nothing in the scene, so touch gets the full experience.
6. **At rest:** each window section is a finished shot (reduced motion: frozen waves, no flow, the camera snaps to the shot). Without WebGL or JS, a drawn SVG ship on a dawn horizon sits behind all window sections, and every section has its full copy.

## Journey
| Section | What it says | What moves | Sky |
|---|---|---|---|
| Hero (window) | Asia to Europe, every box accounted for | ship 72 % loaded under two cranes, a box on the spreader | dawn, Yangshan |
| Services (paper) | one desk, quay to door | scene hidden; ship finishes loading and departs underneath | — |
| At sea (window) | visibility while sailing | ship at 17 kn, wake opens, readouts | noon, Singapore Strait |
| Lanes (paper) | the weekly lanes | the route is ruled on the chart | — |
| Air (window) | when it can't wait | an air freighter crosses the sky over the bow | dusk, Gulf of Aden |
| Statement (window, night) | the promise inside the box | camera overhead, deck lights and stars | night, Mediterranean |
| Numbers (paper) | proof | static numbers on hairlines | — |
| Quote (window) | request a rate | ship slows alongside Rotterdam's blue cranes | dawn, Maasvlakte |

## Tokens
```css
--dur-hover: 240ms;
--dur-reveal: 600ms;
--stagger: 45ms;
--ease-out: cubic-bezier(.2, .7, .2, 1);
/* scene: state damping time constant 0.17 s (settles in ~0.6 s); transition band ±30 % of the viewport around each section boundary */
```

## Rules for later edits
- Scene windows (`.window`) are transparent; paper sections (`.paper`) sit above the fixed scene on purpose (z-index 2) and pause it when no window is in view.
- New shots go in `SHOTS` in `scene.js` and are named by a section's `data-shot`.
- The scene stops drawing when no window is on screen. Keep it that way.
