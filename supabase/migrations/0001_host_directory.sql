create extension if not exists pgcrypto;

create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  parking_notes text,
  building_entry_notes text,
  reception_phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.host_directory (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  slug text unique not null,
  slack_user_id text,
  slack_dm_channel text,
  phone text,
  team text,
  avatar_url text,
  office_id uuid references public.offices(id) on delete set null,
  parking_instructions text,
  arrival_instructions text,
  calendar_snippet text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  visitor_company text,
  notes text,
  source text not null,
  mode text not null,
  host_id uuid references public.host_directory(id) on delete set null,
  host_name text,
  status text not null default 'notified',
  host_message text,
  slack_channel_id text,
  slack_message_ts text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  collected_at timestamptz
);

create index if not exists host_directory_slug_idx on public.host_directory(slug);
create index if not exists host_directory_email_idx on public.host_directory(email);
create index if not exists visits_host_id_idx on public.visits(host_id);
create index if not exists visits_created_at_idx on public.visits(created_at desc);

alter table public.offices enable row level security;
alter table public.host_directory enable row level security;
alter table public.visits enable row level security;

drop policy if exists "hosts can read themselves" on public.host_directory;
create policy "hosts can read themselves"
on public.host_directory for select
using (email = auth.jwt()->>'email');

drop policy if exists "hosts can update themselves" on public.host_directory;
create policy "hosts can update themselves"
on public.host_directory for update
using (email = auth.jwt()->>'email');

drop policy if exists "public can insert visits" on public.visits;
create policy "public can insert visits"
on public.visits for insert
with check (true);

drop policy if exists "hosts can read their visits" on public.visits;
create policy "hosts can read their visits"
on public.visits for select
using (
  host_id in (
    select id from public.host_directory where email = auth.jwt()->>'email'
  )
);
