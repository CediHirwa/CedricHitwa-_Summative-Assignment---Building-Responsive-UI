/**
 * DATA.JS - Central State Definitions
 * Handles initial state, settings registry, and mock records.
 */

export const InitialState = {
    // Registry Settings
    settings: {
        capacity: 8,
        // Categories with support for the color selector logic
        categories: [
            { id: 'academic', label: 'Academic', color: '#3b82f6', type: 'work' },
            { id: 'professional', label: 'Professional', color: '#1e293b', type: 'work' },
            { id: 'social', label: 'Social', color: '#f97316', type: 'life' },
            { id: 'self-care', label: 'Self Care', color: '#2dd4bf', type: 'life' }
        ]
    },
    
    // Core Task Data
    tasks: [],

    // Current View State
    viewDate: { 
        month: new Date().getMonth(), 
        year: new Date().getFullYear() 
    }
};

/**
 * Utility to generate unique record IDs
 */
export const generateId = () => {
    return `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};