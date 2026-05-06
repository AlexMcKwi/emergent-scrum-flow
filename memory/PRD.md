# SCRUM.FLOW — Product Requirements Document

## Original Problem Statement
"Construis moi une application de gestion des tâches pour un business analyste IT avec un rôle de scrum master. La création, la modification et l'archivage de tâches avec une vue synthétique des tâches quotidiennes et hebdomadaire, un historique. Les tâches ont un titre, une description, une date de début et date d'échéance souhaitée et une date de fin réelle. Il est même possible de relier les tâches avec d'autres tâches du type tâches parents/enfants."

## User Choices
- Authentication: **Google Login** (Emergent-managed)
- Scope: **Mono-utilisateur**
- Task fields: priority + status + tags + all base fields
- Views: Dashboard daily/weekly, Kanban DnD, Tree parent/child, Archives, Stats
- Theme: Modern dark mode

## Architecture
- Stack: FastAPI + MongoDB + React (react-router v7) + Tailwind + shadcn/ui
- Auth: Emergent Google OAuth → session_token httpOnly cookie (7d)
- Drag-drop: @dnd-kit/core + @dnd-kit/sortable
- Charts: recharts
- Icons: lucide-react
- Fonts: Chivo (headings), IBM Plex Sans (body), JetBrains Mono (labels)
- Theme: obsidian dark `#0A0A0B` / surface `#131418` / accent `#FF5E00`

## Personas
- IT Business Analyst acting as Scrum Master — needs synthetic daily & weekly views, traceability parent/child, archive history, sprint analytics.

## Core Requirements (static)
- CRUD tasks with fields: title, description, start_date, due_date, actual_end_date, priority, status, tags, parent_id
- Archive / Unarchive / Delete (deleting parent unlinks children)
- Daily + Weekly synthesis on dashboard
- Kanban board (To do / In progress / Blocked / Done) with drag-drop status update
- Parent/child tree view
- Statistics (total, active, completed, overdue, archived, avg duration, charts)

## Implemented (2026-02-XX)
- [x] Emergent Google Auth (session endpoint, /me, logout)
- [x] Task model + all CRUD endpoints, user-scoped
- [x] Auto actual_end_date when status becomes "done"
- [x] Daily/Weekly synthesis (dashboard)
- [x] Kanban board (dnd-kit drag-drop)
- [x] Tree view parent/child with expand/collapse
- [x] Archive page + unarchive
- [x] Statistics page (bar + pie + KPI)
- [x] Dark theme with Chivo / IBM Plex / JetBrains Mono
- [x] Backend pytest 13/13 passing

## Implemented (2026-02-XX — Iteration 2)
- [x] Reusable `FilterBar` component (search + priority + tag + reset)
- [x] Filters integrated on Kanban (preserves drag-drop) and Archives
- [x] Monthly Calendar view at /calendar (Mon→Sun grid, today highlight, status colors, prev/next/today nav, click-to-edit, day-cell quick-add with date prefill)
- [x] CSV export on Archives (filtered) and Stats (all tasks). UTF-8 BOM for Excel compatibility.
- [x] TaskModal accepts `initialDate` prop for date prefill from Calendar
- [x] User model coerces non-string `created_at` (BSON Date safe)
- [x] Frontend testing agent: 10/10 features verified

## Backlog (prioritized)
- P1: Enum validation on priority/status in Pydantic
- P1: Cross-user parent_id validation
- P2: Full-text search and tag filters in UI
- P2: Bulk edit / quick status toggle on cards
- P2: CSV export of archive / history
- P3: Sprint / cycle object to group tasks
- P3: Calendar view (month)
- P3: Notifications for overdue tasks

## Next Tasks
- Add enum validation + parent validation on backend
- Add search bar + tag filter to Kanban / Archive
- Consider adding a "focus timer" or daily standup helper (BA-specific)
