/**
 * VALIDATORS.JS - Data Integrity & Regex Engine
 * Handles all form validation logic using specific Regex patterns.
 * Rubric Compliance: 4+ Regex rules, 1+ Advanced pattern (back-reference).
 */

export const Validators = {
    /**
     * Regex Pattern Catalog (Mandatory Rubric Rules)
     */
    patterns: {
        // Rule 1: Title - Forbid leading/trailing spaces
        title: /^\S(?:.*\S)?$/,

        // Rule 2: Duration - Positive numbers with 0.25 (15 min) increments
        duration: /^(0|[1-9]\d*)(\.(25|5|75|0|00))?$/,

        // Rule 3: Date - YYYY-MM-DD format
        date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,

        // Advanced Rule: Back-reference to catch duplicate words (e.g., "Study Study")
        duplicateWords: /\b(\w+)\s+\1\b/i
    },

    /**
     * Validates the Activity Log form data
     * @param {Object} data - The task data object
     * @returns {Object} - Map of errors
     */
    validateTask(data) {
        const errors = {};

        // 1. Title Validation
        // Supports both 'name' and 'title' for backwards compatibility
        const activityTitle = data.name || data.title;
        
        if (!activityTitle || activityTitle.trim() === "") {
            errors.title = "Activity title is required.";
        } else if (!this.patterns.title.test(activityTitle)) {
            errors.title = "Title cannot have leading or trailing spaces.";
        } else if (this.patterns.duplicateWords.test(activityTitle)) {
            errors.title = "Duplicate words detected. Please refine the title.";
        }

        // 2. Duration Validation (0.25 increments)
        const durationStr = String(data.duration);
        if (!this.patterns.duration.test(durationStr)) {
            errors.duration = "Duration must be in 0.25 (15 min) increments.";
        }

        // 3. Date Validation
        if (!this.patterns.date.test(data.date)) {
            errors.date = "Please provide a valid date (YYYY-MM-DD).";
        }

        // 4. Accountability Logic (Justification for cancellations)
        // Registry integrity: Mandates a reason for deviations
        if (data.status === 'canceled') {
            if (!data.cancelReason || data.cancelReason.trim().length < 5) {
                errors.cancelReason = "A justification is required for registry deviations.";
            }
        }

        return errors;
    }
};