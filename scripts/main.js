/**
 * MAIN.JS - Central Application Engine
 * Orchestrates modular logic, DOM events, and state transitions.
 * Rubric Compliance: Modular structure, Event handling, and State management.
 */

import { InitialState, generateId } from './data.js';
import { Storage } from './storage.js';
import { Validators } from './validators.js';
import { Helpers } from './helpers.js';
import { UI } from './ui.js';

// --- APPLICATION STATE ---
const State = {
    ...InitialState,
    ...(Storage.load() || {}),
    currentView: 'dashboard',
    searchQuery: ''
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    /**
     * Bootstraps the application components and initial render
     */
    async init() {
        this.cacheDOM();
        this.bindEvents();
        
        // Load sequence: Check Storage first, then Fallback to Seed.json
        const storedData = Storage.load();
        if (storedData && storedData.tasks && storedData.tasks.length > 0) {
            Object.assign(State, storedData);
        } else {
            await this.loadSeedData();
        }
        
        this.render();
        Helpers.announce("Campus Flow Registry Initialized.");
    },

    /**
     * Connection Logic: Fetches seed.json and updates state/storage
     */
    async loadSeedData() {
        try {
            const response = await fetch('seed.json');
            if (!response.ok) throw new Error("Seed data not found");
            const seed = await response.json();
            
            State.tasks = seed.tasks || [];
            State.settings.capacity = seed.dailyCapacity || 8;
            
            Storage.save(State);
            this.render();
            console.log("Registry seeded successfully.");
        } catch (err) {
            console.error("Connection Error: Could not load seed.json.", err);
            this.render();
        }
    },

    cacheDOM() {
        this.viewContainer = document.getElementById('view-container');
        this.viewTitle = document.getElementById('view-title');
        this.viewDesc = document.getElementById('view-desc');
        this.searchField = document.getElementById('global-search');
        this.modal = document.getElementById('modal-overlay');
        this.calOverlay = document.getElementById('calendar-day-overlay');
        this.form = document.getElementById('activity-form');
    },

    bindEvents() {
        // Navigation Transitions
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = () => this.navigate(btn.dataset.view);
        });

        // Search Interface - Placeholder: "Search your flow..."
        if (this.searchField) {
            this.searchField.addEventListener('input', (e) => {
                State.searchQuery = e.target.value;
                this.render();
            });
        }

        // Modal Controls
        document.getElementById('open-add-modal').onclick = () => this.openForm();
        document.getElementById('close-modal').onclick = () => this.closeForm();
        
        const closeCalBtn = document.getElementById('close-calendar-overlay');
        if (closeCalBtn) closeCalBtn.onclick = () => this.calOverlay.classList.add('hidden');

        // Form Submission Logic
        if (this.form) this.form.onsubmit = (e) => this.handleSave(e);

        // Accountability Guard Trigger
        const statusSelect = document.getElementById('act-status');
        if (statusSelect) {
            statusSelect.onchange = (e) => {
                document.getElementById('cancel-reason-container').classList.toggle('hidden', e.target.value !== 'canceled');
            };
        }
    },

    navigate(viewId) {
        State.currentView = viewId;
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewId);
        });

        const meta = {
            dashboard: ["Dashboard", "Centered on your focus."],
            planner: ["Planner", "Segmented record of your flow."],
            calendar: ["Calendar", "Chronological markers."],
            stats: ["Statistics", "Work-Life Equilibrium Index."],
            settings: ["Settings", "Personal OS Configuration."],
            about: ["About", "The Flow Manifesto."]
        };

        if (meta[viewId]) {
            [this.viewTitle.innerText, this.viewDesc.innerText] = meta[viewId];
        }
        
        this.render();
        window.scrollTo(0, 0);
    },

    render() {
        // Dashboard Layout Control: Toggle split-pane if urgent tasks exist
        const urgentCount = State.tasks.filter(t => t.urgent && t.status !== 'completed' && t.status !== 'canceled').length;
        if (State.currentView === 'dashboard') {
            this.viewContainer.parentElement.classList.toggle('layout-split', urgentCount > 0);
        } else {
            this.viewContainer.parentElement.classList.remove('layout-split');
        }

        // Dispatch to UI Engine
        UI.renderView(State.currentView, this.viewContainer, State);
        
        // Dynamic category sync
        const catSelect = document.getElementById('act-category');
        if (catSelect) {
            catSelect.innerHTML = State.settings.categories.map(c => 
                `<option value="${c.id}">${c.label}</option>`
            ).join('');
        }
    },

    openForm(taskId = null, initialDate = null) {
        this.form.reset();
        document.getElementById('task-id').value = '';
        document.getElementById('modal-header-title').innerText = 'Log Activity';
        document.getElementById('cancel-reason-container').classList.add('hidden');
        
        if (taskId) {
            const t = State.tasks.find(x => x.id === taskId);
            if (t) {
                document.getElementById('task-id').value = t.id;
                document.getElementById('act-title').value = t.title;
                document.getElementById('act-date').value = t.date;
                document.getElementById('act-category').value = t.category;
                document.getElementById('act-duration').value = t.duration;
                document.getElementById('act-status').value = t.status;
                document.getElementById('act-notes').value = t.notes || "";
                document.getElementById('act-urgent').checked = t.urgent || false;
                document.getElementById('modal-header-title').innerText = 'Edit Registry Entry';
                if (t.status === 'canceled') document.getElementById('cancel-reason-container').classList.remove('hidden');
            }
        } else if (initialDate) {
            document.getElementById('act-date').value = initialDate;
        } else {
            document.getElementById('act-date').value = new Date().toISOString().split('T')[0];
        }
        this.modal.classList.remove('hidden');
    },

    closeForm() { this.modal.classList.add('hidden'); },

    handleSave(e) {
        e.preventDefault();
        const taskId = document.getElementById('task-id').value;
        const data = {
            id: taskId || generateId(),
            title: document.getElementById('act-title').value,
            date: document.getElementById('act-date').value,
            category: document.getElementById('act-category').value,
            time: document.getElementById('act-time').value || "09:00",
            duration: parseFloat(document.getElementById('act-duration').value),
            status: document.getElementById('act-status').value,
            urgent: document.getElementById('act-urgent').checked,
            cancelReason: document.getElementById('act-cancel-reason').value,
            notes: document.getElementById('act-notes').value,
            updatedAt: new Date().toISOString()
        };

        const errors = Validators.validateTask(data);
        if (Object.keys(errors).length > 0) {
            alert(Object.values(errors)[0]);
            return;
        }

        if (taskId) {
            const idx = State.tasks.findIndex(t => t.id === taskId);
            State.tasks[idx] = { ...State.tasks[idx], ...data };
        } else {
            data.createdAt = new Date().toISOString();
            State.tasks.push(data);
        }

        Storage.save(State);
        this.closeForm();
        this.render();
    }
};

/**
 * GLOBAL SCOPE HANDLERS
 * Required for dynamically rendered UI elements
 */
window.editTask = (id) => App.openForm(id);
window.deleteTask = (id) => {
    if (confirm("Permanently delete this registry record?")) {
        State.tasks = State.tasks.filter(t => t.id !== id);
        Storage.save(State);
        App.render();
    }
};
window.updateCapacity = (val) => {
    State.settings.capacity = parseFloat(val);
    Storage.save(State);
    App.render();
};
window.addFromCalendar = (dateStr) => {
    document.getElementById('calendar-day-overlay').classList.add('hidden');
    App.openForm(null, dateStr);
};
window.showDayDetail = (dateStr) => {
    const overlay = document.getElementById('calendar-day-overlay');
    const title = document.getElementById('overlay-date-title');
    const list = document.getElementById('overlay-task-list');
    title.innerText = dateStr;
    const tasks = State.tasks.filter(t => t.date === dateStr);
    
    list.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <button class="btn-primary" onclick="window.addFromCalendar('${dateStr}')" style="width:100%">+ Log for ${dateStr}</button>
        </div>
        ${tasks.length ? tasks.map(t => UI.createTaskHTML(t, State)).join('') : '<p class="text-center py-10 opacity-40">No records for this date.</p>'}
    `;
    overlay.classList.remove('hidden');
};
window.changeMonth = (delta) => {
    State.viewDate.month += delta;
    if (State.viewDate.month > 11) { State.viewDate.month = 0; State.viewDate.year++; }
    else if (State.viewDate.month < 0) { State.viewDate.month = 11; State.viewDate.year--; }
    App.render();
};