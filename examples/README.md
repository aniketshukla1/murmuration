# Examples

Six sites built by the skill, each from a one-line prompt in [`evals/`](../evals/), in a fresh agent session with only the skill loaded, told to decide everything itself. The sessions could write files but not run a shell, so they could not open their own pages. Each site then went through the skill's last step (screenshots in headless Chrome and a GPU browser, the console, the scroll stops) and was fixed where it broke. Every fix is listed here; everything else is exactly as the skill wrote it.

| Site | Prompt | Fixes after the build |
|---|---|---|
| [`coffee-roastery`](coffee-roastery/) | [prompt](../evals/coffee-roastery/prompt.md) | pending |
| [`accounting-app`](accounting-app/) | [prompt](../evals/accounting-app/prompt.md) | `ledger-scene.js`: the scene crashed on scroll when a frame's timestamp came in before the last one (the step went negative, the easing overshot, the stage dropped below 0). Clamped the stage to its range and the time step to zero or more. |
| [`architecture-studio`](architecture-studio/) | [prompt](../evals/architecture-studio/prompt.md) | pending |
| [`music-festival`](music-festival/) | [prompt](../evals/music-festival/prompt.md) | pending |
| [`kids-science-museum`](kids-science-museum/) | [prompt](../evals/kids-science-museum/prompt.md) | none |
| [`freight-forwarder`](freight-forwarder/) | [prompt](../evals/freight-forwarder/prompt.md) | `scene.js`: the sea's shader named a variable `half`, a reserved word in GLSL, so the browser refused to compile it and the open-sea sections showed no water. Renamed it `hullHalf`. (The skill now has a rule against reserved words in shaders.) |

Each folder holds the site and the `MOTION.md` brief it wrote before building. Three.js loads from a pinned CDN URL through an import map; vendor it for real hosting, as `references/hosting.md` says.
