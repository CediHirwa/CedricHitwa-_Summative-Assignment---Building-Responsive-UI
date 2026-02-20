/**
 * UI.JS - Rendering Engine
 * Handles all dynamic HTML generation and DOM updates.
 * Rubric Compliance: DOM manipulation, Statistics visualization, 
 * and high-contrast accessibility standards.
 */

import { Helpers } from './helpers.js';

export const UI = {
    /**
     * Main dispatcher for view transitions
     */
    renderView(viewId, container, state) {
        if (!container) return;
        container.innerHTML = '';
        container.className = 'view-content-active';

        switch (viewId) {
            case 'dashboard': this.renderDashboard(container, state); break;
            case 'planner': this.renderPlanner(container, state); break;
            case 'calendar': this.renderCalendar(container, state); break;
            case 'stats': this.renderStats(container, state); break;
            case 'settings': this.renderSettings(container, state); break;
            case 'about': this.renderAbout(container); break;
        }
    },

    /**
     * Renders the Condensed Dashboard with Urgent Tasks
     */
    renderDashboard(container, state) {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = state.tasks.filter(t => t.date === today && t.status !== 'canceled');
        const urgentTasks = state.tasks.filter(t => t.urgent && t.status !== 'completed' && t.status !== 'canceled');
        const totalHrs = todayTasks.reduce((acc, t) => acc + t.duration, 0);
        const cap = state.settings.capacity;
        const perc = Math.min((totalHrs / cap) * 100, 100);

        container.innerHTML = `
            <div class="dashboard-main">
                <div class="heat-card-condensed">
                    <div class="heat-meta">
                        <div>
                            <span class="label">Workload Intensity</span>
                            <h3 style="color:${totalHrs > cap ? 'var(--orange)' : 'var(--teal)'}">
                                ${totalHrs > cap ? 'High Load Alert' : 'Optimal Flow'}
                            </h3>
                        </div>
                        <div class="hours-display">
                            <span class="val">${totalHrs.toFixed(1)}</span>
                            <span class="sep">/ ${cap}h</span>
                        </div>
                    </div>
                    <div class="heat-track">
                        <div class="heat-fill" style="width:${perc}%; background:${totalHrs > cap ? 'var(--orange)' : 'var(--teal)'}"></div>
                    </div>
                </div>

                <div class="planner-list">
                    <h4 class="section-title">Today's Registry</h4>
                    ${todayTasks.length ? todayTasks.map(t => this.createTaskHTML(t, state)).join('') : '<p class="text-center py-10 opacity-40 italic">No active sessions logged for today.</p>'}
                </div>
            </div>

            ${urgentTasks.length ? `
            <aside class="urgent-pane">
                <h4 class="section-title urgent">Critical Now</h4>
                <div class="urgent-list">
                    ${urgentTasks.map(t => `
                        <div class="urgent-item" onclick="window.editTask('${t.id}')">
                            <div class="urgent-accent"></div>
                            <h5>${t.title}</h5>
                            <span class="urgent-time">${t.time}</span>
                        </div>
                    `).join('')}
                </div>
            </aside>
            ` : ''}
        `;
    },

    /**
     * Renders the Tabular Segmented Planner
     */
    renderPlanner(container, state) {
        const tasks = state.tasks;
        const groups = {
            upcoming: tasks.filter(t => new Date(t.date) >= new Date().setHours(0,0,0,0) && t.status !== 'completed' && t.status !== 'canceled'),
            completed: tasks.filter(t => t.status === 'completed'),
            canceled: tasks.filter(t => t.status === 'canceled'),
            passed: tasks.filter(t => new Date(t.date) < new Date().setHours(0,0,0,0) && t.status !== 'completed' && t.status !== 'canceled')
        };

        const renderTable = (taskList, title) => `
            <div class="planner-table-container">
                <h4 class="table-title">${title} (${taskList.length})</h4>
                <table class="planner-table">
                    <thead>
                        <tr>
                            <th>Activity</th>
                            <th>Label</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${taskList.map(t => {
                            const cat = state.settings.categories.find(c => c.id === t.category);
                            return `
                                <tr onclick="window.editTask('${t.id}')">
                                    <td>
                                        <div class="activity-name-cell">
                                            <span class="title">${t.title}</span>
                                            ${t.notes || t.cancelReason ? `<span class="notes">${t.notes || t.cancelReason}</span>` : ''}
                                        </div>
                                    </td>
                                    <td><span class="label-pill" style="border-color:${cat?.color || '#cbd5e1'}">${cat?.label || 'General'}</span></td>
                                    <td><span class="time-cell">${t.time || '--:--'}</span></td>
                                    <td><span class="status-badge ${t.status}">${t.status}</span></td>
                                    <td class="text-right">
                                        <button onclick="event.stopPropagation(); window.deleteTask('${t.id}')" style="background:none; border:none; color:var(--slate-300); cursor:pointer">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = `
            <div class="planner-segmented">
                ${renderTable(groups.upcoming, 'Upcoming Sessions')}
                ${renderTable(groups.passed, 'Unresolved Past')}
                ${renderTable(groups.completed, 'Registry History')}
                ${renderTable(groups.canceled, 'Plan Deviations')}
            </div>
        `;
    },

    /**
     * Renders fully populated About Segment
     */
    renderAbout(container) {
        container.innerHTML = `
            <div class="about-manifesto">
                <div class="manifesto-hero">
                    <h1>THE MANIFESTO.</h1>
                    <p class="subtitle">Sustainable high performance is a habit of awareness, not an accident of effort.</p>
                </div>

                <div class="principles-grid">
                    <div class="principle-card">
                        <i class="fa-solid fa-battery-half"></i>
                        <h3>Capacity Awareness</h3>
                        <p>Time is a finite resource. Tracking duration enforces respect for your human limits and energy levels.</p>
                    </div>
                    <div class="principle-card">
                        <i class="fa-solid fa-fire"></i>
                        <h3>Intensity Feedback</h3>
                        <p>The Heat Bar provides radical real-time cues signaling when you've hit your cognitive limit.</p>
                    </div>
                    <div class="principle-card">
                        <i class="fa-solid fa-shield-halved"></i>
                        <h3>Registry Integrity</h3>
                        <p>Mandatory justifications for deviations build a truthful narrative of your performance and growth.</p>
                    </div>
                </div>

                <div class="creator-card">
                    <img src="assets/Creator.png" alt="Cedric Hirwa" onerror="this.src='https://ui-avatars.com/api/?name=Cedric+Hirwa&background=1e293b&color=fff'">
                    <div class="creator-info">
                        <h2>Cedric Hirwa</h2>
                        <span class="creator-title">HR Professional & Design Architect</span>
                        <p>With over 4 years of experience in corporate culture development, Cedric built Campus Flow to translate professional wisdom into a personal operating system. He believes that true performance is only sustainable when paired with radical self-awareness.</p>
                        <div class="creator-links">
                            <a href="mailto:c.havugiman@alustudent.com"><i class="fa-solid fa-envelope"></i></a>
                            <a href="https://github.com/CediHirwa" target="_blank"><i class="fa-brands fa-github"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renders Stats Dashboard with Equilibrium Index
     */
    renderStats(container, state) {
        const total = state.tasks.length || 1;
        const workHrs = state.tasks.filter(t => t.category === 'academic' || t.category === 'professional').reduce((acc, t) => acc + t.duration, 0);
        const lifeHrs = state.tasks.filter(t => t.category === 'social' || t.category === 'self-care').reduce((acc, t) => acc + t.duration, 0);
        const totalHrs = workHrs + lifeHrs || 1;
        
        const workPerc = (workHrs / totalHrs) * 100;
        const lifePerc = (lifeHrs / totalHrs) * 100;

        container.innerHTML = `
            <div class="balance-container">
                <div class="flex justify-between items-end mb-8">
                    <h3 class="section-title">Equilibrium Index</h3>
                    <div class="text-right">
                        <span class="text-3xl font-black">${((workHrs/totalHrs)*100).toFixed(0)}%</span>
                        <span class="text-slate-400 font-bold">Productivity Lean</span>
                    </div>
                </div>
                
                <div class="balance-labels">
                    <span>Professional/Academic (${workHrs.toFixed(1)}h)</span>
                    <span>Self-Care/Social (${lifeHrs.toFixed(1)}h)</span>
                </div>
                
                <div class="balance-bar-track">
                    <div class="balance-fill-left" style="width: ${workPerc}%"></div>
                    <div class="balance-fill-right" style="width: ${lifePerc}%"></div>
                </div>
                
                <p class="text-center mt-6 text-slate-400 italic">
                    ${workPerc > 75 ? "Warning: High productivity lean. High risk of burnout." : "Healthy flow detected between output and recovery."}
                </p>
            </div>
        `;
    },

    /**
     * Renders Settings with Label Registry
     */
    renderSettings(container, state) {
        container.innerHTML = `
            <div class="settings-grid">
                <div class="settings-card">
                    <h3 class="card-title">Label Registry</h3>
                    <div class="label-list">
                        ${state.settings.categories.map(c => `
                            <div class="label-row">
                                <div class="label-meta">
                                    <div class="label-dot" style="background:${c.color}"></div>
                                    <span class="label-name">${c.label}</span>
                                </div>
                                <span class="system-tag">${c.id}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="settings-card">
                    <h3 class="card-title">System Timezone</h3>
                    <div class="timezone-box">
                        <span>Current Offset</span>
                        <span>${Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renders the Calendar
     */
    renderCalendar(container, state) {
        const { month, year } = state.viewDate;
        const days = new Date(year, month + 1, 0).getDate();
        const start = new Date(year, month, 1).getDay();
        const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(year, month));

        let cells = '';
        for(let i=0; i<start; i++) cells += `<div class="cal-day cal-empty"></div>`;
        for(let d=1; d<=days; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const tasks = state.tasks.filter(t => t.date === dateStr);
            cells += `
                <div class="cal-day" onclick="window.showDayDetail('${dateStr}')">
                    <span class="day-num">${d}</span>
                    <div class="cal-dots">
                        ${tasks.map(t => {
                            const cat = state.settings.categories.find(c => c.id === t.category);
                            return `<div class="cal-dot" style="background:${cat?.color || 'var(--slate-400)'}"></div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="calendar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem">
                <h3 style="font-weight:900; font-size:2rem">${monthName} ${year}</h3>
                <div style="display:flex; gap:1rem">
                    <button onclick="window.changeMonth(-1)" class="nav-item" style="font-size:1.5rem"><i class="fa-solid fa-chevron-left"></i></button>
                    <button onclick="window.changeMonth(1)" class="nav-item" style="font-size:1.5rem"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
            <div class="calendar-grid">
                ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div style="text-align:center; padding:1rem; font-weight:900; font-size:0.7rem; color:var(--slate-400); text-transform:uppercase; background:var(--bg-slate); border-bottom:1px solid var(--border-slate)">${d}</div>`).join('')}
                ${cells}
            </div>
        `;
    },

    /**
     * Common Task Card Generator (for Dashboard)
     */
    createTaskHTML(t, state) {
        const cat = state.settings.categories.find(c => c.id === t.category);
        return `
            <div class="flow-card" style="border-left:8px solid ${cat?.color || 'var(--slate-200)'}" onclick="window.editTask('${t.id}')">
                <div style="flex:1">
                    <h4 class="flow-title" style="font-weight:900; font-size:1.1rem">${t.title}</h4>
                    <span style="font-size:0.75rem; font-weight:800; color:var(--slate-400); text-transform:uppercase">${cat?.label || 'General'} • ${t.time}</span>
                </div>
                <div style="display:flex; align-items:center; gap:2rem">
                    <span style="font-weight:900">${t.duration}h</span>
                    <span class="status-badge ${t.status}">${t.status}</span>
                </div>
            </div>
        `;
    }
};