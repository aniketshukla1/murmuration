# Turns the frames from tools/record.mjs into the README's animated WebP, a poster frame and
# the demo's social preview image. Needs Pillow (pip install pillow).
#
#   python3 tools/make-media.py <frames-dir> [poster-seconds=1.0]
#
# Writes docs/demo.webp, docs/poster.jpg and demo/og.jpg, and prints each file's size.
import json
import os
import sys

from PIL import Image

frames_dir = sys.argv[1]
poster_at = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
manifest = [entry for entry in json.load(open(os.path.join(frames_dir, 'manifest.json'))) if entry[0] != 'end']


def frame(name, width):
    im = Image.open(os.path.join(frames_dir, name)).convert('RGB')
    return im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)


# Animated WebP: 12 frames a second at 800 px wide keeps it small enough to load in a README.
step = 30 // 12 if len(manifest) > 1 else 1
picked = manifest[::step]
seconds = [entry[1] for entry in picked]
durations = [round((b - a) * 1000) for a, b in zip(seconds, seconds[1:])] + [round(1000 / 12)]
images = [frame(name, 800) for name, _ in picked]
webp = os.path.join(root, 'docs', 'demo.webp')
images[0].save(webp, save_all=True, append_images=images[1:], duration=durations, loop=0, quality=58, method=6)

# The poster: one still from the hero.
name = min(manifest, key=lambda entry: abs(entry[1] - poster_at))[0]
poster = os.path.join(root, 'docs', 'poster.jpg')
frame(name, 1600).save(poster, quality=84, optimize=True, progressive=True)

# Social preview: 1200 x 630, cropped from the same still.
still = frame(name, 1200)
top = max(0, (still.height - 630) // 2)
og = os.path.join(root, 'demo', 'og.jpg')
still.crop((0, top, 1200, top + 630)).save(og, quality=84, optimize=True, progressive=True)

for path in (webp, poster, og):
    print(f'{os.path.relpath(path, root)}: {os.path.getsize(path) / 1048576:.2f} MB')
