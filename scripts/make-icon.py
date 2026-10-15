"""Regenerate the browser and Windows Alatar's Graph marks (requires Pillow)."""

from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)
SIZE = 256
SCALE = 4
S = SIZE * SCALE

image = Image.new("RGBA", (S, S), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
for y in range(S):
    t = y / S
    color = (8 + int(11 * t), 26 + int(18 * t), 57 + int(34 * t), 255)
    draw.line((0, y, S, y), fill=color)

mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=58 * SCALE, fill=255)
image.putalpha(mask)
draw = ImageDraw.Draw(image)

def p(value):
    return int(value * SCALE)

draw.rounded_rectangle((p(3), p(3), p(253), p(253)), radius=p(56), outline=(80, 145, 214, 190), width=p(3))
draw.ellipse((p(40), p(40), p(216), p(216)), outline=(78, 144, 219, 125), width=p(2))
draw.ellipse((p(56), p(56), p(200), p(200)), outline=(71, 132, 201, 110), width=p(2))
for angle in (-90, 0, 90, 180):
    radians = math.radians(angle)
    x1, y1 = 128 + 63 * math.cos(radians), 128 + 63 * math.sin(radians)
    x2, y2 = 128 + 86 * math.cos(radians), 128 + 86 * math.sin(radians)
    draw.line((p(x1), p(y1), p(x2), p(y2)), fill=(104, 183, 247, 180), width=p(2))
    draw.ellipse((p(x2 - 4), p(y2 - 4), p(x2 + 4), p(y2 + 4)), fill=(113, 194, 255, 235))

star = []
for step in range(16):
    angle = -math.pi / 2 + step * math.pi / 8
    radius = 62 if step % 2 == 0 else 17
    star.append((p(128 + radius * math.cos(angle)), p(128 + radius * math.sin(angle))))

glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(glow).polygon(star, fill=(88, 175, 255, 200))
glow = glow.filter(ImageFilter.GaussianBlur(p(12)))
image = Image.alpha_composite(image, glow)
draw = ImageDraw.Draw(image)
draw.polygon(star, fill=(188, 226, 255, 255))
draw.line(star + [star[0]], fill=(229, 246, 255, 255), width=p(2))
draw.ellipse((p(122), p(122), p(134), p(134)), fill=(245, 251, 255, 255))

image = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
image.save(OUT / "alatar-mark.png")
image.save(
    OUT / "alatar-mark.ico",
    format="ICO",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
