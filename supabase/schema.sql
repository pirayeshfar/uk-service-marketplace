-- Run this SQL in your Supabase Dashboard -> SQL Editor
create table if not exists public.marketplace_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Disable RLS for server-side access (or keep enabled if using SERVICE_ROLE_KEY)
alter table public.marketplace_store enable row level security;
