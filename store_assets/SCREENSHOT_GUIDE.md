# Screenshot Guide — Webpage Section Screenshot

## Screenshots Required (Chrome Web Store)

The store requires 1–5 screenshots (1280×800 or 640×400 px recommended).
These should show the extension in action on a real website.

### Screenshot 1: Popup After Scanning
**What to show:**
1. Open any long article or documentation page (e.g., Medium, GitHub wiki, Dev.to)
2. Click the extension icon → Select "Headings" strategy
3. Click "Scan Page Sections"
4. Capture the popup showing detected sections with colored groups
5. Take a screenshot at 1280×800

**Tips:**
- Make sure 3–5 sections are visible in the list
- Show at least one merged group (colored background/header)
- The dark theme will make it visually distinct
- Ensure the popup is fully visible (not cut off)

### Screenshot 2: Export Progress
**What to show:**
1. After scanning, select a few sections
2. Click "Export"
3. Capture the progress overlay ("Capturing… X/Y slices")
4. Screenshot at 1280×800

**Tips:**
- Show the spinner animation mid-export
- Demonstrates responsiveness and progress transparency

### Screenshot 3: Exported Files
**What to show:**
1. Export completes, files download
2. Open file manager and show the downloaded PNG/ZIP files
3. Open one of the PNG files to show clean section exports
4. Screenshot file explorer + open image at 1280×800

**Tips:**
- Show both the ZIP file and an extracted/open PNG section
- Demonstrates output quality and usability

### Screenshot 4: Detection Strategies (Optional)
**What to show:**
1. Same long page, show popup with "Semantic" strategy selected
2. Show different sections detected vs. "Headings" mode
3. Illustrate how detection changes based on strategy

**Tips:**
- Side-by-side comparison (two popups or two screenshots) is ideal
- Shows extension flexibility

### Screenshot 5: Custom Selector (Optional)
**What to show:**
1. Use "Custom" strategy with a CSS selector (e.g., `.article`, `[data-block]`)
2. Show sections found via custom selector
3. Demonstrate the flexibility and power

**Tips:**
- Type a real selector from the page you're testing
- Shows advanced users the feature exists

## How to Create Assets

### Windows
1. Use **Snipping Tool** (Win+Shift+S) or **Screenshot tool**
2. Capture the chrome window (extension popup open)
3. Crop/resize to 1280×800 if needed
4. Save as PNG to `store_assets/screenshots/`

### Mac
1. Press **Cmd+Shift+4** for screenshot selection
2. Drag to select the area
3. Image saves to Desktop. Move to `store_assets/screenshots/`
4. Use **Preview** to resize if needed to 1280×800

### Linux
1. Use **Print** key or Flameshot (`sudo apt install flameshot`)
2. Select area and save to `store_assets/screenshots/`
3. Use GIMP or ImageMagick to resize if needed

### Editing/Annotations (Optional)
If you want to add captions or arrows:
- **Figma** (https://figma.com) — free tier, easy
- **Canva** (https://canva.com) — free tier, templates
- **GIMP** — free desktop app
- **Paint.NET** — free Windows app
- **Preview** (Mac) — basic markup tools

## File Naming Convention

Save screenshots to `store_assets/screenshots/`:
- `screenshot1_popup_scanning.png` — Popup after scan
- `screenshot2_export_progress.png` — Export in action
- `screenshot3_exported_files.png` — Downloaded files
- `screenshot4_semantic_strategy.png` — Alternative detection (optional)
- `screenshot5_custom_selector.png` — Custom CSS selector (optional)

### Size Requirements
- Dimensions: 1280×800 **or** 640×400 pixels (1280×800 is clearer)
- Format: PNG (preferred) or JPEG
- Maximum: 15 MB per image
- Aspect ratio: 16:10 (landscape)

### Quality Tips
- Use modern pages (modern design, not ancient websites)
- Make sure text is readable at thumbnail size
- Use consistent page backgrounds where possible
- 3–4 screenshots minimum, 5 is ideal

## Quick Upload Order

In Chrome Web Store dashboard:
1. **Screenshot #1**: Popup after scan (shows what extension does)
2. **Screenshot #2**: Export progress (shows speed/responsiveness)
3. **Screenshot #3**: Exported files (shows output quality)
4. **Screenshot #4** (optional): Different detection strategy
5. **Screenshot #5** (optional): Custom selector feature

---

**👉 Once you have screenshots**, place them in `store_assets/screenshots/` 
and you're ready for store submission!
