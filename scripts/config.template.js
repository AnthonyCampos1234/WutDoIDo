// Template configuration file
// Copy this file to config.js and fill in the API keys -> this is just so you can see what the config file looks like

export const CONFIG = {
    CLAUDE: {
        API_KEY: 'your_claude_api_key_here',
        MODEL: 'claude-3-sonnet-20240229',
        MAX_TOKENS: 4096
    },

    GOOGLE: {
        CLIENT_ID: 'your_google_client_id_here',
        API_KEY: 'your_google_api_key_here',
        SCOPES: ['https://www.googleapis.com/auth/spreadsheets']
    },

    EXTENSION: {
        DEBUG: false,
        VERSION: '1.0.0'
    }
};