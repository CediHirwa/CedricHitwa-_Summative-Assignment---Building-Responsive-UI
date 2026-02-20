/**
 * SEARCH.JS - Regex Search & Filtering Engine
 * Handles safe regex compilation and multi-field registry searching.
 */

export const SearchEngine = {
    /**
     * Safe Regex Compiler
     * Wraps compilation in a try/catch to prevent crashes on invalid user input.
     * @param {string} pattern - The search string.
     * @param {boolean} caseInsensitive - Whether to use the 'i' flag.
     * @returns {RegExp|null}
     */
    compileRegex: (pattern, caseInsensitive = true) => {
        if (!pattern || pattern.trim() === "") return null;
        
        try {
            const flags = caseInsensitive ? 'gi' : 'g';
            return new RegExp(pattern, flags);
        } catch (error) {
            // Returns null if the user has typed an incomplete or invalid regex
            return null;
        }
    },

    /**
     * Filter Registry Tasks
     * Searches across title, category, and notes.
     * @param {Array} tasks - The list of tasks to search.
     * @param {RegExp} regex - The compiled search pattern.
     * @returns {Array} - The filtered results.
     */
    filterTasks: (tasks, regex) => {
        if (!regex) return tasks;

        return tasks.filter(task => {
            // Reset regex state for global searches
            regex.lastIndex = 0;
            
            // Combine searchable text fields
            const content = [
                task.title || task.name || "",
                task.category || "",
                task.notes || "",
                task.cancelReason || ""
            ].join(" ");

            return regex.test(content);
        });
    }
};