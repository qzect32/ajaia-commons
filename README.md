# Commons

Lightweight collaborative documents for the Ajaia Full Stack Product Engineer take-home.

Not a Google Docs clone. A working product slice: create, rename, rich-text edit, persist, import files, and share with another user.

## Live demo

https://ajaia.pp-0.com

Walkthrough: https://ajaia.pp-0.com/walkthrough.mp4

This host is on personal AWS (Lightsail in us-east-1). Data volume is a 15 GB loop at `/data`. The instance, static IP, DNS for `ajaia.pp-0.com`, and teardown Lambda are scheduled for deletion at 2027-11-15 00:00 America/New_York. Apex `pp-0.com` and `portfolio.pp-0.com` are not part of this stack.

Seeded accounts:

| Email | Password | Notes |
| --- | --- | --- |
| alex@commons.demo | commons-demo | Owns **Welcome to Commons**, already shared with Jordan |
| jordan@commons.demo | commons-demo | Editor on Welcome; owns **Q4 kickoff notes** |
| sam@commons.demo | commons-demo | No shares until you grant access |

## Local setup

Requires Node 22+.

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000 and sign in as Alex.

Production start after `npm run build`:

```bash
npm start
```

SQLite lives at `data/commons.db` (created on first run). Uploads live in `data/uploads/`. Both are gitignored.

Optional env:

```
SESSION_SECRET=change-me-in-production
DATABASE_PATH=/data/commons.db
DATA_DIR=/data
```

## What works

- Sign in with seeded users (signed httpOnly cookie, no paid auth vendor)
- Create / rename / autosave / reopen documents
- Bold, italic, underline, H1/H2, bulleted and numbered lists
- Import `.txt`, `.md`, `.html`, `.docx` as a new document, or replace the current draft (100 MB cap, 15 GB host quota, types shown in the UI)
- Attach any file to a document and download it again (same caps)
- Owner grants editor access by email; owned vs shared lists are separate
- Persistence in SQLite so refresh keeps documents and shares

## Intentionally not built

- Real-time multi-cursor collaboration
- Comments / suggestion mode
- Version history
- Viewer-only vs editor roles beyond owner/editor
- Self-serve signup
- Mobile-native chrome (layout works, sidebar is desktop-first)

## Tests

```bash
npm test
```

Covers access control, sharing grant/revoke, formatting persistence, and file import.

## Docs in this repo

- `ARCHITECTURE.md` — scope cuts and system shape
- `AI_WORKFLOW.md` — how AI was used on this assignment
- `SUBMISSION.md` — inventory of deliverables
- `WALKTHROUGH.md` — script for the 3–5 minute video
