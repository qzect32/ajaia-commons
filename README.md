# Commons

Lightweight collaborative documents for the Ajaia Full Stack Product Engineer take-home.

Not a Google Docs clone. A working product slice: create, rename, rich-text edit, persist, import files, and share with another user.

## Live demo

https://pre-messaging-freeze-let.trycloudflare.com

Walkthrough: https://pre-messaging-freeze-let.trycloudflare.com/walkthrough.mp4

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
DATABASE_PATH=/absolute/path/commons.db
```

## What works

- Sign in with seeded users (signed httpOnly cookie, no paid auth vendor)
- Create / rename / autosave / reopen documents
- Bold, italic, underline, H1/H2, bulleted and numbered lists
- Import `.txt`, `.md`, `.html`, `.docx` as a new document, or replace the current draft (5 MB cap, types shown in the UI)
- Attach any file to a document and download it again
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
