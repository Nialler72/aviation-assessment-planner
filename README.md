# Year 1 Aviation Continuous Assessment Planner

Responsive React + TypeScript + Tailwind application for coordinating SETU Year 1 Aviation assessments. Supabase stores the shared schedule. Deploy to GitHub Pages or Vercel.

## Final access model

The coordinator chose a **shared board with lecturer initials, without sign-in**, replacing the original Microsoft Entra and lecturer-ownership requirement. Every visitor can read, add, edit and delete every assessment. There are no admin accounts, roles or verified identities. RLS is enabled with explicit shared-access policies; those policies intentionally permit anonymous CRUD on the assessment table. The public URL is not an access-control secret.

Only assessment coordination information should be entered. No student records or confidential notes. Initials are labels, not anonymisation guarantees. Microsoft Entra credentials and role assignment are not needed for this version.

## Features

- Six fixed week columns: Reading Week (26 October), then Weeks 8–12 (2, 9, 16, 23 and 30 November 2026).
- Any valid date can be saved, including Reading Week, December exam weeks, weekends and later dates. Extra week columns appear automatically.
- Create, edit and confirm deletion of assessments; validation in both browser and database.
- Group, module and text filtering, board/list views, upcoming deadlines, module totals, weekly workload and group heatmap.
- Green 1–2, amber 3–4, red 5+ assessments; zero is neutral. One submission counts once overall, even if it affects several groups.
- Excel workbook (assessments and weekly totals) and paginated landscape PDF. Exports respect the current filters and include every matching date.
- Thirty-second refresh; version checks prevent silently overwriting a colleague's intervening edit.
- Explicit demo mode with sample data saved only in local browser storage. Demo data is never inserted into Supabase.
- Native accessible modal, keyboard focus handling, labelled fields, text workload labels, mobile layout and reduced-motion support.

## Run locally

Use Node.js 22+ and pnpm 10+.

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

For a demonstration leave `VITE_DEMO_MODE=true`. For the shared board set:

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-KEY
VITE_DEMO_MODE=false
```

The variable name supports both a modern `sb_publishable_...` key and the older anon public key. Never use a secret key, service-role key or database password. Browser configuration is public. `.env.local` is ignored by Git. Restart the dev server after changing it.

```sh
pnpm test
pnpm build
pnpm preview
```

## Supabase setup

1. Create a Free project in a European region, with the Data API enabled.
2. Open SQL Editor, start a new query, paste **all** of `supabase/migrations/001_shared_board.sql`, and run it once. It creates the table, constraints, indexes, timestamp trigger and shared CRUD policies. Do not disable RLS.
3. Copy the project URL and publishable key into the environment variables above.
4. Open the planner, create an assessment, reload it, edit it, and verify the change from another browser. Delete the test assessment afterward.

This is a fresh-install migration. Do not re-run it against an existing installation. Future schema changes should be new numbered migrations. No passwords or role assignments are required for users. Restricting access later would require replacing these public policies and adding authentication.

Supabase Free projects may pause after low activity. Resume them in the dashboard if needed; consider the service's current paid plans if uninterrupted availability is required.

## GitHub Pages

This checkout includes the coordinator's public Supabase connection settings in
`src/client.ts`, so its initial deployment works without repository variables.
The variables below override those defaults when connecting another project.

1. Push the source to a GitHub repository on `main`.
2. In Settings → Secrets and variables → Actions → **Variables**, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_DEMO_MODE` (`false`).
3. In Settings → Pages, set Source to **GitHub Actions**.
4. Run **Test and deploy planner** in Actions, or push a commit to `main`.
5. Wait for a successful deployment, then open the Pages URL.

The workflow tests and builds before deployment. Vite uses relative asset paths, so a repository subpath works. The application has no client-side URL routes requiring a Pages fallback. Changing build variables requires a new workflow run.

## Vercel

Import the repository, select the Vite preset, use `pnpm build` and output directory `dist`, and add the same three environment variables. Deploy and verify shared CRUD. `vercel.json` supplies build settings and security headers. No Microsoft redirect URLs are needed.

## Lecturer initials

NC, LF, AM, CC, RM, MR, JD, TC, PGi, VOB, HAJ, PGo, CK.

PGi/PGo distinguish the two lecturers with PG initials. Stored submissions and exports use the short labels.

Modules: Aviation Science 1; Aircraft Anatomy & Design; Mathematics 1; Avionics Fundamentals; Management Fundamentals & Communication.

Groups: Aviation 1–6, stored as `AVIATION_1` through `AVIATION_6`.

Types: Quiz; Class Test; Lab Report; Presentation; Project Milestone; Project Submission; Practical Assessment; Other. Quiz is green, lab report yellow, class test orange, projects red, presentation blue, practical/other purple. Reading Week has a grey column.

## Verification

`src/domain.test.ts` covers calendar week boundaries, exact traffic-light thresholds, all-date scheduling, multi-group counting, invalid fields and dropdown counts. Run build checks before deployment. Test CRUD and multi-user refresh against the configured Supabase project before sharing the live board.

Outlook, Teams, email reminders and notifications are not configured. The app shows high-workload notices within the dashboard.

Official references: [Supabase API keys](https://supabase.com/docs/guides/api/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

