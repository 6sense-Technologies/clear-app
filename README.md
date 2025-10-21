
# Next.js Compliance Console (demo)

A minimal Next.js (app router) project with Tailwind that renders a working, client-side **Compliance Console**:
- Dashboard with consolidated grade
- Frameworks list with activate/select
- Assessments with weighted completion
- Risks auto-derived from answers (simple heuristic)
- Integrations placeholder

## Run locally
```bash
npm i
npm run dev
# open http://localhost:3000
```

## Notes
- Your original uploaded component is preserved under `/_source/` for reference.
- This demo uses a trimmed TypeScript version to ensure a clean boot in Next.js.
- Tailwind is already configured (see `styles/globals.css`).
