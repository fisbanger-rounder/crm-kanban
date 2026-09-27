# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

`crm-kanban` is a static single-page CRM app built with plain HTML, CSS, and vanilla JavaScript (ES6). It uses Supabase for authentication and PostgreSQL persistence, with a localStorage fallback. There is no frontend framework and no bundler beyond a small Node minification script.

## Common commands

- **Install dependencies**
  ```powershell
  npm install --include=dev
  ```

- **Build / minify JavaScript**
  ```powershell
  npm run build
  ```
  This runs `node build.mjs`, which:
  - Generates `js/config.js` from `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars when they are set.
  - Minifies the JS files listed in `build.mjs` **in place**.
  - Fails if `js/config.js` is missing and the env vars are not set.

  > Important: `npm run build` mutates the working JS source files. Do not run it on code you intend to keep readable; let CI/Docker run the build, or commit/backup source first.

- **Start local dev server**
  ```powershell
  npm run dev
  ```
  Serves the repo root at `http://localhost:8090` with `npx http-server . -p 8090 -c-1 --cors`.

- **Run tests / lint**
  There are currently no test or lint scripts in `package.json`. CI only builds and validates that the expected JS output files exist.

- **Run with Docker**
  ```powershell
  docker compose up -d --build
  ```
  The app is then available at `http://localhost:8080`. The multi-stage `Dockerfile` runs `node build.mjs` inside the builder stage and serves the result with Nginx.

## Required configuration

`js/config.js` is gitignored. For local development, copy the template and fill in real Supabase credentials:

```powershell
copy js\config.example.js js\config.js
```

Then set the `SUPABASE_CONFIG` object in `js/config.js`.

For CI, Docker, or Vercel, set the environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` so `build.mjs` can generate `js/config.js` automatically.

## High-level architecture

### Static SPA shell

- `index.html` is the only page. It loads `css/style.css` and a fixed sequence of `<script>` tags:
  ```
  config.js → store.js → kanban.js → modal.js → contacts.js → analytics.js → settings.js → auth.js → app.js
  ```
  Order matters because later modules depend on globals defined by earlier ones.

### Global modules

Each JS file exposes a single global object via an IIFE:

- `CRMStore` (`js/store.js`) — central data store.
- `KanbanBoard` (`js/kanban.js`) — pipeline board renderer and drag-and-drop.
- `CRMModal` (`js/modal.js`) — add/edit/delete deal modal.
- `ContactsView` (`js/contacts.js`) — contact directory derived from deals.
- `AnalyticsView` (`js/analytics.js`) — dashboard KPIs and charts.
- `SettingsView` (`js/settings.js`) — profile, password, currency, theme.
- `CRMAuth` (`js/auth.js`) — Supabase auth UI and session handling.
- `app.js` wires the UI together, initializes views, and calls `initApp()` once the user is authenticated.

### Data flow

- `CRMStore` owns the in-memory `deals` array and the canonical stage list.
- Views render from `CRMStore.getAllDeals()` / `CRMStore.getStages()` and subscribe to store events (`deals:changed`, `stages:changed`, `currency:changed`, `theme:changed`).
- User actions (create, update, move, delete) go through `CRMStore.addDeal`, `updateDeal`, `moveDeal`, and `deleteDeal`, which update local state and localStorage first, then sync to Supabase when a user is signed in.
- Supabase is accessed through `window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)`. The app stores a cached client on `window.supabaseClient`.

### Data shapes

- In-memory/app deal objects use camelCase (`contactName`, `stageEnteredAt`, `createdAt`).
- Supabase rows use snake_case (`contact_name`, `stage_entered_at`, `created_at`).
- `CRMStore` maps between the two in `CRMStore.addDeal`, `updateDeal`, and `fetchDeals`.

### Persistence strategy

- **Authenticated users**: deals are read from and written to the Supabase `deals` table. Row Level Security ensures users only see their own rows.
- **Unauthenticated / offline / Supabase error**: deals fall back to `localStorage` under the key `crm_kanban_deals`.
- **Custom stages**: stored per-user in localStorage as `crm_kanban_stages_<user_id>`. Default stages are defined in `CRMStore` if none exist.
- **Theme, sidebar state, currency**: stored in localStorage.

### Authentication flow

- `CRMAuth.init()` creates the Supabase client, checks the current session, and either shows the app (`initApp()`) or the login/register UI.
- `CRMAuth` renders login/register forms directly into `#auth-screen`, handles Google OAuth, and updates the sidebar user profile on sign-in.
- If Supabase credentials are missing or still set to the placeholder values, `CRMAuth` shows a configuration error instead of the auth forms.

### Drag-and-drop

- Implemented with native HTML5 drag-and-drop in `kanban.js`.
- `KanbanBoard` renders each stage column with a `.column-cards` container, attaches `dragstart`/`dragend` on deal cards, and `dragover`/`dragleave`/`drop` on columns.
- Dropping a card calls `CRMStore.moveDeal(dealId, stageId)`, which updates the stage and `stageEnteredAt`, persists the change, then re-renders the board.

### Build / deployment notes

- `build.mjs` uses Terser. It keeps top-level names unmangled (`mangle.toplevel: false`) and keeps `console.log` calls (`drop_console: false`).
- `vercel.json` configures a static deployment with a build command, security headers, and a CSP that allows scripts from `'self'`, inline scripts, and `https://cdn.jsdelivr.net`, plus Supabase connect origins.
- The `Dockerfile` copies only the built web assets into an Nginx Alpine image; source/package files are removed in the final stage.

## Files to know

- `index.html` — app shell and script load order.
- `js/store.js` — data model, Supabase/localStorage sync, events.
- `js/auth.js` — Supabase authentication UI and session management.
- `js/kanban.js` — board rendering and drag-and-drop.
- `js/modal.js` — deal create/edit/delete modal.
- `build.mjs` — minification and config injection.
- `supabase_schema.sql` — database schema and RLS policies.
- `vercel.json` / `Dockerfile` / `nginx.conf` / `docker-compose.yml` — deployment configuration.
