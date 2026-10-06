# Study a reference: take the principle, not the look

When the user names a site they like ("like unitedcarriers.com") or shares a screenshot, spend ten minutes finding out how it moves and why, then write down principles. Never copy its code, assets, layout or palette.

## A live site

1. **What it runs on.** Fetch the HTML (`curl -sL <url>`) and list the script sources and libraries: GSAP, Lenis, Barba, Three.js, OGL, Lottie, Rive, a Webflow or Framer runtime. Grep the main bundle for timelines (`.to(`, `.fromTo(`), `ScrollTrigger`, `Observer`, shaders (`uTime`, `gl_FragColor`).
2. **What the page is made of.** In a browser, list the canvases (with sizes and class names), videos (their sources), and the `data-` attributes the scripts hook into (`data-cursor`, `data-marquee`, `data-flipping-text`, `data-speed`). Class names often name the technique: a canvas called `service-crane-sq` is a crane drawn as an image sequence.
3. **How it feels.** Screenshot it at a desktop size at five or six scroll stops and once on a phone; note what changes between stops (the sky colour, a sequence frame, a route drawn further).
4. **Write the principles,** one line each, in the subject's terms: "the page descends from orbit to the ground as you scroll", "each service is a machine doing its job, scrubbed by scroll", "the cursor labels what it hovers". These go into the motion brief; the look stays with the reference.

## A screenshot or a design file

A still shows composition, type and colour, not motion. Ask for a screen recording or the URL when motion is the point. From a still alone, take the hierarchy and the mood, and design the motion from the subject as usual.

## Galleries and libraries worth studying

| Where | Good for |
|---|---|
| awwwards.com (Sites of the Day, Month and Year), godly.website | judged sites, for pacing, restraint and signature ideas |
| tympanus.net/codrops | tutorials that take WebGL, scroll and text effects apart step by step |
| motion.dev/examples | hundreds of small patterns by category: scroll, text, cursor, page transitions, loading |
| framer.com/marketplace (scroll and interaction components) | how scroll sequences, scrubbed video and text animators behave |
| unicorn.studio | the range of shader effects (distortion, lighting, fluid, aurora) |
| reactbits.dev, magicui.design, ui.aceternity.com, animate-ui.com, vengenceui.com, forgeui.in, uilora.com, 21st.dev | component-level motion: backgrounds, buttons, cards, cursors, menus |
| uiverse.io | small CSS micro-interactions (buttons, toggles, loaders) |
| threeui.com, shaders.paper.design, shadertoy.com, iquilezles.org/articles | Three.js scenes and the GLSL behind any look |
| vercel.com/design/guidelines | interface rules for motion, focus, performance and layout |
| github.com/VoltAgent/awesome-design-md | DESIGN.md files: how a site's design system is written down for agents |

Each has its own licence; several are paid. Study, then build the idea from scratch.
