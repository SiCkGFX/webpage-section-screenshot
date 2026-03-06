// content.js — Injected into pages to detect sections and their bounding regions

(() => {
  // Prevent double-injection
  if (window.__sectionScreenshotInjected) return;
  window.__sectionScreenshotInjected = true;

  /**
   * Detect sections based on a given strategy.
   * Returns an array of { label, top, bottom, depth } sorted by `top`.
   */
  function detectSections(strategy, customSelectors) {
    const results = [];
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );

    if (strategy === "headings" || strategy === "all") {
      document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const depth = parseInt(el.tagName[1], 10);
        const label = el.textContent.trim().slice(0, 120) || `(${el.tagName})`;
        results.push({ label, top, depth, tagName: el.tagName, strategy: "heading" });
      });
    }

    if (strategy === "semantic" || strategy === "all") {
      const semanticTags = "section, article, main, header, footer, nav, aside";
      document.querySelectorAll(semanticTags).forEach((el) => {
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const bottom = rect.bottom + window.scrollY;
        // Try to find a meaningful label
        const ariaLabel = el.getAttribute("aria-label");
        const id = el.id;
        const firstHeading = el.querySelector("h1, h2, h3, h4, h5, h6");
        const label =
          ariaLabel ||
          (id ? `#${id}` : "") ||
          (firstHeading ? firstHeading.textContent.trim().slice(0, 80) : "") ||
          `<${el.tagName.toLowerCase()}>`;
        results.push({
          label,
          top,
          bottom,
          depth: 0,
          tagName: el.tagName.toLowerCase(),
          strategy: "semantic",
        });
      });
    }

    if (strategy === "custom" || strategy === "all") {
      if (customSelectors && customSelectors.trim()) {
        try {
          document.querySelectorAll(customSelectors).forEach((el) => {
            const rect = el.getBoundingClientRect();
            const top = rect.top + window.scrollY;
            const bottom = rect.bottom + window.scrollY;
            const label =
              el.getAttribute("aria-label") ||
              el.id ||
              el.textContent.trim().slice(0, 80) ||
              `<${el.tagName.toLowerCase()}>`;
            results.push({
              label,
              top,
              bottom,
              depth: 0,
              tagName: el.tagName.toLowerCase(),
              strategy: "custom",
            });
          });
        } catch (e) {
          console.warn("Section Screenshot: invalid custom selector", e);
        }
      }
    }

    // Sort by vertical position
    results.sort((a, b) => a.top - b.top);

    // Deduplicate very close entries (within 5px)
    const deduped = [];
    for (const r of results) {
      const last = deduped[deduped.length - 1];
      if (last && Math.abs(last.top - r.top) < 5 && last.label === r.label) continue;
      deduped.push(r);
    }

    // Convert to sections with top/bottom boundaries
    // For heading-based: each heading starts a section that runs until the next heading
    const sections = [];
    for (let i = 0; i < deduped.length; i++) {
      const current = deduped[i];
      let bottom;
      if (current.bottom && current.strategy === "semantic") {
        // Semantic elements have their own bottom
        bottom = current.bottom;
      } else {
        // Headings: section runs until next detected element
        const next = deduped[i + 1];
        bottom = next ? next.top : docHeight;
      }
      sections.push({
        index: i,
        label: current.label,
        top: Math.round(current.top),
        bottom: Math.round(bottom),
        height: Math.round(bottom - current.top),
        strategy: current.strategy,
        tagName: current.tagName,
      });
    }

    return { sections, docHeight, docWidth: document.documentElement.scrollWidth };
  }

  /**
   * Get page metadata
   */
  function getPageInfo() {
    return {
      title: document.title,
      url: window.location.href,
      docHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
      docWidth: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio,
    };
  }

  // ─── Capture helpers ───
  let _savedScrollX = 0;
  let _savedScrollY = 0;
  let _savedOverflow = "";
  let _savedBodyOverflow = "";

  // Listen for messages from the popup/background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "DETECT_SECTIONS") {
      const result = detectSections(msg.strategy || "headings", msg.customSelectors || "");
      const pageInfo = getPageInfo();
      sendResponse({ ...result, pageInfo });
      return true;
    }

    if (msg.type === "GET_PAGE_INFO") {
      sendResponse(getPageInfo());
      return true;
    }

    if (msg.type === "PREPARE_CAPTURE") {
      // Save current scroll and scrollbar state
      _savedScrollX = window.scrollX;
      _savedScrollY = window.scrollY;
      _savedOverflow = document.documentElement.style.overflow;
      _savedBodyOverflow = document.body.style.overflow;

      // Measure scrollbar width before hiding it
      const scrollbarW = window.innerWidth - document.documentElement.clientWidth;

      // Hide scrollbar and compensate with padding so content doesn't shift
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      if (scrollbarW > 0) {
        document.documentElement.style.paddingRight = scrollbarW + "px";
      }
      sendResponse({ ok: true, scrollbarW });
      return true;
    }

    if (msg.type === "SCROLL_TO") {
      window.scrollTo(0, msg.y);
      sendResponse({ ok: true, scrolledTo: msg.y });
      return true;
    }

    if (msg.type === "RESTORE_CAPTURE") {
      document.documentElement.style.overflow = _savedOverflow;
      document.body.style.overflow = _savedBodyOverflow;
      document.documentElement.style.paddingRight = "";
      window.scrollTo(_savedScrollX, _savedScrollY);
      sendResponse({ ok: true });
      return true;
    }

    if (msg.type === "PING") {
      sendResponse({ ok: true });
      return true;
    }
  });
})();
