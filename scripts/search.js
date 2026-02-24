/**
 * search.js
 * Safe regex compiler and accessible text highlighting for Campus Flow.
 */

/**
 * Safely compile a user-supplied regex string.
 * Returns null if the pattern is empty or invalid.
 * @param {string} input  - raw user pattern
 * @param {string} flags  - regex flags (default 'i')
 * @returns {RegExp|null}
 */
export function compileRegex(input, flags = 'i') {
  if (!input || !input.trim()) return null;
  try {
    return new RegExp(input.trim(), flags);
  } catch {
    return null; // invalid pattern – silently return null
  }
}

/**
 * Wrap regex matches in <mark> tags for visible, accessible highlighting.
 * Escapes HTML in non-matching segments to prevent XSS.
 * @param {string} text   - plain text to search within
 * @param {RegExp|null} re - compiled regex
 * @returns {string}       - HTML string (safe to set as innerHTML)
 */
export function highlight(text, re) {
  const escaped = escapeHtml(text);
  if (!re) return escaped;
  return escaped.replace(re, m => `<mark class="search-mark">${m}</mark>`);
}

/**
 * Filter an array of records against a compiled regex.
 * Searches across title, tag, notes, and dueDate fields.
 * @param {Array}       records
 * @param {RegExp|null} re
 * @returns {Array}
 */
export function filterRecords(records, re) {
  if (!re) return records;
  return records.filter(r =>
    re.test(r.title) ||
    re.test(r.tag)   ||
    re.test(r.notes || '') ||
    re.test(r.dueDate)
  );
}

/**
 * Escape HTML special characters to prevent XSS in innerHTML assignments.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
