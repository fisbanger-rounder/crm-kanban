# CRM Kanban — Sales Pipeline Web App

A modern, minimalist CRM (Customer Relationship Management) web application featuring a drag-and-drop Kanban board for managing deals across sales pipeline stages. Inspired by the clean, dark-mode-first aesthetic of [MoonShine Admin Panel](https://github.com/moonshine-software/moonshine).

![CRM Kanban Screenshot](https://raw.githubusercontent.com/moonshine-software/moonshine/main/art/screenshot.png)

---

## ✨ Features

- **📊 6 Pipeline Stages**: Lead → Qualified → Proposal → Negotiation → Closed Won / Closed Lost.
- **🖐️ Drag & Drop**: Native HTML5 drag-and-drop with real-time visual drop zones and instant counter recalculation.
- **🔐 Supabase Auth**: Full email/password authentication (Login, Registration, Logout, and Session Persistence).
- **🗄️ Supabase Database (PostgreSQL)**: Live backend persistence with Row Level Security (RLS) ensuring users only access their own deals.
- **🎨 Glassmorphism Design System**: Modern dark & light mode UI built with CSS custom properties and smooth micro-animations.
- **🔍 Real-Time Search & Modals**: Instant search filtering across titles, contact names, and companies, plus add/edit deal modal dialogs.
- **📱 Responsive Layout**: Collapsible sidebar navigation on desktop and drawer menu overlay on mobile.
- **⚡ Zero Build Step**: Built with pure HTML5, Vanilla CSS3, and JavaScript — no heavy node build pipelines required!

---

## 🛠️ Tech Stack

| Layer | Technology Used |
|---|---|
| **Frontend** | HTML5, Vanilla CSS3 (Variables, Glassmorphism, oklch colors), Vanilla JavaScript (ES6) |
| **Backend & Database** | [Supabase](https://supabase.com) (PostgreSQL, Auth, Realtime APIs) |
| **Icons & Fonts** | SVG Icons, Google Fonts (Inter) |
| **Deployment / Container** | Docker, Nginx (Alpine), Docker Compose |

---

## 🚀 Quick Start & Local Installation

### Prerequisites
- A web browser
- (Optional) Node.js for running a local static server, or Docker for container deployment

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/crm-kanban.git
   cd crm-kanban
   ```

2. **Configure Supabase Credentials**:
   - Copy `js/config.example.js` to `js/config.js`:
     ```bash
     cp js/config.example.js js/config.js
     ```
   - Open `js/config.js` and enter your Supabase credentials:
     ```javascript
     const SUPABASE_CONFIG = {
       url: 'https://your-project-id.supabase.co',
       anonKey: 'your-anon-public-key',
     };
     ```

3. **Run Locally**:
   Serve the files using any HTTP server:
   ```bash
   npx http-server . -p 8090
   ```
   Open **`http://localhost:8090`** in your browser.

---

## ⚙️ Supabase Database Setup

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** → **New query**.
3. Copy and run the contents of [`supabase_schema.sql`](supabase_schema.sql):

```sql
create table if not exists deals (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  contact_name text,
  company text,
  email text,
  phone text,
  value numeric default 0,
  priority text default 'medium',
  stage text default 'lead',
  notes text,
  created_at timestamptz default now(),
  stage_entered_at timestamptz default now()
);

alter table deals enable row level security;

create policy "Users can view their own deals" on deals for select using (auth.uid() = user_id);
create policy "Users can insert their own deals" on deals for insert with check (auth.uid() = user_id);
create policy "Users can update their own deals" on deals for update using (auth.uid() = user_id);
create policy "Users can delete their own deals" on deals for delete using (auth.uid() = user_id);
```

4. *(Optional)* To allow instant login during testing without verifying email, go to **Authentication** → **Settings** → disable **Confirm email**.

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
docker compose up -d --build
```
Access the application at **`http://your-server-ip:8080`**.

### Using Docker CLI

```bash
docker build -t crm-kanban:latest .
docker run -d --name crm-kanban --restart unless-stopped -p 80:80 crm-kanban:latest
```
Access the application at **`http://your-server-ip`**.

---

## 📂 Project Structure

```
crm-kanban/
├── index.html            # Main HTML application shell
├── favicon.svg           # SVG favicon
├── Dockerfile            # Production Nginx Dockerfile
├── nginx.conf            # Custom Nginx static server config
├── docker-compose.yml    # Docker Compose setup
├── supabase_schema.sql   # SQL setup script for Supabase DB
├── css/
│   └── style.css         # Complete design system & component styles
└── js/
    ├── config.js         # Supabase project URL & API keys (gitignored)
    ├── config.example.js # Template configuration file
    ├── auth.js           # Supabase Auth handler (login/register UI)
    ├── store.js          # Async data store with Supabase DB synchronization
    ├── kanban.js         # Kanban board renderer & HTML5 drag-and-drop logic
    ├── modal.js          # Deal add/edit/delete modal system
    └── app.js            # Main application entry point
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
