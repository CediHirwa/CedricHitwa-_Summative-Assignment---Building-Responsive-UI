/**
 * app.js — Main entry point.
 */

import { initState, addRecord, updateRecord, deleteRecord, getRecord,
         getRecords, getSettings, updateSettings, replaceAllRecords } from './state.js';
import { validateForm }           from './validators.js';
import { compileRegex }           from './search.js';
import { exportJSON, importJSON } from './storage.js';
import { showSection, renderTable, renderDashboard, renderStatsSection,
         renderSettings, renderCalendar, calNavigate, calJumpToday,
         openModal, closeModal, clearModalErrors, showModalError,
         openDayOverlay, closeDayOverlay,
         populateTagFilter, announce, setSearch, setSort } from './ui.js';

// ── Boot ──────────────────────────────────────────────────────────────────

async function init() {
  let seed = [];
  try {
    const res = await fetch('./seed.json');
    if (res.ok) seed = await res.json();
  } catch { /* offline */ }

  initState(seed);

  renderDashboard();
  renderTable();
  renderSettings();
  refreshTagFilter();

  const validViews = ['dashboard','planner','stats','settings','about','calendar'];
  const hash = location.hash.slice(1);
  showSection(validViews.includes(hash) ? hash : 'dashboard');

  wireNav();
  wireNewBtns();
  wireModal();
  wireDashboardDelegation();
  wireTable();
  wireSearch();
  wireCalendar();
  wireSettings();
  wireImportExport();

  // Expose openModal globally so inline onclick in today-list can reach it
  window.__cf_openModal = () => openModal();
}

// ── Navigation ────────────────────────────────────────────────────────────

function wireNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const view = link.dataset.view;
      showSection(view);
      location.hash = view;
      if (view === 'dashboard') renderDashboard();
      if (view === 'planner')   renderTable();
      if (view === 'stats')     { renderDashboard(); renderStatsSection(); }
      if (view === 'settings')  renderSettings();
      if (view === 'calendar')  renderCalendar();
      // Close mobile nav
      document.getElementById('nav-menu')?.classList.remove('nav-open');
      document.getElementById('burger')?.setAttribute('aria-expanded', 'false');
    });
  });

  const burger  = document.getElementById('burger');
  const navMenu = document.getElementById('nav-menu');
  burger?.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    navMenu?.classList.toggle('nav-open', !open);
  });
}

// ── New Activity buttons ──────────────────────────────────────────────────

function wireNewBtns() {
  document.querySelectorAll('.btn-new-activity').forEach(btn => {
    btn.addEventListener('click', () => openModal());
  });
}

// ── Modal form ────────────────────────────────────────────────────────────

function wireModal() {
  const dialog  = document.getElementById('activity-dialog');
  const form    = document.getElementById('activity-form');
  const closeB  = document.getElementById('modal-close');

  closeB?.addEventListener('click', () => closeModal());

  // Close on backdrop click
  dialog?.addEventListener('click', e => {
    const rect = dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top  || e.clientY > rect.bottom) closeModal();
  });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    clearModalErrors();

    const raw = {
      title:    document.getElementById('f-title').value,
      dueDate:  document.getElementById('f-date').value,
      duration: document.getElementById('f-duration').value,
      tag:      document.getElementById('f-tag').value,
      notes:    document.getElementById('f-notes').value,
      status:   document.getElementById('f-status').value,
      urgent:   document.getElementById('f-urgent').checked
    };

    const errors   = validateForm(raw);
    let   hasError = false;
    for (const [field, msg] of Object.entries(errors)) {
      if (msg) { showModalError(field, msg); hasError = true; }
    }
    if (hasError) { announce('Please fix the highlighted errors.', true); return; }

    const editId  = document.getElementById('edit-id').value;
    const payload = { ...raw, duration: parseFloat(raw.duration) };

    if (editId) { updateRecord(editId, payload); announce(`"${raw.title}" updated.`); }
    else        { addRecord(payload);             announce(`"${raw.title}" added.`);   }

    closeModal();
    refreshAll();
  });

  // Blur-time inline validation
  const blurMap = { 'f-title':'title', 'f-date':'dueDate', 'f-duration':'duration', 'f-tag':'tag' };
  Object.entries(blurMap).forEach(([inputId, field]) => {
    document.getElementById(inputId)?.addEventListener('blur', () => {
      const val    = document.getElementById(inputId)?.value || '';
      const errors = validateForm({ title:'', dueDate:'', duration:'', tag:'', [field]: val });
      const errEl  = document.getElementById(`err-${field}`);
      const inpEl  = document.getElementById(inputId);
      if (errors[field]) {
        if (errEl) { errEl.textContent = errors[field]; errEl.hidden = false; }
        inpEl?.setAttribute('aria-invalid', 'true');
      } else {
        if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
        inpEl?.removeAttribute('aria-invalid');
      }
    });
  });
}

// ── Dashboard delegation (edit on today-list + urgent panel) ─────────────

function wireDashboardDelegation() {
  ['today-list','urgent-content'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      const editBtn = e.target.closest('.btn-edit');
      if (editBtn) {
        const rec = getRecord(editBtn.dataset.id);
        if (rec) openModal(rec);
      }
    });
  });

  // Urgent panel toggle
  const toggle = document.getElementById('urgent-toggle');
  const body   = document.getElementById('urgent-body');
  toggle?.addEventListener('click', () => {
    const open = body?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    const chevron = toggle.querySelector('.chevron-icon');
    if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
  });
}

// ── Planner table ─────────────────────────────────────────────────────────

function wireTable() {
  document.querySelectorAll('[data-sort]').forEach(th => {
    th.addEventListener('click', () => { setSort(th.dataset.sort); renderTable(); });
    th.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSort(th.dataset.sort); renderTable(); }
    });
  });

  document.getElementById('records-tbody')?.addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    const delBtn  = e.target.closest('.btn-delete');

    if (editBtn) {
      const rec = getRecord(editBtn.dataset.id);
      if (rec) openModal(rec);
    }

    if (delBtn) {
      const rec = getRecord(delBtn.dataset.id);
      if (rec && confirm(`Delete "${rec.title}"? This cannot be undone.`)) {
        deleteRecord(rec.id);
        refreshAll();
        announce(`"${rec.title}" deleted.`);
      }
    }
  });

  document.getElementById('filter-tag')?.addEventListener('change', e => {
    const tag = e.target.value;
    setSearch(tag ? compileRegex(`^${escapeLabel(tag)}$`) : null, false);
    renderTable();
  });
}

function escapeLabel(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ── Search ────────────────────────────────────────────────────────────────

function wireSearch() {
  const input   = document.getElementById('search-input');
  const caseBtn = document.getElementById('btn-case');
  const clearB  = document.getElementById('btn-clear-search');
  const errEl   = document.getElementById('search-error');
  let   ci      = true;

  function doSearch() {
    const val = (input?.value || '').trim();
    const re  = compileRegex(val, ci ? 'i' : '');
    const err = val.length > 0 && !re;
    if (errEl) errEl.hidden = !err;
    setSearch(re, err);
    renderTable();
  }

  input?.addEventListener('input', doSearch);
  caseBtn?.addEventListener('click', () => {
    ci = !ci;
    caseBtn.textContent = ci ? 'Aa' : 'aA';
    caseBtn.setAttribute('aria-pressed', String(!ci));
    doSearch();
  });
  clearB?.addEventListener('click', () => {
    if (input) input.value = '';
    setSearch(null, false);
    if (errEl) errEl.hidden = true;
    renderTable();
    announce('Search cleared.');
    input?.focus();
  });
}

// ── Calendar ──────────────────────────────────────────────────────────────

function wireCalendar() {
  document.getElementById('cal-prev')?.addEventListener('click', () => { calNavigate(-1); });
  document.getElementById('cal-next')?.addEventListener('click', () => { calNavigate(1); });
  document.getElementById('cal-today')?.addEventListener('click', () => { calJumpToday(); });

  document.getElementById('cal-grid')?.addEventListener('click', e => {
    const cell = e.target.closest('.cal-cell:not(.cal-empty)');
    if (cell?.dataset.date) openDayOverlay(cell.dataset.date);
  });

  // Day overlay edit delegation
  document.getElementById('day-overlay-list')?.addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      const rec = getRecord(editBtn.dataset.id);
      if (rec) {
        closeDayOverlay();
        openModal(rec);
      }
    }
  });

  document.getElementById('day-overlay-close')?.addEventListener('click', closeDayOverlay);
}

// ── Settings ──────────────────────────────────────────────────────────────

function wireSettings() {
  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    const cap = parseInt(document.getElementById('s-daily-cap')?.value, 10);
    if (!cap || cap < 1 || cap > 24) { announce('Daily cap must be between 1 and 24 hours.', true); return; }
    updateSettings({ dailyCap: cap });
    refreshAll();
    renderSettings();
    announce('Settings saved.');
  });

  document.getElementById('btn-add-tag')?.addEventListener('click', () => {
    const nameInput  = document.getElementById('new-tag-name');
    const colorInput = document.getElementById('new-tag-color');
    const name  = (nameInput?.value || '').trim();
    const color = colorInput?.value || '#64748b';

    if (!name) { announce('Please enter a tag name.', true); return; }

    const s    = getSettings();
    const tags = s.tags || [];
    if (tags.find(t => t.label.toLowerCase() === name.toLowerCase())) {
      announce('That tag already exists.', true); return;
    }

    const newTag = {
      id:        name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      label:     name,
      color:     color,
      protected: false
    };

    updateSettings({ tags: [...tags, newTag] });
    if (nameInput) nameInput.value = '';
    refreshTagFilter();
    renderSettings();
    announce(`Tag "${name}" added.`);
  });

  document.getElementById('tag-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-del-tag');
    if (!btn) return;
    const id   = btn.dataset.id;
    const s    = getSettings();
    const tags = (s.tags || []).filter(t => t.id !== id);
    updateSettings({ tags });
    refreshTagFilter();
    renderSettings();
    announce('Tag removed.');
  });
}

// ── Import / Export ───────────────────────────────────────────────────────

function wireImportExport() {
  document.getElementById('btn-export')?.addEventListener('click', () => {
    exportJSON(getRecords());
    announce('Exported campusflow.json.');
  });

  const importInput = document.getElementById('import-file');
  document.getElementById('btn-import')?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', () => {
    const file = importInput.files?.[0];
    if (!file) return;
    importJSON(
      file,
      recs => {
        if (!confirm(`Replace all data with ${recs.length} imported records?`)) return;
        replaceAllRecords(recs);
        refreshAll();
        renderSettings();
        announce(`${recs.length} records imported.`);
      },
      err => announce(`Import failed: ${err}`, true)
    );
    importInput.value = '';
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function refreshTagFilter() {
  const tags = getSettings().tags || [];
  populateTagFilter(tags);
}

function refreshAll() {
  renderDashboard();
  renderTable();
  // Re-render calendar if visible
  if (!document.getElementById('calendar')?.hidden) renderCalendar();
}

// ── Start ─────────────────────────────────────────────────────────────────
init().catch(console.error);
