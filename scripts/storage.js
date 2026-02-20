/**
 * STORAGE.JS - Persistence & Data Exchange
 * Handles localStorage sync and JSON portability for the Campus Flow registry.
 */

const STORAGE_KEY = 'campus_flow_registry';

export const Storage = {
    /**
     * Saves application state to local storage.
     * @param {Object} data - The state object to persist.
     */
    save: (data) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Storage Error: Failed to save registry to local memory.", e);
        }
    },

    /**
     * Loads application state from local storage.
     * @returns {Object|null} - The parsed state object or null if empty/corrupted.
     */
    load: () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("Storage Error: Local registry data is corrupted or missing.", e);
            return null;
        }
    },

    /**
     * Triggers a browser download of the registry as a formatted JSON file.
     * @param {Object} data - The data object to export.
     */
    exportJSON: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = `campus-flow-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        // Cleanup memory
        URL.revokeObjectURL(url);
    },

    /**
     * Validates and imports a JSON string into the application state.
     * @param {string} jsonString - Raw JSON text from file input.
     * @returns {Object} - Result object { success: boolean, data?: Object, error?: string }
     */
    importJSON: (jsonString) => {
        try {
            const parsed = JSON.parse(jsonString);
            
            // Structural validation: Ensure it's the correct schema
            if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) {
                throw new Error("Invalid registry format: Missing mandatory 'tasks' array.");
            }

            return { success: true, data: parsed };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    /**
     * Wipes all registry data from local storage.
     */
    clear: () => {
        localStorage.removeItem(STORAGE_KEY);
    }
};