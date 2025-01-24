console.log('Website content script loaded');

function exposeDataToWindow(data) {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/injectData.js');
    script.onload = function() {
      window.postMessage({
        type: 'WUTDOIDO_SET_DATA',
        data: data
      }, '*');
    };
    document.documentElement.appendChild(script);
    
    console.log('Data exposure script injected');
    return true;
  } catch (error) {
    console.error('Error exposing data:', error);
    return false;
  }
}

async function initializeFromStorage() {
  try {
    const result = await chrome.storage.local.get(['wutdoido_audit_data']);
    console.log('Storage result:', result);
    
    if (result.wutdoido_audit_data) {
      return exposeDataToWindow(result.wutdoido_audit_data);
    }
    return false;
  } catch (error) {
    console.error('Error accessing storage:', error);
    return false;
  }
}

initializeFromStorage();

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.wutdoido_audit_data) {
    exposeDataToWindow(changes.wutdoido_audit_data.newValue);
  }
}); 