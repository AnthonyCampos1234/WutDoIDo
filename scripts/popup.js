document.addEventListener('DOMContentLoaded', () => {
    const debugContainer = document.createElement('div');
    debugContainer.id = 'debug-logs';
    debugContainer.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: #f5f5f5;
        border-top: 1px solid #ccc;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
    `;
    document.body.appendChild(debugContainer);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DEBUG_LOG') {
        const debugContainer = document.getElementById('debug-logs');
        if (debugContainer) {
            const logEntry = document.createElement('div');
            logEntry.style.marginBottom = '5px';
            
            const timestamp = new Date().toLocaleTimeString();
            const messageText = message.message;
            const dataText = message.data ? JSON.stringify(message.data, null, 2) : '';
            
            logEntry.innerHTML = `
                <span style="color: #666;">[${timestamp}]</span>
                <span style="color: #000;">${messageText}</span>
                ${dataText ? `<pre style="margin: 5px 0; color: #444;">${dataText}</pre>` : ''}
            `;
            
            debugContainer.appendChild(logEntry);
            debugContainer.scrollTop = debugContainer.scrollHeight;
        }
    }
});

