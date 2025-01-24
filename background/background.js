import { CONFIG } from '../scripts/config.js';
import { StorageService } from '../scripts/storage.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('NEU Audit Helper installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncWithSupabase') {
    const { auditData, token } = request;
    
    fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/sync_audit_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': CONFIG.SUPABASE_ANON_KEY
      },
      body: JSON.stringify(auditData)
    })
    .then(response => response.json())
    .then(data => {
      chrome.tabs.create({
        url: CONFIG.IS_DEV 
          ? 'http://localhost:3000'
          : 'https://wutdoido.com'
      });
      sendResponse({ success: true, data });
    })
    .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true;
  }

  if (request.action === 'callClaude') {
    const requestBody = {
      model: "claude-3-opus-20240229",
      max_tokens: 4096,
      system: `You are a Northeastern University academic advisor assistant. Help students understand their degree requirements and recommend appropriate courses.
      When recommending courses:
      1. Analyze remaining requirements and prioritize required courses
      2. Consider prerequisites and course availability
      3. Suggest a balanced course load (mix of CS and Business courses)
      4. Explain why each course is recommended
      
      Format your responses with:
      1. Brief analysis of current status
      2. Clear course recommendations with course codes
      3. Explanation for each recommendation
      4. Important notes about prerequisites or scheduling
      
      Keep responses concise and focused on actionable recommendations.`,
      messages: [{
        role: 'user',
        content: request.message.content
      }],
    };

    console.log('Sending request to Claude:', requestBody);

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(requestBody)
    })
    .then(async response => {
      const responseText = await response.text();
      console.log('Raw API Response:', responseText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
      }
      
      try {
        return JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Failed to parse response: ${e.message}`);
      }
    })
    .then(data => {
      console.log('Claude API response:', data);
      if (data.error) {
        sendResponse({ success: false, error: data.error.message || 'API Error' });
        return;
      }
      sendResponse({ success: true, data });
    })
    .catch(error => {
      console.error('Claude API error:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        details: error.stack
      });
    });
    
    return true; 
  }

  if (request.action === 'syncWithWebsite') {
    const { auditData } = request;
    console.log('Saving audit data:', auditData);
    
    StorageService.saveAuditData(auditData).then(() => {
      console.log('Audit data saved, opening website');
      const url = CONFIG.IS_DEV 
        ? 'http://localhost:3000'
        : 'https://wutdoido.com';
      
      chrome.tabs.create({ url: url });
    }).catch(error => {
      console.error('Error saving audit data:', error);
    });

    return true;
  }
}); 