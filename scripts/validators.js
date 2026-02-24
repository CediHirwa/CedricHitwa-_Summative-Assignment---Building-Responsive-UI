/**
 * validators.js — Regex-based validation rules.
 * Duration is stored in HOURS (0.1 – 24).
 */

export const PATTERNS = {
  titleTrim:        /^\S(?:.*\S)?$/,
  titleHasLetter:   /^(?=.*[A-Za-z]).+$/,
  duplicateWord:    /\b(\w+)\s+\1\b/i,
  duration:         /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  date:             /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  tag:              /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  timeToken:        /\b([01]\d|2[0-3]):[0-5]\d\b/
};

export function validateTitle(v) {
  if (!v || !v.trim()) return 'Title is required.';
  if (!PATTERNS.titleTrim.test(v)) return 'Title cannot start or end with spaces.';
  if (!PATTERNS.titleHasLetter.test(v)) return 'Title must contain at least one letter.';
  if (PATTERNS.duplicateWord.test(v)) return 'Title contains a repeated word.';
  return null;
}

export function validateDuration(v) {
  if (!v && v !== 0) return 'Duration is required.';
  const n = parseFloat(v);
  if (!PATTERNS.duration.test(String(v))) return 'Enter a valid number (e.g. 1.5).';
  if (n <= 0) return 'Duration must be greater than 0.';
  if (n > 24) return 'Duration cannot exceed 24 hours.';
  return null;
}

export function validateDate(v) {
  if (!v) return 'Date is required.';
  if (!PATTERNS.date.test(v)) return 'Date must be YYYY-MM-DD format.';
  return null;
}

export function validateTag(v) {
  if (!v) return 'Tag is required.';
  if (!PATTERNS.tag.test(v)) return 'Tag may only contain letters, spaces, or hyphens.';
  return null;
}

export function validateForm({ title, dueDate, duration, tag }) {
  return {
    title:    validateTitle(title),
    dueDate:  validateDate(dueDate),
    duration: validateDuration(duration),
    tag:      validateTag(tag)
  };
}
