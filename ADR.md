# Architecture Decision Record (ADR)

## Status
Accepted

## Context
We are building a static-hosted, mobile-first .diff viewer SPA for personal code review. The app must run entirely in the browser (iOS Safari primary), support upload/paste of a single unified diff from GitLab, and present a file tree plus a full-screen code viewer.

## Decision
1) **SPA with client-only processing**
- No backend or network calls. All parsing and rendering happens in the browser. State is persisted to localStorage.

2) **Framework: React + TypeScript + Vite**
- Chosen for fast iteration, strong ecosystem, and easy static hosting.

3) **Diff parsing: `parse-diff`**
- Parses unified diff into structured file/hunk/line data.

4) **Diff rendering: `react-diff-view` (unified only)**
- Provides GitHub/GitLab-style unified diff rendering with line numbers.

5) **Syntax highlighting: lightweight extension-based mapping**
- Use `refractor` or `highlight.js` via `react-diff-view` for common extensions.

6) **UI Model**
- Two primary modes: File Tree and Code Viewer.
- File Tree hides after file selection; Code Viewer has a floating button to reopen tree.
- Dark theme inspired by GitLab.

7) **Persistence**
- localStorage for last loaded diff, selected file, scroll positions, and theme.

## Consequences
- App can be hosted on GitHub Pages or any static host.
- All diff processing must remain efficient in-browser (target <= 10k LOC).
- No multi-user features or server-driven collaboration.
- Future improvements (sorting toggle, line wrapping, theme toggle) can be added without architectural changes.

## Alternatives Considered
- **Vanilla JS**: rejected due to maintainability and speed of iteration.
- **Svelte/Vue**: viable but React ecosystem better fits diff-rendering libraries.
- **Server-side parsing**: rejected due to no-backend requirement.
- **Side-by-side diff**: rejected for mobile usability.

