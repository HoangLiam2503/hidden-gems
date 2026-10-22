"""Add reference photos for a gem.

Usage: python3 tools/add_refs.py <gem-id> photo1.jpg photo2.heic ...

Resizes each photo to 640px on the long side, fixes rotation, saves it as
gems/<gem-id>/refN.jpg, and prints the `refs:` line to paste into gems.js.
Needs Pillow (pip install pillow); HEIC also needs pillow-heif.
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

LONG_SIDE = 640


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    gem_id, photos = sys.argv[1], sys.argv[2:]
    out_dir = Path(__file__).resolve().parent.parent / 'gems' / gem_id
    out_dir.mkdir(parents=True, exist_ok=True)

    n = len(list(out_dir.glob('ref*.jpg')))
    for src in photos:
        n += 1
        img = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        img.thumbnail((LONG_SIDE, LONG_SIDE), Image.LANCZOS)
        dest = out_dir / f'ref{n}.jpg'
        img.save(dest, 'JPEG', quality=85)
        print(f'saved {dest.relative_to(out_dir.parent.parent)}')

    refs = sorted(p.name for p in out_dir.glob('ref*.jpg'))
    print('\nIn gems.js, set:\n    refs: [' + ', '.join(f"'{r}'" for r in refs) + '],')


if __name__ == '__main__':
    main()
