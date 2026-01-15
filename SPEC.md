# Web Diff Viewer SPA - SPEC

## 1. Summary
A single-page, static-hosted .diff viewer optimized for mobile (iOS Safari first). Users can upload or paste a GitLab-generated unified diff, browse the changed files in a tree, and review diffs in a clean, full-screen code viewer. Panels stay hidden behind a floating burger button for maximum code visibility. The experience mirrors GitLab diff conventions in a minimal, fast, offline-capable client-only app (no backend calls).

## 2. Goals
- Comfortable, interruption-free code review on iPhone (iOS Safari).
- Unified diff view only, with GitLab-like line numbers and red/green highlighting.
- File tree and code viewer are mutually exclusive on mobile; code uses full screen.
- Fast startup for small diffs (<= 10k LOC); no premature optimization.
- Persist state (last diff, last file, last scroll, theme) in localStorage.
- Single diff file at a time.

## 3. Non-Goals
- Side-by-side diff view.
- Multi-file uploads merged together.
- Collaboration, comments, or annotations.
- Server-side processing.
- Offline caching/service worker.

## 4. Target Environment
- Primary: iPhone 16 Pro Max, iOS Safari.
- Secondary: Desktop modern browsers.
- Landscape supported to show more code width.

## 5. Core UX Flows
### 5.1 Startup Screen
- Two tabs: Upload / Paste.
- Upload tab: file picker for a single .diff file.
- Paste tab: textarea to paste diff text.
- Primary action: "Load diff".
- Upon successful load, route to Main Screen.
- Errors show inline and remain on Startup Screen.

### 5.2 Main Screen
- Two modes: File Tree and Code Viewer.
- Default after load: File Tree (first time) with first file selected.
- Selecting a file switches to Code Viewer automatically and hides tree.
- Floating burger button always visible in Code Viewer to open File Tree.
- File Tree also has "Hide" button to switch back to Code Viewer.

### 5.3 Code Viewer
- Full-screen code area (no permanent side panels).
- Unified diff with GitLab-style coloring and line numbers.
- Floating "Files" button (or burger) to return to File Tree.
- Horizontal scroll for long lines; no wrapping by default.
- Smooth scroll to preserve reading continuity.

## 6. UI / Visual Design
- Dark theme inspired by GitLab; simple, high-contrast.
- Typography: monospace for code; clean sans-serif for UI.
- UI minimized: floating buttons only, no fixed headers.
- Code uses full viewport height and width.
- File Tree as overlay drawer/panel when visible.
- Support landscape mode with more visible columns and same controls.

## 7. Functional Requirements
### 7.1 Diff Input
- Accept a single diff file (GitLab unified diff) or pasted text.
- Max expected size: ~10k LOC.
- Validate that diff contains at least one file patch.

### 7.2 Diff Parsing
- Must parse:
  - Modified files
  - Added files
  - Deleted files
  - Renamed files
  - Binary files
  - Mode changes
- Preserve original file order as in diff.
- Each file record must include:
  - oldPath, newPath
  - changeType (add/mod/delete/rename/binary)
  - hunks with line numbers and line types

### 7.3 File Tree
- List files in original diff order.
- Each list item shows:
  - File path (newPath preferred)
  - Change type badge (A/M/D/R/B)
- Supports future ordering toggle (A->Z) but not implemented in v1.

### 7.4 Code Viewer
- Unified view only.
- Line numbers for both old and new lines (GitLab style).
- Line types: add, delete, context.
- Syntax highlighting by file extension.
- Binary files render as a placeholder ("Binary file changed").
- Large diff sections render with virtualization only if needed later.

### 7.5 State Persistence
Persist to localStorage:
- Last loaded diff (raw text).
- Last selected file.
- Last scroll position for that file.
- Theme (dark only for now, but store to allow future toggle).

### 7.6 Error Handling
- Invalid diff -> user-friendly message + remain on startup screen.
- Unsupported or empty diff -> message with actionable hint.
- Parsing errors must not crash app.

## 8. Accessibility
- No special requirements.
- Basic contrast and touch target sizing (>= 44px for floating buttons).

## 9. Tech Stack (Recommended)
- Framework: React + TypeScript + Vite.
  - Rationale: easy static hosting, good ecosystem, fast dev.
- Diff parsing: `parse-diff` (unified diff parser).
- Diff rendering: `react-diff-view` for unified view + line numbers.
- Syntax highlighting: `refractor` or `highlight.js` via `react-diff-view` integration.
- State: React hooks + context (no global state library needed).
- Styling: CSS modules or vanilla CSS with custom properties.

## 10. Data Model
```
DiffState:
  rawText: string
  files: DiffFile[]
  selectedFileId: string
  scrollByFileId: Record<string, number>
  theme: 'dark'

DiffFile:
  id: string
  oldPath: string
  newPath: string
  changeType: 'add' | 'modify' | 'delete' | 'rename' | 'binary'
  hunks: DiffHunk[]
  isBinary: boolean

DiffHunk:
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]

DiffLine:
  type: 'add' | 'del' | 'normal'
  oldLineNumber: number | null
  newLineNumber: number | null
  content: string
```

## 11. Routing & State Flow
- Single page with conditional views:
  - `StartupView` when no diff loaded.
  - `MainView` when diff is loaded.
- No external router required; view state is internal.

## 12. Components
- `App`
- `StartupView`
  - `UploadTab`
  - `PasteTab`
- `MainView`
  - `FloatingMenuButton`
  - `FileTreeDrawer`
  - `DiffViewer`
- `DiffViewer`
  - `Hunk`
  - `DiffLine`

## 13. Styling & Layout
- Root container uses `100dvh` and `100dvw` to handle iOS Safari.
- Body overflow hidden; code container handles its own scroll.
- Floating buttons in bottom-right or top-right with safe-area insets.
- File tree drawer slides in from left; full height.
- Landscape: slightly smaller UI buttons, wider code column, same layout.

## 14. Testing
- Unit tests (Vitest):
  - parse diff -> correct file count and types.
  - select file -> state updates and tree hides.
  - persistence -> localStorage serialization.
- UI smoke test (Playwright or Cypress optional):
  - load diff, open file tree, select file, back to tree.

## 15. Build & Deploy
- Build: `npm run build` (Vite).
- Deploy: GitHub Pages or any static host.
- Base path configurable in Vite for GitHub Pages.

## 16. Acceptance Criteria
- Works on iOS Safari with smooth scrolling and correct touch targets.
- Diff loads via upload or paste, renders all files in order.
- File tree toggles properly and auto-hides after selection.
- Code viewer occupies full screen, no persistent panels.
- Syntax highlighting for common extensions.
- State restores after refresh (diff + last file + scroll).

## 17. Open Questions / Future Options
- Add order toggle (A->Z).
- Optional line wrapping toggle.
- Optional theme toggle.
- Performance optimizations for >10k LOC.

