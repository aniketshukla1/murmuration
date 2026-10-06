# Hosting and publishing

## A claude.ai artifact
- The artifact viewer's sandbox may refuse separate script files. Publish a build with every script inlined before `</body>`, in the order the page loads them (for example `site.js`, then `scene.js`, then `murmuration.js`). Keep the stylesheet, fonts, images and frames as published supporting files.
- No outside fetches: self-host fonts as supporting files (`contentType: font/ttf`) or use Google Fonts. Embed everything else.
- Keep the same file path or pass the artifact `url` on every publish, so the link stays the same.
- Artifacts are private until shared. Say so when handing over the link.

## Real hosting
- Any static host works. The page is HTML, CSS, a few scripts, fonts and images (and frames or video for those techniques). Vendor any library a technique needs (Three.js) next to the page rather than loading it from a CDN.
- Self-host fonts and avoid third-party CDNs if the brand makes privacy promises.
- Keep separate script files for caching, and compress images to WebP.
- Reduced motion, no WebGL and no JS must each still give a complete page: check them with `verify.md`.
