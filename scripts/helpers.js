/**
 * HELPERS.JS - UI Utilities & Accessibility Support
 * Handles timezone detection, work-life balance metrics, and duration formatting.
 */

export const Helpers = {
    /**
     * Formats 24h time to 12h with detected local timezone (e.g., CAT / GMT+2)
     * @param {string} timeStr - "HH:MM"
     * @returns {string} - "h:mm AM/PM (TZ)"
     */
    formatTimeWithZone: (timeStr) => {
        if (!timeStr) return "--:--";
        const [hours, minutes] = timeStr.split(':');
        let h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;

        // Detect Local Timezone Name (e.g., CAT, EST, etc.)
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const tzName = new Intl.DateTimeFormat('en-US', {
            timeZoneName: 'short',
            timeZone: timezone
        }).formatToParts(new Date()).find(p => p.type === 'timeZoneName').value;

        return `${h}:${minutes} ${ampm} (${tzName})`;
    },

    /**
     * Calculates the Balance Index (Work vs Life)
     * Comparing productivity (Academic/Professional) vs equilibrium (Social/Self-Care).
     * @param {Array} tasks - List of registry entries.
     * @param {Array} categories - Settings category registry.
     */
    calculateBalance: (tasks, categories) => {
        const stats = { work: 0, life: 0 };
        
        tasks.forEach(t => {
            // Match category by ID or Label
            const cat = categories.find(c => c.id === t.category || c.label === t.category);
            if (cat) {
                const type = cat.type || 'work';
                stats[type] += t.duration;
            }
        });
        
        const total = stats.work + stats.life || 1;
        return {
            workPerc: (stats.work / total) * 100,
            lifePerc: (stats.life / total) * 100,
            workHrs: stats.work.toFixed(1),
            lifeHrs: stats.life.toFixed(1)
        };
    },

    /**
     * Converts decimal hours to a readable string (e.g., 1.25 -> "1h 15m")
     * @param {number} hours 
     */
    formatDuration: (hours) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    },

    /**
     * Accessible Regex Highlighting
     * @param {string} text 
     * @param {RegExp} regex 
     */
    highlight: (text, regex) => {
        if (!regex || !text) return text;
        regex.lastIndex = 0;
        return text.replace(regex, (match) => `<mark class="search-highlight">${match}</mark>`);
    },

    /**
     * ARIA Live Announcements for screen readers
     */
    announce: (message, assertive = false) => {
        const announcer = document.getElementById('capacity-announcer');
        if (!announcer) return;

        announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
        announcer.textContent = '';
        setTimeout(() => {
            announcer.textContent = message;
        }, 100);
    }
};