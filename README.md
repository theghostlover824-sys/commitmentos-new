# CommitmentOS

A focused, mobile-first commitment tracker for keeping every promise visible, owned, and moving.

## MVP capabilities

- Today, All Commitments, and Waiting On views
- Create and edit commitments
- Complete and reopen commitments
- Status, owner, due date, confidence, source, and notes
- Dynamic current date handling (no hard-coded demo date)
- Responsive polished UI for mobile and desktop
- Supabase-ready client with environment-based credentials
- Supabase migration with per-user Row Level Security policies

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The interface runs in preview mode without Supabase credentials. To connect persistence, create a Supabase project, apply `supabase/migrations/001_initial_schema.sql`, then set:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never expose a Supabase service-role key in a browser environment. The app is designed to use the anon key with authenticated users and database RLS.

## Build

```bash
npm run build
```

## Project structure

- `src/main.jsx` — application UI and interaction state
- `src/styles.css` — responsive visual system
- `src/lib/supabase.js` — environment-aware Supabase client
- `supabase/migrations/001_initial_schema.sql` — schema, indexes, trigger, and RLS
