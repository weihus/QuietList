# CLAUDE.md — QuietList Engineering & Design Contract

This file defines the architecture, non-negotiable design tokens, security invariants, and development discipline for **QuietList**. Always consult `PRD.md` before starting a phase.

## 1. Tech Stack ($0-Cost Cloudflare Fullstack)

- **Frontend**: Vite + React 19 + TypeScript (strict mode)
- **Styling**: Tailwind CSS + CSS Custom Properties (`src/styles/tokens.css`)
- **Motion & DnD**: `framer-motion`, `@dnd-kit/core`, `@dnd-kit/sortable`
- **Icons**: `lucide-react` (strokeWidth `1.75`)
- **Local Storage**: Native `window.localStorage` (0ms synchronous read/write — do NOT introduce IndexedDB/Dexie)
- **Client Crypto (Phase 3)**: Native Web Crypto API (`crypto.subtle` — zero external crypto libraries)
- **QR Code (Phase 3)**: Lightweight client-side SVG generator (e.g. `qrcode` or `uqr`)
- **Backend & Storage (Phase 3)**: Cloudflare Pages Functions (`functions/api/sync.ts`) + Cloudflare D1 single table (`vaults`)
- **PWA (Phase 4)**: `vite-plugin-pwa`

## 2. Recommended Directory Structure

```text
.
├── wrangler.toml                 # (Phase 3) Cloudflare Pages + D1 binding config
├── migrations/
│   └── 0001_init_vaults.sql      # (Phase 3) Single-table D1 schema
├── functions/
│   └── api/
│       └── sync.ts               # (Phase 3) GET / PUT encrypted vault with CAS version check
└── src/
    ├── styles/
    │   └── tokens.css            # Single source of truth for colors, fonts, radii, shadows
    ├── types/
    │   └── task.ts               # Task, Subtask, SyncState interfaces
    ├── store/
    │   ├── localStore.ts         # localStorage read/write, 30-day auto-prune, JSON export/import
    │   └── useTaskStore.ts       # React state, CRUD, soft delete, rollover queries, undo stack
    ├── sync/                     # (Phase 3)
    │   ├── crypto.ts             # Passphrase -> sync_id (SHA-256) + AES-GCM encrypt/decrypt
    │   ├── passphrase.ts         # Poetic 4-word generator + custom passphrase strength validator
    │   ├── merge.ts              # Pure deterministic mergeTasks(local, remote) + 30-day prune
    │   └── syncClient.ts         # Debounced push, visibility/online pull, 409 CAS retry
    ├── hooks/
    │   ├── useKeyboardNav.ts     # Global shortcuts (N, Space, ↑/↓, E, D, T, 1/2, Cmd+Z, Esc)
    │   └── useTheme.ts           # System + manual light/dark toggle (.dark on <html>)
    ├── components/
    │   ├── Layout.tsx            # Centered max-w-[640px] shell, top view switcher, mobile bottom bar
    │   ├── RolloverBar.tsx       # Gentle Rollover prompt for unfinished tasks from past dates
    │   ├── QuickAddInput.tsx     # Zero-friction inline task input
    │   ├── TaskList.tsx          # Sortable list + collapsible Done drawer
    │   ├── TaskItem.tsx          # Rest / Hover / Focus / Expanded Lift / Completing / Swipe states
    │   ├── TaskCheckbox.tsx      # 18px circle, spring fill + SVG pathLength checkmark
    │   ├── SyncPopover.tsx       # (Phase 3) Sync status, passphrase form, QR code, JSON backup
    │   └── UndoToast.tsx         # Subtle bottom toast for completed/deleted actions
    └── utils/
        ├── date.ts               # Local YYYY-MM-DD helpers (never mix UTC with local Today)
        └── nlpDate.ts            # (Phase 4) Lightweight CN/EN date extraction
```

## 3. Non-Negotiable Product, UI & Security Rules

### UI & Product Constraints
1. **Zero Hardcoded Colors**: NEVER use raw hex codes or default Tailwind palette utilities (e.g. `bg-white`, `bg-gray-100`, `text-red-500`, `bg-blue-500`). EVERY color, border, shadow, and radius MUST reference CSS variables from `src/styles/tokens.css`.
2. **No Modals for Tasks**: NEVER open modals or drawers to add or edit tasks. All task editing happens in-place via the **Expanded Lift** card inside `TaskItem`. (Only the optional Sync settings popover may float cleanly from the top-right cloud icon.)
3. **No Red Overdue Indicators**: NEVER render red overdue text or badges for past dates. Unfinished Today tasks with `scheduledDate < todayStr` MUST appear inside `RolloverBar` using `--warm-tint`.
4. **Strict Minimalism**: Do NOT add folders, projects, tags, priority levels (P1–P4), Pomodoro timers, or user registration forms.
5. **1.5s Completion Grace Period**: Clicking a checkbox MUST visually mark the item completed immediately (strikethrough + `opacity: 0.55`), wait `1500ms` (cancellable by clicking again), and only then collapse it into the `Done` drawer and stamp `completedAt`.
6. **Spring Physics Consistency**: Use Framer Motion spring `{ type: "spring", stiffness: 420, damping: 32 }` for expand/collapse, checkbox bounce, and layout animations. Respect `prefers-reduced-motion`.
7. **Local Timezone Dates**: Always format `todayStr` (`YYYY-MM-DD`) using local `getFullYear() / getMonth() / getDate()`, NEVER `new Date().toISOString().slice(0, 10)`.
8. **Soft Delete & 30-Day Prune**: Deleting sets `deletedAt = Date.now()` and `updatedAt = Date.now()`. Prune any task where `completedAt` or `deletedAt` is older than `30 * 24 * 60 * 60 * 1000` ms on app boot and during sync merge.

### Sync & E2EE Security Invariants (Phase 3)
9. **Zero-Knowledge Server**: NEVER transmit the raw sync passphrase to the server, query params, or console logs. Only send the derived 64-char hex `sync_id` and AES-GCM `ciphertext`.
10. **Fresh IV Every Push**: ALWAYS generate a brand-new 12-byte `crypto.getRandomValues(new Uint8Array(12))` IV for every encryption call.
11. **Immediate URL Hash Scrubbing**: When importing a passphrase from `#sync=<passphrase>`, immediately call `window.history.replaceState(null, '', window.location.pathname + window.location.search)` so the secret never lingers in the address bar or browser history.
12. **Payload Size Guard**: Enforce a sane size limit (e.g. max `256 KB` ciphertext) in `functions/api/sync.ts` to protect free-tier D1 quotas against abuse.
13. **Password Manager Friendly**: Wrap passphrase entry in a semantic `<form>` with a visually hidden username field (`value="QuietList Sync"`) and `<input type="password" autoComplete="current-password">` so browsers/Keychain offer to save the passphrase automatically.

## 4. Design Tokens (`src/styles/tokens.css`)

Create and import `src/styles/tokens.css` as the single source of truth for styling:

```css
:root {
  /* Surfaces */
  --bg-canvas: #FAF9F6;
  --bg-surface: #FFFFFF;
  --bg-hover: #F2F0EB;
  --bg-active: #EAE7E0;

  /* Typography Ink */
  --text-primary: #1C1B19;
  --text-secondary: #6E6A63;
  --text-tertiary: #A39E95;

  /* Borders */
  --border-subtle: rgba(28, 27, 25, 0.07);
  --border-strong: rgba(28, 27, 25, 0.24);

  /* Accents */
  --accent: #4A7C59;
  --accent-soft: rgba(74, 124, 89, 0.12);
  --accent-fg: #FAF9F6;
  --warm-tint: #C27D38;
  --danger: #B84A39;

  /* Elevation & Geometry */
  --shadow-card: 0 4px 20px -2px rgba(28, 27, 25, 0.06), 0 0 0 1px rgba(28, 27, 25, 0.06);
  --shadow-drag: 0 12px 28px -4px rgba(28, 27, 25, 0.12), 0 0 0 1px rgba(28, 27, 25, 0.08);
  --radius-row: 10px;
  --radius-card: 14px;

  /* Typography */
  --font-sans: "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, sans-serif;
  --font-serif: "Newsreader", "Songti SC", "Noto Serif SC", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

.dark {
  --bg-canvas: #141413;
  --bg-surface: #1D1C1A;
  --bg-hover: #242320;
  --bg-active: #2C2B28;

  --text-primary: #ECEAE4;
  --text-secondary: #9B968E;
  --text-tertiary: #635F58;

  --border-subtle: rgba(236, 234, 228, 0.08);
  --border-strong: rgba(236, 234, 228, 0.26);

  --accent: #6FA37E;
  --accent-soft: rgba(111, 163, 126, 0.16);
  --accent-fg: #141413;
  --warm-tint: #D49A5A;
  --danger: #D46A5A;

  --shadow-card: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(236, 234, 228, 0.09);
  --shadow-drag: 0 16px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(236, 234, 228, 0.14);
}
```

### Typography & Spacing Specs
- **Container**: Centered `max-width: 640px`. Desktop padding: `64px 32px`; Mobile padding: `24px 20px 96px`.
- **View Title**: `28px` desktop / `24px` mobile, weight `600`, line-height `1.2`, tracking `-0.025em`.
- **Task Title**: `15px` desktop / `16px` mobile (prevents iOS Safari auto-zoom on input focus), weight `400`, line-height `1.5`.
- **Task Row**: `min-height: 44px`, padding `10px 12px`, collapsed gap `2px`, expanded `margin-block: 12px`.
- **Checkbox**: `18px × 18px` circle, `1.5px` stroke (`--border-strong`), `14px` gap to title.

## 5. Development Discipline & Verification

- **Strict Phase Isolation**: Complete phases sequentially per `PRD.md`. Do NOT scaffold Cloudflare Functions, D1 configs, or PWA plugins during Phase 1 or Phase 2.
- **Definition of Done (Every Phase)**:
  1. `npx tsc --noEmit` passes with zero errors.
  2. `npm run build` succeeds cleanly.
  3. Grep `src/` to verify zero hardcoded hex colors or default Tailwind color classes outside `tokens.css`.
  4. Verify both Light and Dark modes render with legible contrast and clean elevation.
