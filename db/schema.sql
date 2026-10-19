-- ============================================================
-- ProofOfWork — Supabase schema
-- Run this ENTIRE file once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> Paste -> Run).
--
-- You only run this once. After the tables exist, every new
-- user who signs up gets their profile row created
-- automatically by the handle_new_user() trigger below.
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default 'Unnamed',
  bio        text not null default '',
  skills     text[] not null default '{}',
  slug       text not null unique,          -- powers /p/<slug> public URLs
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  title        text not null,
  description  text not null default '',
  -- Label logic lives in the app: evidence_url present => "Evidence linked",
  -- empty/null => "Self-reported". Nothing is ever marked "verified".
  evidence_url text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists entries_profile_idx
  on public.entries (profile_id, created_at desc);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.entries  enable row level security;

-- Profiles: anyone can read public portfolios; owners update their own.
drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);

drop policy if exists "owners update own profile" on public.profiles;
create policy "owners update own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Entries: anyone can read; owners insert/update/delete their own.
drop policy if exists "entries are readable by everyone" on public.entries;
create policy "entries are readable by everyone"
  on public.entries for select using (true);

drop policy if exists "owners insert own entries" on public.entries;
create policy "owners insert own entries"
  on public.entries for insert
  with check (auth.uid() = profile_id);

drop policy if exists "owners update own entries" on public.entries;
create policy "owners update own entries"
  on public.entries for update
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "owners delete own entries" on public.entries;
create policy "owners delete own entries"
  on public.entries for delete
  using (auth.uid() = profile_id);

-- ------------------------------------------------------------
-- Auto-create a profile row when a new user signs up
-- ------------------------------------------------------------

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select nullif(trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g')), '')
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base      text;
  candidate text;
begin
  base := coalesce(
    slugify(new.raw_user_meta_data ->> 'full_name'),
    slugify(split_part(new.email, '@', 1)),
    'user'
  );
  candidate := base;
  while exists (select 1 from profiles where slug = candidate) loop
    candidate := base || '-' || substr(md5(random()::text), 1, 6);
  end loop;

  insert into profiles (id, name, slug, bio, skills)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    candidate,
    '',
    '{}'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Clearly-labelled SAMPLE portfolio
-- Creates a demo account (never used for login) with a
-- portfolio at public slug "sample".
-- ------------------------------------------------------------

do $$
declare
  sample_id uuid := '5e1f0000-0000-4000-8000-000000000001';
begin
  if not exists (select 1 from profiles where slug = 'sample') then
    -- Insert a demo auth user; the trigger above creates the profile.
    insert into auth.users (
      id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      sample_id, 'authenticated', 'authenticated', 'sample@proofofwork.local',
      -- deliberately invalid hash: this account cannot sign in
      '!sample-account-cannot-sign-in!', now(),
      now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Maya Chen"}'
    );

    update profiles set
      name = 'Maya Chen',
      bio = 'Second-year Computer Science student who likes shipping small, useful things. This is a clearly-labelled sample portfolio - everything here is illustrative, not verified.',
      skills = array['React', 'TypeScript', 'Python', 'Tailwind CSS', 'PostgreSQL'],
      slug = 'sample'
    where id = sample_id;

    insert into entries (profile_id, title, description, evidence_url) values
      (sample_id, 'Campus Find — lost & found web app',
       'Full-stack app for reporting and matching lost items on campus. Built the React frontend and a Postgres API; used by 300+ students in one semester.',
       'https://github.com/example/campus-find'),
      (sample_id, 'Smart India Hackathon finalist',
       'Team of six; built an accessibility-focused gov-services dashboard. Reached the national finals.',
       'https://sih.gov.in/'),
      (sample_id, 'Meta Front-End Developer Certificate',
       'Completed the professional certificate program covering React, UI design and accessibility.',
       'https://www.coursera.org/professional-certificates/meta-front-end-developer'),
      (sample_id, 'Open-source contributor, first PR merged',
       'Fixed a date-formatting bug in a popular charting library during Hacktoberfest.',
       null),
      (sample_id, 'Intro to Machine Learning course',
       'Self-paced course covering regression, classification and model evaluation.',
       null);
  end if;
end;
$$;

-- Done. Your tables, security policies, signup trigger and sample
-- portfolio are now in place. New signups are handled automatically.
