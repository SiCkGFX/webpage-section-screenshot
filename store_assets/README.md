# Store Assets — Webpage Section Screenshot

## Contents

These are all assets needed for Chrome Web Store submission.

### Generated (Automatic)
- `icon16.png` — Extension toolbar icon 16×16
- `icon48.png` — Extension icon 48×48
- `icon128.png` — Store listing icon 128×128 ⭐ **REQUIRED**
- `promo_small_440x280.png` — Small promo tile (catalog/search results) ⭐ **REQUIRED**
- `promo_marquee_1400x560.png` — Large marquee tile (featured content, optional)

### Manual (You create these)
- `screenshots/` — Folder for 3–5 screenshots (1280×800 PNG)
  - `screenshot1_popup_scanning.png` — Popup after scan
  - `screenshot2_export_progress.png` — Export progress
  - `screenshot3_exported_files.png` — Downloaded files
  - (optional) `screenshot4_semantic_strategy.png` — Alternative detection
  - (optional) `screenshot5_custom_selector.png` — Custom selector

- `SCREENSHOT_GUIDE.md` — Instructions for taking screenshots (in this directory)

## How to Regenerate Assets

If you modify the icon or want to regenerate:

```bash
pip install pillow  # One-time setup (simple version, no cairosvg needed)
python generate_assets_simple.py
```

This will regenerate all PNG icons and promo tiles.

## Icon Design Notes

The icon shows:
- **Stylized page** — Rectangle with rounded corners, gradient border (blue→purple)
- **Horizontal divider lines** — Represent detected page sections
- **Text lines** — Show content within each section

Color scheme matches the extension UI:
- Accent (gradient): `#6c8aff` → `#a78bfa`
- Dark background: `#0e0f13`
- Surface: `#16171d`
- Text: `#e4e4e9`

## Submitting to Chrome Web Store

**Complete checklist:** See `SUBMISSION_CHECKLIST.md`

Quick summary:
1. Create GitHub repo (`setup_github.ps1` or `setup_github.sh`)
2. Generate assets (`python generate_assets_simple.py`)
3. Take 3–5 screenshots (`SCREENSHOT_GUIDE.md`)
4. Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)
5. Upload extension ZIP
6. Upload graphics:
   - Icon: `icon128.png`
   - Screenshots: all `screenshot*.png` files in order
   - Small promo: `promo_small_440x280.png`
   - Marquee (optional): `promo_marquee_1400x560.png`
7. Fill in listing details
8. Submit for review (1–3 business days)

---

**Status:** ✅ Assets generated. ⏳ Awaiting manual screenshot capture.
