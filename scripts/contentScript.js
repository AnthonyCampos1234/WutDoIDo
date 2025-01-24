import { CONFIG } from './config.js';
import { DegreeAuditParser } from './DegreeAuditParser.js';
import { CourseRecommender } from './CourseRecommender.js';

export default function initContentScript() {
    const parser = new DegreeAuditParser();
    const recommender = new CourseRecommender(null);
    let auditData = null;

    async function parseAudit() {
        try {
            console.log('Starting to parse audit...');
            
            const auditFrame = Array.from(document.querySelectorAll('iframe')).find(frame => 
                frame.src?.includes('audit')
            );

            if (auditFrame) {
                console.log('Found audit frame:', auditFrame);
                try {
                    await new Promise(resolve => {
                        if (auditFrame.contentDocument?.readyState === 'complete') {
                            resolve();
                        } else {
                            auditFrame.onload = resolve;
                        }
                    });

                    const frameDoc = auditFrame.contentDocument || auditFrame.contentWindow.document;
                    console.log('Frame document found, length:', frameDoc.body.innerHTML.length);

                    const frameParser = new DegreeAuditParser();
                    frameParser.document = frameDoc;
                    auditData = await frameParser.parseFromDOM();
                    console.log('Parsed audit data from frame:', auditData);
                    
                    if (auditData) {
                        console.log('Storing audit data in chrome.storage.local');
                        await chrome.storage.local.set({ 'wutdoido_audit_data': auditData });
                        console.log('Successfully stored audit data');
                    } else {
                        console.warn('No audit data to store');
                    }
                } catch (e) {
                    console.error('Error accessing frame:', e);
                }
            } else {
                console.log('No audit frame found, trying main document');
                auditData = await parser.parseFromDOM();
                console.log('Parsed audit data from main document:', auditData);
                
                if (auditData) {
                    console.log('Storing audit data in chrome.storage.local');
                    await chrome.storage.local.set({ 'wutdoido_audit_data': auditData });
                    console.log('Successfully stored audit data');
                } else {
                    console.warn('No audit data to store');
                }
            }
        } catch (error) {
            console.error('Error parsing audit:', error);
        }
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Received message:', request);
        if (request.action === 'getAuditData') {
            console.log('Sending audit data to popup:', auditData);
            sendResponse({ data: auditData });
        }
        return true;
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', parseAudit);
    } else {
        parseAudit();
    }
} 