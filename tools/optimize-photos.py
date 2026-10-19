"""Shrink product photos in public/assets/photos so the catalog stays fast on phones.

Resizes every photo to fit 600x600, fixes phone rotation, and re-saves it as a
compressed JPEG (PNGs with transparency stay PNG). Originals are overwritten.

Usage:  python tools/optimize-photos.py      (needs Pillow: pip install pillow)
"""
import os
import sys

from PIL import Image, ImageOps

MAX = 600
folder = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'photos')

for name in sorted(os.listdir(folder)):
    base, ext = os.path.splitext(name)
    if ext.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
        continue
    src = os.path.join(folder, name)
    before = os.path.getsize(src)
    im = ImageOps.exif_transpose(Image.open(src))
    im.thumbnail((MAX, MAX))
    transparent = im.mode in ('RGBA', 'LA') and im.getextrema()[-1][0] < 255
    if transparent:
        dst = os.path.join(folder, base + '.png')
        im.save(dst, optimize=True)
    else:
        dst = os.path.join(folder, base + '.jpg')
        im.convert('RGB').save(dst, quality=80, optimize=True, progressive=True)
    if os.path.abspath(dst) != os.path.abspath(src):
        os.remove(src)
    print(f'{name}: {before // 1024} KB -> {os.path.basename(dst)} {os.path.getsize(dst) // 1024} KB')

print('Done. Now run: node tools/build-data.js', file=sys.stderr)
