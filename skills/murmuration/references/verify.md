# Verify: look at it the way a visitor will

A WebGL page can look perfect in one window and empty in another. Check all of these before calling it done, and before every publish that changes the scene.

## 1. Serve it
Run `python3 -m http.server 5050 --directory <site>`, or open `file://` for a quick look (the engine needs no fetches). A local server that resets the odd font request (`ERR_CONNECTION_RESET`) is a dev-server quirk. Check the font renders in the screenshots rather than chasing the log line.

## 2. Screenshots at every section
```bash
node scripts/shoot.mjs "http://localhost:5050/index.html" shots 1440 900 dark "0,#story+0,#numbers+-200,#closing+0"
```
A stop is a pixel offset or a selector plus an offset. The script prints `scene running: true|false` and every console error. Then combine the shots and read them in one look:
```bash
python3 scripts/sheet.py sheet.jpg shots/dark-1440-*.jpg
```

Run this matrix:

| Run | Why |
|---|---|
| 1440×900, light and dark | the main view, both materials |
| 1000×520 | a short laptop window: shapes must hold and stay on screen while text is read |
| 390×844 | a phone: anchors, chips and wrapping |
| `EXTRA="--disable-3d-apis"` | no WebGL: every section must still look finished |
| in-between stops (`#next+-200`, `#next+-60`, `#this+300`) at 1000×520 | the moments people stop on: a section half gone, the next half in. Something must be formed on screen at every one |
| `FRAMES=2000,3300,3900,4500,5100,5700 …` | timed frames of an animation (the logo's loop) from page load |

For the particle scene, `DEBUG=1` with `?debug-scene` in the URL also prints, at each stop, the pair in play, the arrival, the target, both frames and both sections. Use it to tell "the shape is off screen" from "the shape is behind something" from "the shape is dark".

If every screenshot comes back the same small size and `scene running: false`, the local server has stopped. Restart it before reading anything into the shots.

## 3. What to look for
- An empty section, meaning a heading with nothing else. Fix the content, not the particles.
- An empty in-between screen: nothing formed while two sections share the screen. For particles, check the debug readout: off screen means settle; behind opaque content means `data-hold="anchor"`; too dark means the palette or a motion's `lit`.
- A scene caught mid-transition while someone would be reading (a shape mid-travel, a sequence between key frames, a camera between stops).
- A disc, box or blur that no element seems to own. Search for a class name collision (`elementsFromPoint` ignores `pointer-events: none` elements, so enumerate elements by size instead).
- Icons missing or half drawn. Before building, assert that every `<use href="#i-…">` resolves to a `<symbol>` and that each symbol has as many elements as its source icon. Extract library icons by evaluating the icon data object (`Function('return (' + literal + ')')()`), never with a line regex, which silently drops nodes whose attributes span several lines; and let sprite ids contain digits. A partial icon reads as a design choice at 1440px, so screenshots alone will not catch it.
- Text on a mid-tone gradient. Move it, or use a card behind it.
- Light theme: moving marks too pale on a light sky (for particles: raise alpha, darken the base, `glow` near 0).
- With `effects.md` effects on the page:
  - `EXTRA="--force-prefers-reduced-motion"`: every effect shows its final state, and nothing loops.
  - Scroll-driven CSS: temporarily change the gate to a query no browser passes (`@supports (animation-timeline: none-such)`) and shoot again. Every line must still be readable, as it must be in any browser without scroll-driven animations.
  - Glass: look at it once without the Chromium refraction class. The frost alone must still read as glass, as it must in every browser that skips the refraction.
  - Count the canvases drawing at each stop: no more than three WebGL contexts live, and shader backgrounds off screen are not drawing.

## 4. Motion quality
- Every animation can be interrupted: scrolling, a click or a key stops or redirects it, nothing waits for it to finish.
- Only `transform`, `opacity` and `filter` animate; no `transition: all`; transforms start where the motion physically starts (`transform-origin`, and `transform-box: fill-box` on SVG).
- Durations come from the tokens in `MOTION.md`; no stray values.
- Anything that autoplays for more than five seconds has a visible pause; sound starts only after a tap.
- Keyboard: every control reachable, focus rings visible and unobscured by moving layers; hit targets at least 24 px (44 px on phones).
- Images and canvases have explicit sizes, so nothing shifts as they load; back and forward restore the scroll position.

## 5. Unique to this brief
- Read `MOTION.md` beside the screenshots: the signature is what the brief named, and it shows something only this subject has.
- No `example-*` shape, motion or palette is left; nothing reproduces this skill's demo (its shapes, motions or section order).
- If the user named a reference site, the page carries its principle and none of its look, code or assets.
- If this session already built a site, the two do not share a signature unless both briefs say why.

## 6. Headless is not the whole truth
Headless Chrome renders WebGL in software (SwiftShader) and composites canvases differently from a GPU browser. A canvas can look right in every headless shot and show nothing on the visitor's Mac. Before saying it works, take at least one screenshot of each dark section in the browser pane, which uses the GPU. If a shape is "there" in the debug readout but invisible in the pane, read the canvas pixels in a `requestAnimationFrame` (`gl.readPixels` on `canvas.getContext('webgl2')`). Lit pixels that never reach the screen mean a compositing problem, usually colour brighter than alpha.

## 7. The browser pane
The built-in browser pane is narrow and scales larger viewports down. Use it for interaction checks; use `shoot.mjs` for layout and for anything wider than the pane.
