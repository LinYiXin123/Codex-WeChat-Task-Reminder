from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_BRANDING_DIR = ROOT / "public" / "branding"
ANDROID_RES_DIR = ROOT / "android" / "app" / "src" / "main" / "res"
SOURCE_ICON = ROOT / "assets" / "branding" / "cx-codex-source.png"

WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)
TILE_SHADOW = (18, 58, 140, 38)
TILE_HIGHLIGHT = (255, 255, 255, 70)
MARK_BLUE = (26, 102, 255, 255)
MARK_BLUE_DEEP = (24, 88, 234, 255)
MARK_BLUE_LIGHT = (42, 120, 255, 255)
MARK_GLOW = (71, 245, 255, 255)
DOT_BLUE = (20, 158, 255, 255)

LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

FOREGROUND_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def save_png(image: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    resized = image.resize((size, size), Image.LANCZOS)
    resized.save(path, format="PNG")


def make_contained_icon(source: Image.Image, size: int, scale: float = 1.0) -> Image.Image:
    normalized_scale = max(0.1, min(scale, 1.0))
    target_box = max(1, int(size * normalized_scale))
    canvas = Image.new("RGBA", (size, size), WHITE)
    contained = ImageOps.contain(source.convert("RGBA"), (target_box, target_box), Image.LANCZOS)
    offset = ((size - contained.width) // 2, (size - contained.height) // 2)
    canvas.alpha_composite(contained, offset)
    return canvas


def load_preferred_source_icon() -> Image.Image | None:
    if not SOURCE_ICON.exists():
        return None
    return Image.open(SOURCE_ICON).convert("RGBA")


def export_from_source_icon(source: Image.Image) -> None:
    PUBLIC_BRANDING_DIR.mkdir(parents=True, exist_ok=True)

    app_icon = make_contained_icon(source, 1024, 1.0)
    foreground_icon = make_contained_icon(source, 1024, 0.68)

    save_png(app_icon, PUBLIC_BRANDING_DIR / "cx-codex-app-icon.png", 1024)
    save_png(app_icon, PUBLIC_BRANDING_DIR / "cx-codex-logo.png", 512)
    save_png(foreground_icon, PUBLIC_BRANDING_DIR / "cx-codex-logo-foreground.png", 512)

    for density, size in LEGACY_SIZES.items():
        legacy_icon = make_contained_icon(source, size, 1.0)
        legacy_icon.save(ANDROID_RES_DIR / density / "ic_launcher.png", format="PNG")
        legacy_icon.save(ANDROID_RES_DIR / density / "ic_launcher_round.png", format="PNG")

    for density, size in FOREGROUND_SIZES.items():
        foreground = make_contained_icon(source, size, 0.68)
        foreground.save(ANDROID_RES_DIR / density / "ic_launcher_foreground.png", format="PNG")


def build_tile_canvas(size: int) -> tuple[Image.Image, tuple[int, int, int, int]]:
    canvas = Image.new("RGBA", (size, size), TRANSPARENT)
    tile_margin_x = int(size * 0.09)
    tile_margin_top = int(size * 0.095)
    tile_margin_bottom = int(size * 0.105)
    tile_box = (
        tile_margin_x,
        tile_margin_top,
        size - tile_margin_x,
        size - tile_margin_bottom,
    )
    radius = int(size * 0.2)

    shadow = Image.new("RGBA", (size, size), TRANSPARENT)
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_offset = int(size * 0.024)
    shadow_draw.rounded_rectangle(
        (
            tile_box[0] + int(size * 0.004),
            tile_box[1] + shadow_offset,
            tile_box[2] - int(size * 0.004),
            tile_box[3] + shadow_offset,
        ),
        radius=radius,
        fill=TILE_SHADOW,
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=int(size * 0.03)))
    canvas.alpha_composite(shadow)

    tile = Image.new("RGBA", (size, size), TRANSPARENT)
    tile_draw = ImageDraw.Draw(tile)
    tile_draw.rounded_rectangle(tile_box, radius=radius, fill=WHITE)

    highlight = Image.new("RGBA", (size, size), TRANSPARENT)
    highlight_draw = ImageDraw.Draw(highlight)
    highlight_draw.rounded_rectangle(
        (
            tile_box[0] + int(size * 0.03),
            tile_box[1] + int(size * 0.018),
            tile_box[2] - int(size * 0.03),
            tile_box[1] + int(size * 0.16),
        ),
        radius=int(size * 0.16),
        fill=TILE_HIGHLIGHT,
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(radius=int(size * 0.018)))
    tile.alpha_composite(highlight)
    canvas.alpha_composite(tile)
    return canvas, tile_box


def draw_brand_mark(target: Image.Image, size: int) -> None:
    draw = ImageDraw.Draw(target)
    stroke = int(size * 0.082)
    accent_stroke = max(3, int(stroke * 0.34))

    arc_box = (
        int(size * 0.18),
        int(size * 0.29),
        int(size * 0.62),
        int(size * 0.71),
    )
    draw.arc(arc_box, start=18, end=338, fill=MARK_BLUE, width=stroke)
    draw.arc(
        (
            arc_box[0] + int(size * 0.012),
            arc_box[1] + int(size * 0.006),
            arc_box[2] + int(size * 0.008),
            arc_box[3] - int(size * 0.01),
        ),
        start=18,
        end=205,
        fill=MARK_BLUE_LIGHT,
        width=accent_stroke,
    )

    upper_start = (int(size * 0.585), int(size * 0.385))
    upper_mid = (int(size * 0.70), int(size * 0.505))
    upper_end = (int(size * 0.81), int(size * 0.39))
    lower_start = (int(size * 0.585), int(size * 0.615))
    lower_mid = (int(size * 0.70), int(size * 0.495))
    lower_end = (int(size * 0.81), int(size * 0.61))
    draw.line((upper_start, upper_mid, upper_end), fill=MARK_BLUE, width=stroke, joint="curve")
    draw.line((lower_start, lower_mid, lower_end), fill=MARK_BLUE, width=stroke, joint="curve")

    accent_layer = Image.new("RGBA", (size, size), TRANSPARENT)
    accent_draw = ImageDraw.Draw(accent_layer)
    accent_draw.line(
        (
            (int(size * 0.575), int(size * 0.385)),
            (int(size * 0.68), int(size * 0.498)),
        ),
        fill=MARK_BLUE_DEEP,
        width=accent_stroke,
    )
    accent_draw.line(
        (
            (int(size * 0.575), int(size * 0.615)),
            (int(size * 0.68), int(size * 0.502)),
        ),
        fill=MARK_BLUE_DEEP,
        width=accent_stroke,
    )
    target.alpha_composite(accent_layer)

    glow = Image.new("RGBA", (size, size), TRANSPARENT)
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        (
            int(size * 0.445),
            int(size * 0.46),
            int(size * 0.555),
            int(size * 0.58),
        ),
        fill=(MARK_GLOW[0], MARK_GLOW[1], MARK_GLOW[2], 168),
    )
    glow_draw.polygon(
        (
            (int(size * 0.53), int(size * 0.462)),
            (int(size * 0.642), int(size * 0.52)),
            (int(size * 0.53), int(size * 0.58)),
        ),
        fill=(MARK_GLOW[0], MARK_GLOW[1], MARK_GLOW[2], 220),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(size * 0.024)))
    target.alpha_composite(glow)

    draw = ImageDraw.Draw(target)
    draw.ellipse(
        (
            int(size * 0.465),
            int(size * 0.48),
            int(size * 0.545),
            int(size * 0.56),
        ),
        fill=DOT_BLUE,
    )


def make_foreground_icon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), TRANSPARENT)
    mark_size = int(size * 0.74)
    mark = Image.new("RGBA", (mark_size, mark_size), TRANSPARENT)
    draw_brand_mark(mark, mark_size)

    offset_x = (size - mark_size) // 2
    offset_y = (size - mark_size) // 2
    canvas.alpha_composite(mark, (offset_x, offset_y))
    return canvas


def make_icon(size: int) -> Image.Image:
    canvas, _ = build_tile_canvas(size)
    draw_brand_mark(canvas, size)
    return canvas


def main() -> None:
    source_icon = load_preferred_source_icon()
    if source_icon is not None:
        export_from_source_icon(source_icon)
        source_icon.close()
        return

    PUBLIC_BRANDING_DIR.mkdir(parents=True, exist_ok=True)
    source_size = 1024
    icon = make_icon(source_size)
    foreground_icon = make_foreground_icon(source_size)

    save_png(icon, PUBLIC_BRANDING_DIR / "cx-codex-app-icon.png", source_size)
    save_png(icon, PUBLIC_BRANDING_DIR / "cx-codex-logo.png", 512)
    save_png(foreground_icon, PUBLIC_BRANDING_DIR / "cx-codex-logo-foreground.png", 512)

    for density, size in LEGACY_SIZES.items():
        save_png(icon, ANDROID_RES_DIR / density / "ic_launcher.png", size)
        save_png(icon, ANDROID_RES_DIR / density / "ic_launcher_round.png", size)

    for density, size in FOREGROUND_SIZES.items():
        save_png(foreground_icon, ANDROID_RES_DIR / density / "ic_launcher_foreground.png", size)


if __name__ == "__main__":
    main()
