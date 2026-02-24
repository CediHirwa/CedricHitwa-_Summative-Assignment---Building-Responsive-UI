/**
 * state.js — Central state. All mutations go through here.
 */

import { loadRecords, saveRecords, loadSettings, saveSettings } from './storage.js';

let records  = [];
let settings = {};
let _idCounter = 0;

// ── Init ──────────────────────────────────────────────────────────────────

export function initState(seedData = []) {
  settings = loadSettings();
  const stored = loadRecords();
  if (stored === null) {
    records = seedData.map(normalise);
    saveRecords(records);
  } else {
    records = stored.map(normalise);
  }
  _idCounter = records.reduce((max, r) => {
    const n = parseInt(r.id.replace(/\D/g, ''), 10) || 0;
    return Math.max(max, n);
  }, 0);
}

// ── Records CRUD ──────────────────────────────────────────────────────────

export function getRecords()  { return [...records]; }
export function getRecord(id) { return records.find(r => r.id === id) || null; }

export function addRecord(data) {
  const now = new Date().toISOString();
  const rec = normalise({ ...data, id: generateId(), createdAt: now, updatedAt: now });
  records.push(rec);
  saveRecords(records);
  return rec;
}

export function updateRecord(id, data) {
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return null;
  records[idx] = normalise({ ...records[idx], ...data, id, updatedAt: new Date().toISOString() });
  saveRecords(records);
  return records[idx];
}

export function deleteRecord(id) {
  const before = records.length;
  records = records.filter(r => r.id !== id);
  if (records.length !== before) saveRecords(records);
}

export function replaceAllRecords(newRecords) {
  records = newRecords.map(normalise);
  saveRecords(records);
}

// ── Settings ──────────────────────────────────────────────────────────────

export function getSettings()        { return { ...settings }; }
export function getSetting(key)      { return settings[key]; }
export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings(settings);
}

// ── Stats ──────────────────────────────────────────────────────────────────

export function computeStats() {
  const all       = records;
  const today     = new Date().toISOString().split('T')[0];
  const todayRecs = all.filter(r => r.dueDate === today);

  // All-time
  const total     = all.length;
  const completed = all.filter(r => r.status === 'completed').length;
  const sumHrs    = all.reduce((s, r) => s + r.duration, 0);

  // Today only
  const todayTotal     = todayRecs.length;
  const todayCompleted = todayRecs.filter(r => r.status === 'completed').length;
  const todayHrs       = todayRecs.reduce((s, r) => s + r.duration, 0);

  // Top tag
  const tagCounts = {};
  all.forEach(r => { tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1; });
  const topTag = Object.entries(tagCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';

  // Urgent tasks (not completed/canceled)
  const urgentTasks = all.filter(r => r.urgent && r.status !== 'completed' && r.status !== 'canceled');

  // Weekly cadence — Mon through Sun of current week
  const weekly = buildWeeklyCadence(all);

  // Cap
  const cap       = settings.dailyCap || 8;
  const remaining = cap - todayHrs;

  // Overuse % for stats page
  const dayTotals = {};
  all.forEach(r => { dayTotals[r.dueDate] = (dayTotals[r.dueDate] || 0) + r.duration; });
  const trackedDays = Object.keys(dayTotals).length || 1;
  const overDays    = Object.values(dayTotals).filter(h => h > cap).length;
  const overPerc    = Math.round((overDays / trackedDays) * 100);

  return {
    total, completed, sumHrs,
    todayTotal, todayCompleted, todayHrs,
    topTag, tagCounts, urgentTasks,
    weekly, cap, remaining, overPerc,
    todayRecs
  };
}

function buildWeeklyCadence(all) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  // Start from Monday of current week
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const hrs     = all.filter(r => r.dueDate === dateStr).reduce((s,r) => s + r.duration, 0);
    const count   = all.filter(r => r.dueDate === dateStr).length;
    days.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      hrs,
      count,
      isToday: dateStr === new Date().toISOString().split('T')[0]
    });
  }
  return days;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function generateId() {
  return `rec_${String(++_idCounter).padStart(4, '0')}`;
}

function normalise(r) {
  const now = new Date().toISOString();
  return {
    id:        r.id        || generateId(),
    title:     String(r.title  || '').trim(),
    dueDate:   String(r.dueDate || ''),
    duration:  parseFloat(r.duration) || 0,   // stored in HOURS
    tag:       String(r.tag    || 'Personal'),
    notes:     String(r.notes  || ''),
    urgent:    Boolean(r.urgent),
    status:    ['not-started','in-progress','completed','canceled'].includes(r.status)
                 ? r.status : 'not-started',
    createdAt: r.createdAt || now,
    updatedAt: r.updatedAt || now
  };
}
