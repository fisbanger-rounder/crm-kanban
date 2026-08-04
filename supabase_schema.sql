-- ═══════════════════════════════════════════════════════
-- CRM Kanban — Supabase Database Schema
-- ═══════════════════════════════════════════════════════
-- Run this script in your Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Create deals table
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

-- 2. Enable Row Level Security (RLS)
alter table deals enable row level security;

-- 3. Create RLS Policies (Users manage their own deals)
create policy "Users can view their own deals" 
  on deals for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own deals" 
  on deals for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own deals" 
  on deals for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own deals" 
  on deals for delete 
  using (auth.uid() = user_id);

-- Optional index for faster queries by stage
create index if not exists idx_deals_user_stage on deals(user_id, stage);
