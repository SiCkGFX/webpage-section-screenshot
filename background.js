// background.js — Single viewport capture + download handler. No debugger.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CAPTURE_VISIBLE_TAB") {
    chrome.tabs.captureVisibleTab(null, { format: "png" })
      .then((dataUrl) => sendResponse({ success: true, dataUrl }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.type === "DOWNLOAD_FILE") {
    chrome.downloads.download(
      { url: msg.url, filename: msg.filename, saveAs: msg.saveAs || false },
      (downloadId) => {
        if (chrome.runtime.lastError) sendResponse({ success: false, error: chrome.runtime.lastError.message });
        else sendResponse({ success: true, downloadId });
      }
    );
    return true;
  }
});
