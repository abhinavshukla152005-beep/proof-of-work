# ProofOfWork

A portfolio backed by evidence. Students build and share portfolios of projects,
certificates and hackathons — every entry is labelled **Self-reported** or
**Evidence linked** (never "verified"), and each user gets one clean public URL.

## Stack

- Vite + React + React Router (hash routing)
- Supabase (auth + Postgres + row-level security)

## Setup

1. `npm install`
2. Run `db/schema.sql` once in your Supabase SQL Editor (creates `profiles` and
   `entries`, RLS policies, a signup trigger, and a labelled sample portfolio).
3. Create `.env`:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-publishable-key
   ```
4. `npm run dev`

## Routes

- `/signup`, `/login` — email + password auth
- `/dashboard` — edit name/bio/skills, add/edit/delete entries
- `#/p/:slug` — read-only public portfolio
- `#/p/sample` — clearly-labelled sample portfolio

## Honesty model

- Entry has an evidence URL → **Evidence linked**
- No URL → **Self-reported**
- Nothing is claimed to be independently verified.

## Deploy

The included GitHub Actions workflow builds and publishes to GitHub Pages.
Set the two `VITE_SUPABASE_*` env values in the workflow (or repo secrets).
