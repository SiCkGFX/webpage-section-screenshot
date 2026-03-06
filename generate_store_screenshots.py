#!/usr/bin/env python3
"""
Generate polished Chrome Web Store screenshots from a single popup capture.

This script is designed for users who can only capture a small popup image.
It places that image into a branded 1280x800 layout suitable for store listing.

Usage:
  python generate_store_screenshots.py --source path/to/popup_capture.png

Default paths:
  source: store_assets/source/popup_capture.png
  output: store_assets/screenshots/
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


CANVAS_W = 1280
CANVAS_H = 800

COLORS = {
    "bg_top": (12, 16, 28),
    "bg_bottom": (8, 10, 18),
    "surface": (19, 23, 35),
    "surface_2": (24, 28, 44),
    "border": (52, 58, 86),
    "text": (228, 232, 248),
    "text_muted": (154, 166, 196),
    "accent": (108, 138, 255),
    "accent_2": (127, 216, 255),
    "ok": (74, 222, 128),
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    # Windows-first candidates, then cross-platform fallbacks.
    candidates = [
        "segoeui.ttf",
        "arial.ttf",
        "tahoma.ttf",
    ]
    if bold:
        candidates = [
            "segoeuib.ttf",
            "arialbd.ttf",
            "tahomabd.ttf",
        ] + candidates

    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def gradient_background() -> Image.Image:
    img = Image.new("RGB", (CANVAS_W, CANVAS_H), COLORS["bg_top"])
    draw = ImageDraw.Draw(img)

    for y in range(CANVAS_H):
        t = y / max(CANVAS_H - 1, 1)
        r = lerp(COLORS["bg_top"][0], COLORS["bg_bottom"][0], t)
        g = lerp(COLORS["bg_top"][1], COLORS["bg_bottom"][1], t)
        b = lerp(COLORS["bg_top"][2], COLORS["bg_bottom"][2], t)
        draw.line([(0, y), (CANVAS_W, y)], fill=(r, g, b))

    # Add soft atmosphere blobs.
    glow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((880, -80, 1400, 420), fill=(108, 138, 255, 40))
    gdraw.ellipse((-160, 380, 420, 980), fill=(56, 189, 248, 34))
    gdraw.ellipse((520, 260, 1080, 820), fill=(110, 90, 220, 28))
    glow = glow.filter(ImageFilter.GaussianBlur(34))

    return Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")


def rounded_card(base: Image.Image, box: tuple[int, int, int, int], radius: int, fill: tuple[int, int, int],
                 outline: tuple[int, int, int] | None = None, width: int = 1) -> None:
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def add_shadow(layer: Image.Image, box: tuple[int, int, int, int], radius: int, alpha: int = 80) -> Image.Image:
    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(box, radius=radius, fill=(0, 0, 0, alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    return Image.alpha_composite(layer.convert("RGBA"), shadow)


def fit_inside(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    src_w, src_h = img.size
    if src_w == 0 or src_h == 0:
        raise ValueError("Source image has invalid dimensions")
    scale = min(max_w / src_w, max_h / src_h)
    new_w = max(1, int(src_w * scale))
    new_h = max(1, int(src_h * scale))
    return img.resize((new_w, new_h), Image.Resampling.LANCZOS)


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, max_w: int,
                 fnt, fill: tuple[int, int, int], line_gap: int = 6) -> int:
    words = text.split()
    lines: list[str] = []
    cur: list[str] = []

    for w in words:
        trial = " ".join(cur + [w])
        tw = int(draw.textbbox((0, 0), trial, font=fnt)[2])
        if tw <= max_w or not cur:
            cur.append(w)
        else:
            lines.append(" ".join(cur))
            cur = [w]
    if cur:
        lines.append(" ".join(cur))

    yy = y
    for line in lines:
        draw.text((x, yy), line, font=fnt, fill=fill)
        h = int(draw.textbbox((0, 0), line, font=fnt)[3])
        yy += h + line_gap
    return int(yy)


def draw_mock_page(canvas: Image.Image) -> None:
    page_box = (56, 130, 740, 742)
    rounded_card(canvas, page_box, radius=20, fill=COLORS["surface"], outline=COLORS["border"], width=2)

    draw = ImageDraw.Draw(canvas)

    # Browser top bar
    top_bar = (56, 130, 740, 184)
    rounded_card(canvas, top_bar, radius=20, fill=(30, 35, 51))
    draw.rectangle((56, 170, 740, 184), fill=(30, 35, 51))

    draw.ellipse((80, 151, 92, 163), fill=(248, 113, 113))
    draw.ellipse((100, 151, 112, 163), fill=(251, 191, 36))
    draw.ellipse((120, 151, 132, 163), fill=(74, 222, 128))

    rounded_card(canvas, (160, 145, 706, 170), radius=12, fill=(45, 52, 74))
    draw.text((176, 149), "example.com/article/long-page", font=font(13), fill=COLORS["text_muted"])

    # Content placeholder blocks
    y = 214
    for i in range(9):
        tone = (34 + (i % 2) * 6, 40 + (i % 3) * 4, 60 + (i % 2) * 5)
        rounded_card(canvas, (88, y, 708, y + 42), radius=10, fill=tone)
        y += 55


def add_badges(canvas: Image.Image, labels: Iterable[str], start_x: int, y: int) -> int:
    draw = ImageDraw.Draw(canvas)
    x = int(start_x)
    for label in labels:
        f = font(15, bold=True)
        tw = int(draw.textbbox((0, 0), label, font=f)[2])
        badge_w = tw + 26
        badge_h = 32
        rounded_card(canvas, (x, y, x + badge_w, y + badge_h), radius=16, fill=(32, 40, 62), outline=(84, 100, 146), width=1)
        draw.text((x + 13, y + 8), label, font=f, fill=COLORS["accent_2"])
        x += badge_w + 10
    return int(x)


def place_popup(canvas: Image.Image, popup: Image.Image) -> tuple[int, int, int, int]:
    popup_fit = fit_inside(popup.convert("RGBA"), 470, 620)

    frame_w = popup_fit.width + 26
    frame_h = popup_fit.height + 26
    x1 = 776
    y1 = 140
    x2 = x1 + frame_w
    y2 = y1 + frame_h

    layer = canvas.convert("RGBA")
    layer = add_shadow(layer, (x1 + 6, y1 + 10, x2 + 6, y2 + 10), radius=18, alpha=95)
    canvas.paste(layer.convert("RGB"))

    rounded_card(canvas, (x1, y1, x2, y2), radius=18, fill=(15, 18, 27), outline=(92, 109, 160), width=2)

    # Round corners on popup image
    mask = Image.new("L", popup_fit.size, 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle((0, 0, popup_fit.width, popup_fit.height), radius=12, fill=255)
    canvas.paste(popup_fit, (x1 + 13, y1 + 13), mask)

    return (x1, y1, x2, y2)


def draw_variant(source_popup: Image.Image, title: str, subtitle: str, bullets: list[str],
                 filename: str, labels: list[str], out_dir: Path) -> Path:
    canvas = gradient_background()
    draw_mock_page(canvas)

    draw = ImageDraw.Draw(canvas)

    draw.text((60, 56), title, font=font(48, bold=True), fill=COLORS["text"])
    end_y = draw_wrapped(draw, subtitle, 60, 112, 650, font(21), COLORS["text_muted"], line_gap=5)

    add_badges(canvas, labels, 60, end_y + 14)

    y = 260
    for bullet in bullets:
        draw.ellipse((60, y + 8, 72, y + 20), fill=COLORS["accent"])
        draw_wrapped(draw, bullet, 84, y, 620, font(22), COLORS["text"], line_gap=4)
        y += 86

    place_popup(canvas, source_popup)

    out_path = out_dir / filename
    canvas.save(out_path, format="PNG")
    return out_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate store screenshots from one popup capture")
    parser.add_argument(
        "--source",
        default="store_assets/source/popup_capture.png",
        help="Path to popup screenshot source image",
    )
    parser.add_argument(
        "--outdir",
        default="store_assets/screenshots",
        help="Directory for generated screenshots",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    src = Path(args.source)
    out_dir = Path(args.outdir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not src.exists():
        print(f"Source image not found: {src}")
        print("Save your popup screenshot to that path, or pass --source with the actual file path.")
        return 1

    try:
        popup = Image.open(src).convert("RGBA")
    except Exception as exc:  # pragma: no cover - defensive path
        print(f"Failed to open source image: {exc}")
        return 1

    variants = [
        {
            "filename": "screenshot1_popup_scanning.png",
            "title": "Detect Page Sections in One Click",
            "subtitle": "Scan any long page and instantly get structured sections ready for export.",
            "bullets": [
                "Choose Headings, Semantic HTML, Custom selector, or All strategies.",
                "Review detected regions and keep only the sections you need.",
                "Designed for reports, docs, dashboards, and long articles.",
            ],
            "labels": ["Headings", "Semantic", "Custom", "All"],
        },
        {
            "filename": "screenshot2_export_progress.png",
            "title": "Split, Merge, Then Export",
            "subtitle": "Group sections your way, then export as PNG or JPEG with clean file naming.",
            "bullets": [
                "Split or merge boundaries to control output groups.",
                "Single group exports as image, multi-group exports as ZIP.",
                "Full-page fallback is available when you need everything.",
            ],
            "labels": ["Select", "Group", "Export"],
        },
        {
            "filename": "screenshot3_exported_files.png",
            "title": "Fast, Private, Offline",
            "subtitle": "No cloud uploads. Capture and export happens locally in your browser.",
            "bullets": [
                "No accounts, no telemetry, no external dependencies.",
                "Original-resolution crops from a stitched full-page capture.",
                "Built for repeatable documentation workflows.",
            ],
            "labels": ["Local Processing", "No Tracking", "Original Quality"],
        },
    ]

    outputs: list[Path] = []
    for v in variants:
        out = draw_variant(
            source_popup=popup,
            title=v["title"],
            subtitle=v["subtitle"],
            bullets=v["bullets"],
            filename=v["filename"],
            labels=v["labels"],
            out_dir=out_dir,
        )
        outputs.append(out)

    print("Generated screenshots:")
    for path in outputs:
        print(f"  - {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
