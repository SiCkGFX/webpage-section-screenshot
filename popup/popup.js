// popup.js — Instant capture + individual select + merge groups

(function () {
  "use strict";

  // ── Debug ──
  const dbgEl = document.getElementById("dbg"), dbgL = document.getElementById("dbgL");
  document.getElementById("dbgBtn").addEventListener("click", () => dbgEl.classList.toggle("vis"));
  document.getElementById("dbgClr").addEventListener("click", () => { dbgL.innerHTML = ""; });
  function log(m, l = "i") {
    const t = new Date().toLocaleTimeString("en-US", { hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit", fractionalSecondDigits:3 });
    const e = document.createElement("div"); e.className = `le ${l}`;
    e.innerHTML = `<span class="t">${t}</span>${esc(String(m))}`;
    dbgL.appendChild(e); dbgL.scrollTop = dbgL.scrollHeight;
    (l === "e" ? console.error : l === "w" ? console.warn : console.log)(`[SS] ${m}`);
  }

  // ── State ──
  let tabId = null, sections = [], selected = new Set(), splits = new Set();
  let fullImg = null, _pr = 1, docW = 0, docH = 0;
  let strategy = "headings";

  // ── Elements ──
  const pills = document.querySelectorAll("#pills .pill");
  const custRow = document.getElementById("custRow"), custSel = document.getElementById("custSel");
  const fmt = document.getElementById("fmt"), scanBtn = document.getElementById("scanBtn");
  const stBar = document.getElementById("st"), stT = document.getElementById("stT");
  const empty = document.getElementById("empty"), listWrap = document.getElementById("listWrap");
  const listEl = document.getElementById("listEl"), secCnt = document.getElementById("secCnt");
  const selAll = document.getElementById("selAll");
  const xbar = document.getElementById("xbar"), xBtn = document.getElementById("xBtn"), xLbl = document.getElementById("xLbl");
  const xFull = document.getElementById("xFull");
  const prog = document.getElementById("prog"), progT = document.getElementById("progT");

  // Save format preference on change
  fmt.addEventListener("change", () => {
    chrome.storage.local.set({ format: fmt.value }, () => log(`Saved format: ${fmt.value}`));
  });

  // Save custom selector preference on change
  custSel.addEventListener("change", () => {
    chrome.storage.local.set({ customSelector: custSel.value }, () => log(`Saved custom selector`));
  });
  custSel.addEventListener("blur", () => {
    chrome.storage.local.set({ customSelector: custSel.value });
  });

  // ── Init ──
  log("Popup opened");
  
  // Load saved preferences
  chrome.storage.local.get(["strategy", "format", "customSelector"], (items) => {
    if (items.strategy && items.strategy !== strategy) {
      strategy = items.strategy;
      pills.forEach(p => {
        if (p.dataset.s === strategy) {
          p.classList.add("on");
        } else {
          p.classList.remove("on");
        }
      });
      custRow.classList.toggle("vis", strategy === "custom" || strategy === "all");
      log(`Loaded strategy: ${strategy}`);
    }
    if (items.format && items.format !== fmt.value) {
      fmt.value = items.format;
      log(`Loaded format: ${items.format}`);
    }
    if (items.customSelector && items.customSelector !== custSel.value) {
      custSel.value = items.customSelector;
      log(`Loaded custom selector`);
    }
  });
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    tabId = tabs[0].id;
    log(`Tab: ${tabs[0].url}`);
    chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }, () => {
      if (chrome.runtime.lastError) { log(`Inject fail: ${chrome.runtime.lastError.message}`, "e"); setSt("er", "Cannot access this page"); }
      else log("Content script OK", "s");
    });
  });

  // ── Strategy ──
  pills.forEach(p => p.addEventListener("click", () => {
    pills.forEach(x => x.classList.remove("on")); p.classList.add("on");
    strategy = p.dataset.s;
    custRow.classList.toggle("vis", strategy === "custom" || strategy === "all");
    chrome.storage.local.set({ strategy }, () => log(`Saved strategy: ${strategy}`));
  }));

  // ── Scan ──
  scanBtn.addEventListener("click", async () => {
    if (!tabId) return;
    setSt("wk", "Scanning…"); scanBtn.disabled = true;
    try {
      const r = await msgTab({ type: "DETECT_SECTIONS", strategy, customSelectors: custSel.value });
      if (!r?.sections) throw new Error("No response");
      sections = r.sections; docW = r.docWidth; docH = r.docHeight;
      log(`${sections.length} sections, page ${docW}x${docH}`);
      if (!sections.length) { setSt("er", "No sections found"); return; }
      selected.clear(); sections.forEach((_, i) => selected.add(i));
      splits.clear();
      setSt("ok", `${sections.length} sections`);
      render();
    } catch (e) { log(`Scan: ${e.message}`, "e"); setSt("er", e.message); }
    finally { scanBtn.disabled = false; }
  });

  // ── Compute groups from selected + splits ──
  function getGroups() {
    // Only include selected sections, in order
    const sel = [...selected].sort((a, b) => a - b);
    if (!sel.length) return [];

    const groups = []; let cur = [sel[0]];
    for (let i = 1; i < sel.length; i++) {
      const prev = sel[i - 1];
      // Split if there's a split marker OR if indices aren't consecutive (deselected section between)
      if (splits.has(prev) || sel[i] !== prev + 1) {
        groups.push(cur); cur = [sel[i]];
      } else {
        cur.push(sel[i]);
      }
    }
    groups.push(cur);

    return groups.map((idxs, gi) => {
      const secs = idxs.map(i => sections[i]);
      const top = secs[0].top;
      const last = secs[secs.length - 1];
      const bottom = last.top + last.height;
      return { indices: idxs, sections: secs, top, bottom, height: bottom - top,
        label: secs.length === 1 ? secs[0].label : `${secs[0].label} → ${last.label}` };
    });
  }

  // ── Render ──
  function render() {
    empty.style.display = "none"; listWrap.style.display = "block"; xbar.style.display = "flex";
    secCnt.textContent = `${sections.length} sections · ${selected.size} selected`;
    selAll.textContent = selected.size === sections.length ? "Deselect all" : "Select all";

    const groups = getGroups();
    listEl.innerHTML = "";

    // Build a flat render: for each section, determine its group color
    const secGroupMap = new Map();
    groups.forEach((g, gi) => g.indices.forEach(idx => secGroupMap.set(idx, gi)));

    let currentGroupIdx = -1;
    let groupBlock = null;

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const gi = secGroupMap.get(i);
      const isSelected = selected.has(i);

      // Start a new group block if needed
      if (isSelected && gi !== currentGroupIdx) {
        if (groupBlock) listEl.appendChild(groupBlock);
        // If there was a previous group, add a split/merge divider
        if (currentGroupIdx >= 0) {
          const divIdx = groups[currentGroupIdx].indices[groups[currentGroupIdx].indices.length - 1];
          const isSplit = splits.has(divIdx);
          const dv = mkDiv(divIdx, isSplit);
          listEl.appendChild(dv);
        }
        currentGroupIdx = gi;
        groupBlock = document.createElement("div");
        groupBlock.className = `grp gc${gi % 6}`;
        const hdr = document.createElement("div"); hdr.className = "grp-hdr";
        hdr.innerHTML = `<span>Group ${gi + 1}</span><span style="font-weight:400;opacity:.7">${groups[gi].sections.length} section${groups[gi].sections.length > 1 ? "s" : ""}</span>`;
        groupBlock.appendChild(hdr);
      }

      // Section row
      const row = document.createElement("div");
      row.className = `sr${isSelected ? " on" : ""}`;
      row.innerHTML = `<div class="ck"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><polyline points="2 6 5 9 10 3"/></svg></div><span class="nm" title="${esc(sec.label)}">${esc(sec.label)}</span><span class="mt">${sec.height}px</span>`;
      row.addEventListener("click", () => { toggle(i); render(); });

      if (isSelected && groupBlock) {
        groupBlock.appendChild(row);

        // Internal merge divider (between consecutive selected sections in same group)
        const nextIdx = i + 1;
        if (nextIdx < sections.length && selected.has(nextIdx) && secGroupMap.get(nextIdx) === gi) {
          const innerDv = document.createElement("div");
          innerDv.className = "dv merged";
          innerDv.innerHTML = `<span class="dl">✂ split</span>`;
          innerDv.addEventListener("click", (e) => { e.stopPropagation(); splits.add(i); log(`Split after #${i}`); render(); });
          groupBlock.appendChild(innerDv);
        }
      } else {
        // Deselected section — render outside any group
        if (groupBlock) { listEl.appendChild(groupBlock); groupBlock = null; currentGroupIdx = -1; }
        row.style.margin = "0 10px 0 16px"; row.style.opacity = "0.45"; row.style.borderLeft = "3px solid transparent";
        listEl.appendChild(row);
      }
    }
    if (groupBlock) listEl.appendChild(groupBlock);

    updateXBtn(groups);
  }

  function mkDiv(idx, isSplit) {
    const dv = document.createElement("div");
    dv.className = `dv ${isSplit ? "split" : "merged"}`;
    dv.innerHTML = `<span class="dl">${isSplit ? "⊕ merge" : "✂ split"}</span>`;
    dv.addEventListener("click", () => {
      if (isSplit) splits.delete(idx); else splits.add(idx);
      log(`${isSplit ? "Merge" : "Split"} at #${idx}`);
      render();
    });
    return dv;
  }

  function toggle(i) { if (selected.has(i)) selected.delete(i); else selected.add(i); }

  selAll.addEventListener("click", () => {
    if (selected.size === sections.length) selected.clear();
    else sections.forEach((_, i) => selected.add(i));
    render();
  });

  function updateXBtn(groups) {
    xBtn.disabled = !groups.length;
    xLbl.textContent = groups.length ? `Export ${groups.length} Group${groups.length > 1 ? "s" : ""}` : "Export";
  }

  // ── Capture (scroll-and-stitch, no debugger) ──
  async function ensureCapture() {
    if (fullImg) return;
    log("Capturing full page (scroll-and-stitch)…");

    // Get fresh page info
    const pi = await msgTab({ type: "GET_PAGE_INFO" });
    const vpH = pi.viewportHeight;
    const totalSlices = Math.ceil(pi.docHeight / vpH);
    log(`Page: ${pi.docWidth}x${pi.docHeight}, vpH=${vpH}, slices=${totalSlices}`);
    showProg(`Capturing… 0/${totalSlices} slices`);

    // Prepare page (hide scrollbar, save scroll)
    await msgTab({ type: "PREPARE_CAPTURE" });

    const sliceDataUrls = [];
    try {
      for (let i = 0; i < totalSlices; i++) {
        const scrollY = i * vpH;
        await msgTab({ type: "SCROLL_TO", y: scrollY });
        await sleep(600); // respect Chrome rate limit

        let dataUrl = null;
        for (let attempt = 0; attempt <= 3; attempt++) {
          try {
            const resp = await chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" });
            if (!resp.success) throw new Error(resp.error);
            dataUrl = resp.dataUrl;
            break;
          } catch (err) {
            if (err.message?.includes("MAX_CAPTURE") && attempt < 3) {
              log(`Rate limited, retry ${attempt + 1}…`, "w");
              await sleep(1000 * (attempt + 1));
            } else throw err;
          }
        }
        sliceDataUrls.push({ dataUrl, scrollY, usableHeight: Math.min(vpH, pi.docHeight - scrollY) });
        updateProg(`Capturing… ${i + 1}/${totalSlices} slices`);
      }
    } finally {
      await msgTab({ type: "RESTORE_CAPTURE" });
    }

    // Stitch on canvas
    updateProg("Stitching…");
    log("Stitching slices…");
    const firstImg = await loadImg(sliceDataUrls[0].dataUrl);
    const pxW = firstImg.naturalWidth;
    const pxVpH = firstImg.naturalHeight;
    const pixelRatio = pxVpH / vpH;
    const totalPxH = Math.round(pi.docHeight * pixelRatio);

    // Canvas size safety check (Chrome limit is ~256MP)
    const canvasArea = pxW * totalPxH;
    const maxArea = 256 * 1024 * 1024;
    if (canvasArea > maxArea) {
      const actualMp = (canvasArea / 1024 / 1024).toFixed(1);
      throw new Error(`Page too large for single capture: ${actualMp}MP exceeds canvas limit. Try exporting fewer sections or splitting into smaller groups.`);
    }

    const canvas = document.createElement("canvas");
    canvas.width = pxW;
    canvas.height = totalPxH;
    const ctx = canvas.getContext("2d");

    for (let i = 0; i < sliceDataUrls.length; i++) {
      const s = sliceDataUrls[i];
      const img = i === 0 ? firstImg : await loadImg(s.dataUrl);
      const destY = Math.round(s.scrollY * pixelRatio);
      const usablePx = Math.round(s.usableHeight * pixelRatio);
      if (usablePx < pxVpH) {
        ctx.drawImage(img, 0, 0, pxW, usablePx, 0, destY, pxW, usablePx);
      } else {
        ctx.drawImage(img, 0, destY);
      }
    }

    fullImg = await loadImg(canvas.toDataURL("image/png"));
    docH = pi.docHeight;
    docW = pi.docWidth;
    _pr = pixelRatio;
    log(`Stitched: ${fullImg.naturalWidth}x${fullImg.naturalHeight}, ratio=${_pr.toFixed(3)}`, "s");
    hideProg();
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Crop ──
  function crop(top, height) {
    const c = document.createElement("canvas"), ctx = c.getContext("2d");
    const w = fullImg.naturalWidth;
    const sy = Math.max(0, Math.round(top * _pr));
    const sh = Math.min(Math.round(height * _pr), fullImg.naturalHeight - sy);
    c.width = w; c.height = sh;
    ctx.drawImage(fullImg, 0, sy, w, sh, 0, 0, w, sh);
    return c;
  }

  // ── Export ──
  xBtn.addEventListener("click", async () => {
    const groups = getGroups();
    if (!groups.length) return;
    log(`--- EXPORT ${groups.length} groups ---`);
    try {
      await ensureCapture();
      const format = fmt.value;
      const mime = format === "jpeg" ? "image/jpeg" : "image/png";
      const ext = format === "jpeg" ? "jpg" : "png";

      if (groups.length === 1) {
        showProg("Exporting…");
        const canvas = crop(groups[0].top, groups[0].height);
        const blob = await toBlob(canvas, mime);
        log(`Single group: ${(blob.size/1024).toFixed(0)}KB`, "s");
        await dl(blob, `group-1-${san(groups[0].label)}.${ext}`);
        hideProg(); setSt("ok", "Exported!");
      } else {
        showProg("Packing zip…");
        log("Using bundled MiniZip");
        const zip = new MiniZip();
        for (let i = 0; i < groups.length; i++) {
          const canvas = crop(groups[i].top, groups[i].height);
          const blob = await toBlob(canvas, mime);
          await zip.addBlob(`group-${i+1}-${san(groups[i].label)}.${ext}`, blob);
          log(`Zip +group ${i+1}: ${(blob.size/1024).toFixed(0)}KB`);
          updateProg(`Packing ${i+1}/${groups.length}…`);
        }
        updateProg("Generating zip…");
        const zb = zip.generate();
        log(`Zip: ${(zb.size/1024).toFixed(0)}KB`, "s");
        await dl(zb, "sections-export.zip");
        hideProg(); setSt("ok", `Exported ${groups.length} groups as zip!`);
      }
    } catch (e) { log(`Export err: ${e.message}\n${e.stack}`, "e"); setSt("er", e.message); hideProg(); }
  });

  xFull.addEventListener("click", async () => {
    log("--- FULL PAGE ---");
    try {
      await ensureCapture();
      showProg("Exporting full page…");
      const format = fmt.value;
      const mime = format === "jpeg" ? "image/jpeg" : "image/png";
      const ext = format === "jpeg" ? "jpg" : "png";
      const c = crop(0, docH);
      const blob = await toBlob(c, mime);
      log(`Full page: ${(blob.size/1024).toFixed(0)}KB`, "s");
      await dl(blob, `full-page.${ext}`);
      hideProg(); setSt("ok", "Full page exported!");
    } catch (e) { log(`Full err: ${e.message}`, "e"); setSt("er", e.message); hideProg(); }
  });

  // ── Helpers ──
  function msgTab(m) { return new Promise((res, rej) => { chrome.tabs.sendMessage(tabId, m, r => chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res(r)); }); }
  function setSt(c, t) { stBar.className = `st ${c}`; stT.textContent = t; }
  function showProg(t) { progT.textContent = t; prog.classList.add("vis"); }
  function updateProg(t) { progT.textContent = t; }
  function hideProg() { prog.classList.remove("vis"); }
  function toBlob(c, m) { return new Promise((r, j) => c.toBlob(b => b ? r(b) : j(new Error("toBlob null")), m, .92)); }
  function dl(blob, fn) {
    return new Promise((res, rej) => {
      const rd = new FileReader();
      rd.onload = () => chrome.runtime.sendMessage({ type: "DOWNLOAD_FILE", url: rd.result, filename: fn, saveAs: false },
        r => { if (chrome.runtime.lastError) { log(`DL err: ${chrome.runtime.lastError.message}`, "e"); rej(new Error(chrome.runtime.lastError.message)); } else if (r?.success) { log(`DL OK: ${fn}`, "s"); res(r); } else { log(`DL fail: ${JSON.stringify(r)}`, "e"); rej(new Error(r?.error || "DL fail")); } });
      rd.onerror = () => rej(new Error("FileReader fail"));
      rd.readAsDataURL(blob);
    });
  }
  function loadImg(s) { return new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error("Img load fail")); i.src = s; }); }
  function san(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 35); }
  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
})();
