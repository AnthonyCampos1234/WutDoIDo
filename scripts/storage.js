export const STORAGE_KEYS = {
  AUDIT_DATA: 'wutdoido_audit_data',
  LAST_SYNC: 'wutdoido_last_sync',
};

export const StorageService = {
  saveAuditData: async (data) => {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.AUDIT_DATA]: data,
        [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error saving audit data:', error);
      return false;
    }
  },

  getAuditData: async () => {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.AUDIT_DATA]);
      return result[STORAGE_KEYS.AUDIT_DATA] || null;
    } catch (error) {
      console.error('Error getting audit data:', error);
      return null;
    }
  },

  clearAuditData: async () => {
    try {
      await chrome.storage.local.remove([STORAGE_KEYS.AUDIT_DATA, STORAGE_KEYS.LAST_SYNC]);
      return true;
    } catch (error) {
      console.error('Error clearing audit data:', error);
      return false;
    }
  }
}; 