# Compliance Console (Vite + React + TypeScript + Tailwind)

A single-page app that includes:
- Dashboard with consolidated grade
- Frameworks manager (toggle Active, add new frameworks)
- Assessments with weighted completion & clause coverage
- Auto-generated Risks from answers
- Integrations (Okta, Google Workspace, Workday, BambooHR, NetSuite, QuickBooks) with field mapping + ingest

## Local development

```bash
npm i
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy on Vercel

1) Push this repo to GitHub/GitLab/Bitbucket.
2) Import the project in Vercel.
3) Framework Preset: **Vite**
4) Build Command: `npm run build`
5) Output Directory: `dist`
6) That's it.

Tailwind is already configured (see `tailwind.config.js` and `postcss.config.js`).

## Notes
- The sample integrations display mock provider payloads. Click **Connect** to simulate and **Ingest** to apply to answers.
- Risks are derived automatically from non-`yes` answers using a simple heuristic (likelihood × impact).
- Clause coverage uses friendly labels for ISO/IEC 27001:2022 (A.5–A.8).
