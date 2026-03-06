# Webpage Section Screenshot — Browser Extension

Capture full-page screenshots and export them split by logical page sections (detected automatically via headings, semantic HTML, or custom CSS selectors). Perfect for documenting reports, saving parts of articles, or archiving dashboard sections without bloated monolithic screenshots.

## Features

- **Automatic section detection** — finds sections by headings (`<h1>`–`<h6>`), semantic HTML elements (`<section>`, `<article>`, `<main>`, `<nav>`, `<footer>`, etc.), custom CSS selectors, or a combination of all
- **Selective export** — choose exactly which sections to capture with checkboxes
- **Smart grouping** — split or merge detected sections into export groups; each group becomes one file
- **Flexible formats** — export as PNG or JPEG at original resolution
- **Batch export** — multiple groups automatically packaged into a single `.zip` file
- **Full-page fallback** — can export the entire page as a single image
- **No external dependencies** — ZIP creation is bundled locally; fully offline after install
- **Zero data collection** — no tracking, no accounts, no telemetry

## Installation

### Chrome / Brave / Edge

1. Clone or download this repository
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`)
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `section-screenshot` folder
5. The extension icon will appear in your toolbar — pin it for quick access

## How to Use

1. Navigate to any web page
2. Click the **Webpage Section Screenshot** extension icon
3. **Select a detection strategy:**
   - **Headings** — splits at each `<h1>` through `<h6>` on the page
   - **Semantic** — finds sectioning elements like `<section>`, `<article>`, `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>`
   - **Custom** — enter a CSS selector to find custom elements (e.g., `.card`, `[data-section]`)
   - **All** — combines all three strategies
4. Click **Scan Page Sections** — the extension analyzes the DOM and lists detected regions
5. **Review and select sections:**
   - Click checkboxes to include/exclude sections
   - Use the **Select all** button to toggle all at once
   - Click the line between sections to split or merge groups
6. Choose your **export format** (PNG or JPEG)
7. Click **Export** to download selected sections:
   - **Single group** → one image file
   - **Multiple groups** → one `.zip` archive containing all groups
   - **Full Page** → entire page as one image

## How It Works

**Scroll-and-stitch capture:**
- The extension temporarily hides the scrollbar, then scrolls through the entire page in viewport-sized increments
- At each step, it captures the visible area using `chrome.tabs.captureVisibleTab()`
- All slices are stitched together on a canvas, creating a full-page image at device pixel ratio
- Sections are then cropped from this canvas and exported at original resolution

**Section detection:**
- A content script injects into the active page and uses `getBoundingClientRect()` to measure each detected element
- Headings create section boundaries (each heading starts a new section that runs until the next heading)
- Semantic elements are measured by their own bounds
- Custom selectors are queried as-is and measured by their bounding rectangles
- All results are deduplicated and sorted by vertical position

**Export:**
- Uses a custom ZIP builder (bundled as `lib/minizip.js`) — no external CDN dependencies
- All files are included directly in the extension; export works completely offline

## Permissions Explained

- **activeTab** — allows the extension to access the currently visible tab for screenshot capture only; required when you click the icon
- **scripting** — allows injection of the section-detection script when needed; required to analyze the page DOM
- **downloads** — allows the extension to save exported PNG/JPEG/ZIP files to your computer
- **storage** — allows the extension to remember your preferred detection strategy and export format between sessions

## Limitations

- Cannot capture pages on `chrome://`, `brave://`, `edge://`, or extension pages (browser security policy)
- Very tall pages (>50,000px) may be slow to capture due to scrolling delays and viewport measurements
- Extremely long pages at high DPI may exceed canvas size limits; the extension will warn you if this happens and suggest exporting fewer sections at once

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Cannot access this page"** | The extension cannot run on browser system pages (`chrome://`, `brave://`) or extension manager pages. Only regular websites are supported. |
| **No sections detected** | Try a different detection strategy; some pages use non-standard markup that don't have clear semantic elements. The "All" strategy often finds something. |
| **Export is very slow** | Large pages require more scroll steps. A 30,000px page with 2× device pixel ratio needs ~60 captures. This is normal. |
| **Export fails silently** | Check the debug panel (gear icon → expand Debug) for error messages. Common causes: out-of-memory on extremely large pages, or browser blocking too many rapid captures. |

## Development

Built with:
- **Manifest V3** — modern Chrome extension architecture
- **Canvas API** — stitching and cropping
- **MiniZip** — custom ZIP builder with no external dependencies
- **System fonts** — no remote dependencies

## Feedback & Support

If you find this useful or have feature requests, please open an issue or discussion on the [GitHub repository](https://github.com/**/).
