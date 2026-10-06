# Combines screenshots into one contact sheet to read in a single look.
# Usage: python3 sheet.py <out.jpg> <shot> [shot ...]   (needs Pillow: pip install pillow)
# Landscape shots go two to a row; portrait (phone) shots five to a row, keeping their shape.
import sys
from PIL import Image

out, files = sys.argv[1], sys.argv[2:]
if not files:
    sys.exit('usage: python3 sheet.py <out.jpg> <shot> [shot ...]')
first = Image.open(files[0])
portrait = first.height > first.width
cols = 5 if portrait else 2
w = 300 if portrait else 720
h = round(w * first.height / first.width)
rows = (len(files) + cols - 1) // cols
gap = 8
sheet = Image.new('RGB', (w * cols + gap * (cols - 1), h * rows + gap * (rows - 1)), 'white')
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h))
    sheet.paste(im, ((i % cols) * (w + gap), (i // cols) * (h + gap)))
sheet.save(out, quality=82)
print(out, sheet.size)
