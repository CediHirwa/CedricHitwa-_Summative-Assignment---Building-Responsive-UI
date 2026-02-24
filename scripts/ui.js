/**
 * ui.js — All DOM rendering, ARIA announcements, UI helpers.
 */

import { getRecords, getSettings, computeStats } from './state.js';
import { filterRecords, highlight, escapeHtml } from './search.js';

// ── SVG Icon helper ───────────────────────────────────────────────

const ICONS = {
  pencil: `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
  trash:  `<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>`,
  flag:   `<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>`,
  x:      `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  chevron:`<polyline points="6 9 12 15 18 9"/>`,
};

function icon(name, { size = 16, color = 'currentColor', sw = 2 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:inline-block;vertical-align:middle;flex-shrink:0">${ICONS[name] || ''}</svg>`;
}

// ── ARIA Live ─────────────────────────────────────────────────────

export function announce(msg, urgent = false) {
  const id = urgent ? 'alert-msg' : 'status-msg';
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

// ── Section Navigation ────────────────────────────────────────────

const VIEWS = ['dashboard','planner','stats','settings','about','calendar'];

export function showSection(id) {
  VIEWS.forEach(sid => {
    const el   = document.getElementById(sid);
    const link = document.querySelector(`.nav-link[data-view="${sid}"]`);
    if (!el) return;
    const active = sid === id;
    el.hidden = !active;
    el.setAttribute('aria-hidden', String(!active));
    if (link) {
      link.setAttribute('aria-current', active ? 'page' : 'false');
      link.classList.toggle('active', active);
    }
  });
  const names = { dashboard:'Dashboard', planner:'Planner', stats:'Statistics',
                  settings:'Settings', about:'About', calendar:'Calendar' };
  document.title = `Campus Flow — ${names[id] || id}`;
}

// ── Dashboard ─────────────────────────────────────────────────────

export function renderDashboard() {
  const stats = computeStats();
  const s     = getSettings();
  const cap   = s.dailyCap || 8;

  const pct  = Math.min((stats.todayHrs / cap) * 100, 100);
  const fill = document.getElementById('heat-fill');
  const prog = document.getElementById('heat-progress');
  if (fill) {
    fill.style.width = pct + '%';
    fill.style.background = pct < 65 ? 'var(--teal)' : pct < 90 ? 'var(--orange)' : 'var(--red)';
  }
  if (prog) prog.setAttribute('aria-valuenow', Math.round(pct));

  _setText('heat-status', pct < 65 ? 'Optimal Flow' : pct < 90 ? 'High Load' : 'Over Capacity');
  _setText('heat-hrs', `${stats.todayHrs.toFixed(1)} / ${cap}h`);

  const capMsg = document.getElementById('cap-message');
  if (capMsg) {
    if (stats.remaining < 0) {
      capMsg.textContent = `Over cap by ${Math.abs(stats.remaining).toFixed(1)}h`;
      capMsg.className = 'cap-message cap-over';
      announce(`Warning: over daily cap by ${Math.abs(stats.remaining).toFixed(1)} hours.`, true);
    } else {
      capMsg.textContent = `${stats.remaining.toFixed(1)}h remaining today`;
      capMsg.className = 'cap-message cap-ok';
    }
  }

  _setText('today-total',     stats.todayTotal);
  _setText('today-completed', stats.todayCompleted);
  _setText('today-hrs',       `${stats.todayHrs.toFixed(1)}h`);
  _setText('today-tag',       stats.topTag);

  renderTodayList(stats.todayRecs);
  renderUrgentPanel(stats.urgentTasks);
  renderWeeklyCadence(stats.weekly, cap);
}

function renderTodayList(todayRecs) {
  const list = document.getElementById('today-list');
  if (!list) return;
  const tags = (getSettings().tags || []);

  if (!todayRecs.length) {
    list.innerHTML = `<p class="empty-hint">No activities scheduled for today.
      <button class="link-btn" onclick="window.__cf_openModal()">Add one now →</button></p>`;
    return;
  }

  list.innerHTML = todayRecs.map(r => {
    const tag   = tags.find(t => t.label === r.tag) || { color: '#94a3b8' };
    const stCls = _statusClass(r.status);
    return `<div class="today-item${r.status === 'canceled' ? ' canceled' : ''}"
                 style="border-left:4px solid ${tag.color}" role="listitem">
      <div class="today-item-info">
        <span class="today-item-title">${escapeHtml(r.title)}</span>
        <span class="today-item-meta">
          <span class="tag-dot" style="background:${tag.color}"></span>${escapeHtml(r.tag)}
          ${r.urgent ? `<span class="urgent-pip" aria-label="Urgent">${icon('flag',{size:11,color:'#ef4444'})}</span>` : ''}
        </span>
      </div>
      <div class="today-item-right">
        <span class="status-badge ${stCls}">${r.status.replace('-',' ')}</span>
        <span class="dur-badge">${r.duration.toFixed(1)}h</span>
        <button class="btn-icon btn-edit" data-id="${r.id}" aria-label="Edit ${escapeHtml(r.title)}">${icon('pencil',{size:14,color:'#3b82f6'})}</button>
      </div>
    </div>`;
  }).join('');
}

function renderUrgentPanel(urgentTasks) {
  const count   = document.getElementById('urgent-count');
  const content = document.getElementById('urgent-content');
  if (!content) return;

  if (count) {
    count.textContent = urgentTasks.length;
    count.style.display = urgentTasks.length ? 'inline-flex' : 'none';
  }

  if (!urgentTasks.length) {
    content.innerHTML = `<p class="empty-hint" style="padding:.75rem">No urgent tasks right now.</p>`;
    return;
  }

  content.innerHTML = urgentTasks.map(r => `
    <div class="urgent-item" role="listitem">
      <div>
        <div class="urgent-item-title">${escapeHtml(r.title)}</div>
        <div class="urgent-item-meta">Due ${escapeHtml(r.dueDate)} · ${r.duration.toFixed(1)}h</div>
      </div>
      <button class="btn-icon btn-edit" data-id="${r.id}" aria-label="Edit ${escapeHtml(r.title)}">${icon('pencil',{size:13,color:'#b91c1c'})}</button>
    </div>`).join('');
}

function renderWeeklyCadence(weekly, cap) {
  const row = document.getElementById('weekly-cadence');
  if (!row) return;
  row.innerHTML = weekly.map(d => {
    const ratio = cap > 0 ? d.hrs / cap : 0;
    let bg = '#f8fafc', border = '#e2e8f0', textColor = '#cbd5e1';
    if (ratio > 0 && ratio < 0.5)  { bg = `rgba(34,197,94,${0.1+ratio*0.5})`; border='#22c55e'; textColor='#15803d'; }
    else if (ratio < 0.9) { bg = `rgba(249,115,22,${0.15+ratio*0.3})`; border='#f97316'; textColor='#c2410c'; }
    else if (ratio >= 0.9) { bg = `rgba(239,68,68,${0.2+ratio*0.2})`; border='#ef4444'; textColor='#b91c1c'; }
    return `<div class="cadence-day${d.isToday?' is-today':''}"
               style="background:${bg};border-color:${border};color:${textColor}"
               title="${d.date}: ${d.hrs.toFixed(1)}h (${d.count} task${d.count!==1?'s':''})"
               aria-label="${d.label} ${d.dayNum}: ${d.hrs.toFixed(1)} hours">
      <span class="cadence-label">${d.label}</span>
      <span class="cadence-num">${d.dayNum}</span>
      <span class="cadence-hrs">${d.hrs > 0 ? d.hrs.toFixed(1)+'h' : ''}</span>
    </div>`;
  }).join('');
}

// ── Planner Table ─────────────────────────────────────────────────

let _sortKey = 'dueDate', _sortDir = 'asc', _searchRe = null;

export function setSearch(re) { _searchRe = re; }
export function setSort(key) {
  _sortDir = _sortKey === key ? (_sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
  _sortKey = key;
}

export function renderTable() {
  const tbody   = document.getElementById('records-tbody');
  const countEl = document.getElementById('record-count');
  const tags    = (getSettings().tags || []);
  if (!tbody) return;

  let recs = filterRecords(getRecords(), _searchRe);
  recs = [...recs].sort((a, b) => {
    let va = a[_sortKey], vb = b[_sortKey];
    if (_sortKey === 'duration') { va = +va; vb = +vb; }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return _sortDir === 'asc' ? -1 : 1;
    if (va > vb) return _sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  if (countEl) countEl.textContent = `${recs.length} record${recs.length !== 1 ? 's' : ''}`;

  document.querySelectorAll('[data-sort]').forEach(th => {
    const k = th.dataset.sort;
    const iconEl = th.querySelector('.sort-icon');
    if (iconEl) iconEl.textContent = k !== _sortKey ? '⇅' : _sortDir === 'asc' ? '↑' : '↓';
    th.setAttribute('aria-sort', k !== _sortKey ? 'none' : _sortDir === 'asc' ? 'ascending' : 'descending');
  });

  if (!recs.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">${_searchRe ? 'No records match your search.' : 'No activities yet. Add one to get started.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = recs.map(r => {
    const tag     = tags.find(t => t.label === r.tag) || { color: '#94a3b8', label: r.tag };
    const titleHl = _searchRe ? highlight(r.title, _searchRe) : escapeHtml(r.title);
    const stCls   = _statusClass(r.status);
    return `<tr data-id="${r.id}">
      <td class="col-title">${titleHl}${r.urgent ? ` <span class="urgent-pip">${icon('flag',{size:11,color:'#ef4444'})}</span>` : ''}</td>
      <td data-label="Due">${escapeHtml(r.dueDate)}</td>
      <td data-label="Duration">${r.duration.toFixed(1)}h</td>
      <td data-label="Tag">
        <span class="tag-chip" style="background:${tag.color}18;color:${tag.color}">
          <span class="tag-dot-sm" style="background:${tag.color}"></span>${escapeHtml(tag.label)}
        </span>
      </td>
      <td data-label="Status"><span class="status-badge ${stCls}">${r.status.replace('-',' ')}</span></td>
      <td data-label="Urgent" style="text-align:center">${r.urgent ? icon('flag',{size:13,color:'#ef4444'}) : '—'}</td>
      <td class="col-actions" data-label="Actions">
        <button class="btn-icon btn-edit"   data-id="${r.id}" aria-label="Edit ${escapeHtml(r.title)}">${icon('pencil',{size:14,color:'#3b82f6'})}</button>
        <button class="btn-icon btn-delete" data-id="${r.id}" aria-label="Delete ${escapeHtml(r.title)}">${icon('trash',{size:14,color:'#ef4444'})}</button>
      </td>
    </tr>`;
  }).join('');
}

// ── Activity Modal ─────────────────────────────────────────────────

export function openModal(record = null) {
  const dialog = document.getElementById('activity-dialog');
  if (!dialog) return;
  const tags = (getSettings().tags || []);

  const tagSel = document.getElementById('f-tag');
  if (tagSel) tagSel.innerHTML = tags.map(t =>
    `<option value="${escapeHtml(t.label)}">${escapeHtml(t.label)}</option>`).join('');

  document.getElementById('edit-id').value    = record?.id      || '';
  document.getElementById('f-title').value    = record?.title   || '';
  document.getElementById('f-date').value     = record?.dueDate || new Date().toISOString().split('T')[0];
  document.getElementById('f-duration').value = record?.duration != null ? record.duration : '';
  document.getElementById('f-status').value   = record?.status  || 'not-started';
  document.getElementById('f-notes').value    = record?.notes   || '';
  document.getElementById('f-urgent').checked = record?.urgent  || false;
  if (record && tagSel) tagSel.value = record.tag;

  document.getElementById('modal-title').textContent = record ? 'Edit Activity' : 'New Activity';
  clearModalErrors();
  dialog.showModal();
  document.getElementById('f-title').focus();
}

export function closeModal() {
  document.getElementById('activity-dialog')?.close();
}

export function clearModalErrors() {
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; el.hidden = true; });
  document.querySelectorAll('.field-input').forEach(el => el.removeAttribute('aria-invalid'));
}

export function showModalError(field, msg) {
  const errEl = document.getElementById(`err-${field}`);
  const inpEl = document.getElementById(`f-${field}`);
  if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
  if (inpEl) inpEl.setAttribute('aria-invalid', 'true');
}

// ── Calendar ──────────────────────────────────────────────────────

let _calYear  = new Date().getFullYear();
let _calMonth = new Date().getMonth();

export function renderCalendar() {
  const grid  = document.getElementById('cal-grid');
  const title = document.getElementById('cal-title');
  if (!grid || !title) return;

  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  title.textContent = `${months[_calMonth]} ${_calYear}`;

  const first   = new Date(_calYear, _calMonth, 1).getDay();
  const daysIn  = new Date(_calYear, _calMonth + 1, 0).getDate();
  const today   = new Date().toISOString().split('T')[0];
  const allRecs = getRecords();
  const tags    = (getSettings().tags || []);

  grid.innerHTML = '';

  for (let i = 0; i < first; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell cal-empty';
    grid.appendChild(cell);
  }

  for (let d = 1; d <= daysIn; d++) {
    const dateStr  = `${_calYear}-${String(_calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayRecs  = allRecs.filter(r => r.dueDate === dateStr);
    const isToday  = dateStr === today;
    const hasUrgent = dayRecs.some(r => r.urgent);

    const cell = document.createElement('button');
    cell.className = `cal-cell${isToday ? ' is-today' : ''}`;
    cell.setAttribute('aria-label', `${months[_calMonth]} ${d}${dayRecs.length ? `: ${dayRecs.length} activities` : ''}`);
    cell.dataset.date = dateStr;

    const dots = dayRecs.slice(0, 4).map(r => {
      const tag = tags.find(t => t.label === r.tag) || { color: '#94a3b8' };
      return `<span class="cal-dot" style="background:${tag.color}"></span>`;
    }).join('');

    cell.innerHTML = `
      <span class="cal-day-num${isToday ? ' today-num' : ''}">${d}</span>
      ${hasUrgent ? `<span class="cal-urgent-pip">${icon('flag',{size:9,color:'#ef4444'})}</span>` : ''}
      <span class="cal-dots">${dots}</span>`;

    grid.appendChild(cell);
  }
}

export function calNavigate(dir) {
  _calMonth += dir;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  if (_calMonth < 0)  { _calMonth = 11; _calYear--; }
  renderCalendar();
}

export function calJumpToday() {
  _calYear  = new Date().getFullYear();
  _calMonth = new Date().getMonth();
  renderCalendar();
}

// ── Calendar Day Overlay ──────────────────────────────────────────

export function openDayOverlay(dateStr) {
  const overlay = document.getElementById('day-overlay');
  const titleEl = document.getElementById('day-overlay-title');
  const listEl  = document.getElementById('day-overlay-list');
  const addBtn  = document.getElementById('day-overlay-add');
  if (!overlay || !titleEl || !listEl) return;

  const d   = new Date(dateStr + 'T00:00:00');
  titleEl.textContent = d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  const recs = getRecords().filter(r => r.dueDate === dateStr);
  const tags = (getSettings().tags || []);

  if (!recs.length) {
    listEl.innerHTML = `<p class="empty-hint" style="padding:1rem">No activities on this day.</p>`;
  } else {
    listEl.innerHTML = recs.map(r => {
      const tag   = tags.find(t => t.label === r.tag) || { color: '#94a3b8' };
      const stCls = _statusClass(r.status);
      return `<div class="overlay-item" style="border-left:4px solid ${tag.color}">
        <div>
          <span class="overlay-item-title">${escapeHtml(r.title)}</span>
          ${r.urgent ? `<span class="urgent-pip" style="margin-left:.4rem">${icon('flag',{size:11,color:'#ef4444'})}</span>` : ''}
          <div class="overlay-item-meta">
            <span class="tag-dot" style="background:${tag.color}"></span>
            ${escapeHtml(r.tag)} · ${r.duration.toFixed(1)}h · <span class="status-badge ${stCls}">${r.status.replace('-',' ')}</span>
          </div>
        </div>
        <button class="btn-icon btn-edit" data-id="${r.id}" aria-label="Edit ${escapeHtml(r.title)}">${icon('pencil',{size:14,color:'#3b82f6'})}</button>
      </div>`;
    }).join('');
  }

  if (addBtn) addBtn.onclick = () => { closeDayOverlay(); openModal({ dueDate: dateStr }); };

  overlay.showModal();
}

export function closeDayOverlay() {
  document.getElementById('day-overlay')?.close();
}

// ── Stats ─────────────────────────────────────────────────────────

export function renderStatsSection() {
  const stats = computeStats();
  const tags  = (getSettings().tags || []);
  const reliability = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  _setText('stat-total2',     stats.total);
  _setText('stat-completed2', stats.completed);
  _setText('stat-sum2',       `${stats.sumHrs.toFixed(1)}h`);
  _setText('stat-top-tag2',   stats.topTag);
  _setText('balance-perc',    `${reliability}%`);

  const ring = document.getElementById('balance-ring');
  if (ring) ring.style.strokeDasharray = `${reliability}, 100`;

  const legend = document.getElementById('balance-legend');
  if (legend) {
    const entries = Object.entries(stats.tagCounts).sort((a,b) => b[1]-a[1]).slice(0,5);
    legend.innerHTML = entries.map(([label, count]) => {
      const tag = tags.find(t => t.label === label) || { color: '#94a3b8' };
      return `<div class="legend-row">
        <div style="display:flex;align-items:center;gap:.5rem">
          <div class="legend-dot" style="background:${tag.color}"></div>
          <span class="legend-label">${escapeHtml(label)}</span>
        </div>
        <span class="legend-val">${count} task${count!==1?'s':''}</span>
      </div>`;
    }).join('');
  }

  _setText('m-reliability', `${reliability}%`);
  _setText('m-overuse',     `${stats.overPerc}%`);
  const rBar = document.getElementById('m-reliability-bar');
  const oBar = document.getElementById('m-overuse-bar');
  if (rBar) rBar.style.width = `${reliability}%`;
  if (oBar) oBar.style.width = `${stats.overPerc}%`;
}

// ── Settings ──────────────────────────────────────────────────────

export function renderSettings() {
  const s = getSettings();
  const capEl = document.getElementById('s-daily-cap');
  if (capEl) capEl.value = s.dailyCap || 8;

  const tagList = document.getElementById('tag-list');
  if (!tagList) return;
  tagList.innerHTML = (s.tags || []).map(t => `
    <li class="tag-row">
      <div style="display:flex;align-items:center;gap:.6rem">
        <span class="tag-color-swatch" style="background:${t.color}"></span>
        <span>${escapeHtml(t.label)}</span>
      </div>
      ${!t.protected
        ? `<button class="btn-icon btn-del-tag" data-id="${escapeHtml(t.id)}" aria-label="Remove ${escapeHtml(t.label)}">${icon('trash',{size:14,color:'#ef4444'})}</button>`
        : `<span class="core-badge">core</span>`}
    </li>`).join('');
}

export function populateTagFilter(tags) {
  const sel = document.getElementById('filter-tag');
  if (!sel) return;
  sel.innerHTML = `<option value="">All Tags</option>` +
    tags.map(t => `<option value="${escapeHtml(t.label)}">${escapeHtml(t.label)}</option>`).join('');
}

// ── Private helpers ───────────────────────────────────────────────

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _statusClass(status) {
  return { 'completed':'status--completed','in-progress':'status--in-progress',
           'not-started':'status--not-started','canceled':'status--canceled' }[status] || '';
}
