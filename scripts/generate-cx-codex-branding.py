from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_BRANDING_DIR = ROOT / "public" / "branding"
ANDROID_RES_DIR = ROOT / "android" / "app" / "src" / "main" / "res"

BACKGROUND_TOP = (8, 70, 255, 255)
BACKGROUND_BOTTOM = (36, 122, 255, 255)
BACKGROUND_GLOW = (79, 180, 255, 255)
MARK_BLUE = (34, 103, 255, 255)
MARK_BLUE_LIGHT = (48, 130, 255, 255)
MARK_GLOW = (66, 244, 255, 255)
WHITE = (255, 255, 255, 255)

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


def rounded_rect_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask


def make_background(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    pixels = image.load()
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(BACKGROUND_TOP[0] * (1 - t) + BACKGROUND_BOTTOM[0] * t)
        g = int(BACKGROUND_TOP[1] * (1 - t) + BACKGROUND_BOTTOM[1] * t)
        b = int(BACKGROUND_TOP[2] * (1 - t) + BACKGROUND_BOTTOM[2] * t)
        for x in range(size):
            pixels[x, y] = (r, g, b, 255)

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    glow_radius = int(size * 0.42)
    glow_bbox = (
        int(size * 0.28),
        int(size * 0.22),
        int(size * 0.28) + glow_radius,
        int(size * 0.22) + glow_radius,
    )
    draw.ellipse(glow_bbox, fill=(BACKGROUND_GLOW[0], BACKGROUND_GLOW[1], BACKGROUND_GLOW[2], 118))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(size * 0.08)))
    return Image.alpha_composite(image, glow)


def make_tile(size: int) -> Image.Image:
    tile_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)

    tile_margin = int(size * 0.14)
    radius = int(size * 0.12)
    tile_box = (tile_margin, tile_margin, size - tile_margin, size - tile_margin)
    shadow_offset = int(size * 0.012)

    shadow_draw.rounded_rectangle(
        (
            tile_box[0],
            tile_box[1] + shadow_offset,
            tile_box[2],
            tile_box[3] + shadow_offset,
        ),
        radius=radius,
        fill=(8, 38, 111, 48),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=int(size * 0.02)))
    tile_layer = Image.alpha_composite(tile_layer, shadow_layer)

    tile_draw = ImageDraw.Draw(tile_layer)
    tile_draw.rounded_rectangle(tile_box, radius=radius, fill=WHITE)

    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight)
    highlight_draw.rounded_rectangle(
        (
            tile_box[0] + int(size * 0.01),
            tile_box[1] + int(size * 0.01),
            tile_box[2] - int(size * 0.01),
            tile_box[1] + int(size * 0.16),
        ),
        radius=radius,
        fill=(255, 255, 255, 42),
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(radius=int(size * 0.015)))
    return Image.alpha_composite(tile_layer, highlight)


def draw_mark(target: Image.Image, size: int) -> None:
    draw = ImageDraw.Draw(target)
    stroke = int(size * 0.082)
    accent_stroke = max(2, int(stroke * 0.42))

    arc_box = (
        int(size * 0.23),
        int(size * 0.31),
        int(size * 0.66),
        int(size * 0.74),
    )
    draw.arc(arc_box, start=30, end=335, fill=MARK_BLUE, width=stroke)
    draw.arc(
        (
            arc_box[0] + int(size * 0.01),
            arc_box[1] - int(size * 0.005),
            arc_box[2] + int(size * 0.005),
            arc_box[3] - int(size * 0.005),
        ),
        start=30,
        end=200,
        fill=MARK_BLUE_LIGHT,
        width=accent_stroke,
    )

    cross_start_upper = (int(size * 0.595), int(size * 0.43))
    cross_end_upper = (int(size * 0.81), int(size * 0.64))
    cross_start_lower = (int(size * 0.595), int(size * 0.57))
    cross_end_lower = (int(size * 0.81), int(size * 0.36))
    draw.line((cross_start_upper, cross_end_upper), fill=MARK_BLUE, width=stroke)
    draw.line((cross_start_lower, cross_end_lower), fill=MARK_BLUE, width=stroke)

    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    glow_draw.ellipse(
        (
            int(size * 0.41),
            int(size * 0.47),
            int(size * 0.55),
            int(size * 0.61),
        ),
        fill=(MARK_GLOW[0], MARK_GLOW[1], MARK_GLOW[2], 188),
    )
    glow_draw.polygon(
        (
            (int(size * 0.53), int(size * 0.475)),
            (int(size * 0.67), int(size * 0.54)),
            (int(size * 0.53), int(size * 0.605)),
        ),
        fill=(MARK_GLOW[0], MARK_GLOW[1], MARK_GLOW[2], 212),
    )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=int(size * 0.022)))
    target.alpha_composite(glow_layer)

    draw = ImageDraw.Draw(target)
    draw.ellipse(
        (
            int(size * 0.435),
            int(size * 0.49),
            int(size * 0.535),
            int(size * 0.59),
        ),
        fill=(27, 171, 255, 255),
    )


def make_foreground(size: int) -> Image.Image:
    foreground = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    foreground.alpha_composite(make_tile(size))
    draw_mark(foreground, size)
    return foreground


def make_full_icon(size: int) -> Image.Image:
    background = make_background(size)
    background.alpha_composite(make_foreground(size))
    return background


def save_png(image: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    resized = image.resize((size, size), Image.LANCZOS)
    resized.save(path, format="PNG")


def main() -> None:
    PUBLIC_BRANDING_DIR.mkdir(parents=True, exist_ok=True)
    source_size = 1024
    full_icon = make_full_icon(source_size)
    foreground = make_foreground(source_size)

    save_png(full_icon, PUBLIC_BRANDING_DIR / "cx-codex-app-icon.png", source_size)
    save_png(full_icon, PUBLIC_BRANDING_DIR / "cx-codex-logo.png", 512)
    save_png(foreground, PUBLIC_BRANDING_DIR / "cx-codex-logo-foreground.png", 512)

    for density, size in LEGACY_SIZES.items():
        save_png(full_icon, ANDROID_RES_DIR / density / "ic_launcher.png", size)
        save_png(full_icon, ANDROID_RES_DIR / density / "ic_launcher_round.png", size)

    for density, size in FOREGROUND_SIZES.items():
        save_png(foreground, ANDROID_RES_DIR / density / "ic_launcher_foreground.png", size)


if __name__ == "__main__":
    main()
