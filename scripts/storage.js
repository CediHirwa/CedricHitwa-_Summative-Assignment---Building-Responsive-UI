/**
 * storage.js — localStorage persistence + JSON import/export
 */

const RECORDS_KEY  = 'campusflow:records';
const SETTINGS_KEY = 'campusflow:settings';

export function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveRecords(records) {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); }
  catch (e) { console.error('Storage error:', e); }
}

export const DEFAULT_SETTINGS = {
  dailyCap: 8,
  tags: [
    { id: 'academic',     label: 'Academic',     color: '#3b82f6', protected: true },
    { id: 'professional', label: 'Professional', color: '#1e293b', protected: true },
    { id: 'social',       label: 'Social',       color: '#f97316', protected: true },
    { id: 'health',       label: 'Health',       color: '#22c55e', protected: true },
    { id: 'personal',     label: 'Personal',     color: '#a855f7', protected: true }
  ]
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, tags: DEFAULT_SETTINGS.tags.map(t => ({...t})) };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch (e) { console.error('Settings storage error:', e); }
}

export function exportJSON(records) {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'campusflow.json'; a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file, onSuccess, onError) {
  if (!file) { onError('No file selected.'); return; }
  if (!file.name.endsWith('.json')) { onError('File must be a .json file.'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      onSuccess(validateImport(parsed));
    } catch (err) { onError('Invalid JSON: ' + err.message); }
  };
  reader.onerror = () => onError('Failed to read file.');
  reader.readAsText(file);
}

function validateImport(data) {
  if (!Array.isArray(data)) throw new Error('Root must be a JSON array.');
  if (data.length === 0) throw new Error('File contains no records.');
  const now = new Date().toISOString();
  return data.map((item, i) => {
    if (typeof item !== 'object' || item === null) throw new Error(`Item at index ${i} is not an object.`);
    if (!item.id)      throw new Error(`Record ${i} missing "id".`);
    if (!item.title)   throw new Error(`Record ${i} missing "title".`);
    if (!item.dueDate) throw new Error(`Record ${i} missing "dueDate".`);
    if (item.duration == null) throw new Error(`Record ${i} missing "duration".`);
    return {
      id: String(item.id), title: String(item.title),
      dueDate: String(item.dueDate), duration: parseFloat(item.duration) || 0,
      tag: String(item.tag || 'Personal'), notes: String(item.notes || ''),
      urgent: Boolean(item.urgent),
      status: ['not-started','in-progress','completed','canceled'].includes(item.status) ? item.status : 'not-started',
      createdAt: item.createdAt || now, updatedAt: item.updatedAt || now
    };
  });
}
