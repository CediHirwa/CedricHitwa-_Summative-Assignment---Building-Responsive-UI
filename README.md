# Campus Flow — Academic Operating System

**Live Demo:** [Watch the 3-Minute Demo Video](https://drive.google.com/file/d/1wmntqqXuAyCFyoReVyVQQupqWb2oQq9e/view?usp=sharing)

**Live Site:** [https://cedihirwa.github.io/CedricHitwa-_Summative-Assignment---Building-Responsive-UI/](https://cedihirwa.github.io/CedricHitwa-_Summative-Assignment---Building-Responsive-UI/)

**Project Concept Note:** [View Detailed Concept & Design Document](https://docs.google.com/document/d/1pBkDmfUjDEaZ33oYISee9em3C8SJqfPJJ1KSD8Zt0CU/edit?usp=sharing)

Campus Flow is a responsive, accessible, vanilla JavaScript web application designed to help students manage academic workload through energy management and workload intensity tracking.

---

## Theme: Campus Life Planner
This application implements the **Campus Life Planner** theme, focusing on:
* **Activity Tracking:** Logging tasks, events, and study sessions with durations.
* **Workload Intensity:** A dynamic "Heat Bar" that calculates daily capacity.
* **Registry Integrity:** Enforcing clean data through strict Regex validation.

---

## Core Features
- **Dashboard & Stats:** Real-time calculation of today's hours vs. daily cap, top tags, and weekly cadence.
- **Planner Table:** Full CRUD functionality with inline editing, multi-column sorting, and live regex search.
- **Calendar View:** A monthly grid with date-specific task overlays and urgency indicators.
- **Regex Search & Highlight:** A safe regex compiler that highlights matches using the `<mark>` tag without breaking accessibility.
- **Persistence:** Auto-saves all changes to `localStorage`; supports JSON Import/Export with full schema validation.
- **Accessibility (a11y):** Built with semantic HTML5, ARIA live regions for status updates, and a strict keyboard-only navigation flow.

---

## Regex Catalog
The following patterns power the validation and search engine:

| Rule | Pattern | Description | Advanced Feature |
| :--- | :--- | :--- | :--- |
| **Title Cleanliness** | `/^\S(?:.*\S)?$/` | Forbids leading/trailing spaces and ensures content. | Non-capturing group |
| **Alpha Presence** | `/^(?=.*[A-Za-z]).+$/` | Ensures titles aren't just numbers/symbols. | **Positive Lookahead** |
| **Duplicate Check** | `/\b(\w+)\s+\1\b/i` | Detects repeated words (e.g., "Study Study"). | **Back-reference** |
| **Numeric Hours** | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Validates durations between 0.1 and 24. | Quantifiers |
| **ISO Date** | `^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|...)$` | Validates YYYY-MM-DD format. | Char Classes |

---

## Accessibility (a11y) Notes
- **Landmarks:** Uses `<header>`, `<nav>`, `<main>`, and `<section>` for screen reader orientation.
- **Announcements:** Status updates (e.g., "Record deleted") and budget warnings are broadcast via `aria-live="polite"` and `aria-live="assertive"`.
- **Focus Control:** Includes a "Skip to Content" link and manages focus restoration when closing modals.
- **Color Contrast:** All UI elements maintain a contrast ratio of at least 4.5:1.

### Keyboard Map
- **Navigation:** `Tab` to move, `Enter` to select.
- **Sorting:** `Tab` to table headers, then `Enter` or `Space` to sort.
- **Modals:** `Esc` to close any dialog or overlay.
- **Calendar:** `Tab` through date cells; `Enter` to view details for that day.

---

## Local Development & Testing
1. Clone the repository.
2. Open `index.html` in any modern browser (no build step required).
3. To run the automated test suite:
   - Open `tests.html` in your browser.
   - Click **"Run All Tests"** to verify regex logic and search utility functions.

---

## Creator
**Cedric Hirwa** HR Professional & Architect  
[c.havugiman@alustudent.com](mailto:c.havugiman@alustudent.com) | [GitHub Profile](https://github.com/CediHirwa)
