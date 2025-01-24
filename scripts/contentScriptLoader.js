(async function() {
    const src = chrome.runtime.getURL('scripts/contentScript.js');
    const contentScript = await import(src);
    
    contentScript.default();
})(); 