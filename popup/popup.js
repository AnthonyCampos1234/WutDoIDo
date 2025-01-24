import { SheetsService } from '../scripts/sheetsService.js';

console.log('Popup script loaded!');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded');
  const input = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const chatMessages = document.getElementById('chat-messages');
  const statusMessage = document.getElementById('status-message');
  const createSheetButton = document.getElementById('create-sheet-button');
  let auditData = null;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('Current tab URL:', tab.url);
  if (!tab.url || !(tab.url.includes('northeastern.edu') || tab.url.includes('uachieve.com'))) {
    statusMessage.textContent = 'Please navigate to your NEU degree audit page';
    console.log('Not on NEU page');
    return;
  }

  try {
    console.log('Checking chrome.storage.local for audit data');
    const result = await chrome.storage.local.get(['wutdoido_audit_data']);
    if (result.wutdoido_audit_data) {
      console.log('Found audit data in storage:', result.wutdoido_audit_data);
      auditData = result.wutdoido_audit_data;
      addMessage('bot', 'Hi! I can help you understand your degree audit and recommend courses. What would you like to know?');
    } else {
      console.log('No audit data found in storage, requesting from content script');
      try {
        console.log('Attempting to get audit data from tab:', tab.id);
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getAuditData' });
        console.log('Response from content script:', response);
        if (response && response.data) {
          auditData = response.data;
          console.log('Successfully got audit data:', auditData);
          addMessage('bot', 'Hi! I can help you understand your degree audit and recommend courses. What would you like to know?');
        } else {
          console.warn('No audit data in response');
          statusMessage.textContent = 'No audit data found. Please refresh the page.';
        }
      } catch (error) {
        console.error('Error getting audit data from content script:', error);
        statusMessage.textContent = 'Error loading audit data. Please refresh the page.';
      }
    }
  } catch (error) {
    console.error('Error accessing storage:', error);
    statusMessage.textContent = 'Error accessing storage. Please try again.';
  }

  sendButton.addEventListener('click', () => {
    console.log('Send button clicked');
    try {
      sendMessage();
    } catch (error) {
      console.error('Error in click handler:', error);
    }
  });
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  createSheetButton.addEventListener('click', async () => {
    if (!auditData) {
      console.warn('No audit data available for creating sheet');
      statusMessage.textContent = 'No audit data available. Please refresh the page.';
      return;
    }

    try {
      console.log('Creating Google Sheet with audit data:', auditData);
      const sheetsService = new SheetsService();
      const spreadsheetId = await sheetsService.createSpreadsheet(auditData);
      console.log('Created spreadsheet:', spreadsheetId);
      
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      window.open(spreadsheetUrl, '_blank');
      
      statusMessage.textContent = 'Course planning sheet created successfully!';
    } catch (error) {
      console.error('Error creating sheet:', error);
      statusMessage.textContent = 'Error creating sheet. Please try again.';
    }
  });

  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    console.log('Sending message:', message);
    const messageContent = auditData 
      ? `You are helping a Northeastern University student plan their courses.

        Student's Current Status:
        - Program: ${auditData.studentInfo.program}
        - Completed Courses: ${JSON.stringify(auditData.completedCourses.map(c => 
          `${c.code} (${c.name}) - Grade: ${c.grade}`))}
        
        Requirements Needing Completion:
        ${Object.entries(auditData.requirements)
          .filter(([_, req]) => req.status?.includes('NEEDS'))
          .map(([name, req]) => 
            `- ${name}: Needs ${req.requiredCourses - (req.courses?.length || 0)} more courses
             Available options: ${req.courseOptions?.join(', ')}`)
          .join('\n')}
        
        Currently Registered Courses:
        ${auditData.requirements['THE FOLLOWING COURSES ARE CURRENT REGISTERED']?.courses
          ?.map(c => `${c.code} (${c.name})`)
          .join('\n') || 'None'}

        Student Question: ${message}`
      : `The user is asking about their courses: ${message}. Respond that this is a test and they need to navigate to their degree audit page.`;

    addMessage('user', message);
    input.value = '';

    input.disabled = true;
    sendButton.disabled = true;
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    chatMessages.appendChild(loadingDiv);
    statusMessage.textContent = 'Loading...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'callClaude',
        message: {
          role: 'user',
          content: messageContent
        }
      });

      console.log('Response from background:', response);
      if (!response?.success) {
        throw new Error(response?.error || 'API Error');
      }
      if (response.data && response.data.content && Array.isArray(response.data.content)) {
        addMessage('bot', response.data.content[0].text);
      } else {
        console.error('Unexpected API response format:', response.data);
        throw new Error('Unexpected API response format');
      }
    } catch (error) {
      console.error('Claude API Error:', error);
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error.message.includes('401')) {
        errorMessage = 'Authentication error. Please check the API key.';
        console.error('Invalid API key');
      } else if (error.message.includes('API response format')) {
        errorMessage = 'Error processing the response. Please try again.';
      } else {
        console.error('Full error:', error);
      }
      addMessage('bot', errorMessage);
    } finally {
      input.disabled = false;
      sendButton.disabled = false;
      statusMessage.textContent = '';
      const loadingDiv = document.querySelector('.loading');
      if (loadingDiv) loadingDiv.remove();
    }
  }

  function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    const formattedContent = content
      .replace(/\n\n/g, '<br><br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/## (.*?)\n/g, '<h2>$1</h2>')
      .replace(/\* (.*?)(\n|$)/g, '<li>$1</li>')
      .replace(/(\<li\>.*?\<\/li\>(\n|$))+/g, '<ul>$&</ul>')
      .replace(/([A-Z]{2,4}\s*\d{4})/g, '<code>$1</code>');
    
    messageDiv.innerHTML = formattedContent;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}); 