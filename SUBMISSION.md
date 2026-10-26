# Commons — Ajaia take-home submission

Candidate: Payne Patzke (paynewp@gmail.com)
Role: AI-Native Full Stack Product Engineer
Date: 2026-10-26

## Links

- Live product: https://pre-messaging-freeze-let.trycloudflare.com
- Source: https://github.com/qzect32/ajaia-commons
- Walkthrough video: https://pre-messaging-freeze-let.trycloudflare.com/walkthrough.mp4
- Video URL file: `VIDEO.txt`

This packet is the public GitHub repo (source + notes + screenshots + video). A Google Drive copy is not created from this environment; the repo is the canonical folder.

## Reviewer login

Password for all seeded users: `commons-demo`

| Name | Email | What to look at |
| --- | --- | --- |
| Alex Rivera | alex@commons.demo | Owner of *Welcome to Commons*. Share, import, rename, edit. |
| Jordan Lee | jordan@commons.demo | Owns *Q4 kickoff*. Sees Welcome under Shared with me. |
| Sam Okonkwo | sam@commons.demo | Editor after Alex shares. Cannot share or delete. |

## What is included

- Next.js App Router app (`src/`)
- `README.md` — local setup
- `ARCHITECTURE.md` — product cuts and stack
- `AI_WORKFLOW.md` — tools, speedups, rejections, verification
- `WALKTHROUGH.md` — spoken outline for the video
- `VIDEO.txt` — public video URL
- `public/demo/login.png`, `public/demo/workspace.png`
- `public/walkthrough.mp4` (~90s narrated stills of the live UI)
- Tests: `tests/access.test.ts`, `tests/db.test.ts`, `tests/importFile.test.ts`
- `Dockerfile` for a self-hosted Node + SQLite deploy
- Fixture: `fixtures/sprint-notes.md`

## What works

- Create, rename, edit, autosave, reopen
- Bold, italic, underline, headings, lists (TipTap)
- Import `.txt` / `.md` / `.html` / `.htm` / `.docx` (5 MB)
- Attachments on a document (5 MB)
- Owner vs editor; owned vs shared lists
- SQLite persistence of documents, shares, formatting
- Validation errors on login, share, import type/size

## Incomplete / not built

- No realtime CRDT / presence
- No comments, suggestions, or version history
- No PDF/Markdown export
- Auth is HMAC session cookies + seeded users, not production identity
- Live URL is a Cloudflare quick tunnel in front of `next start` on this machine. It is free. It will go down if the host process stops. Repo + Docker remain the durable path.

## Next 2–4 hours

- Named/stable host (Fly or a small VPS) instead of a quick tunnel
- Conflict-safe concurrent edits or a “someone else is viewing” flag
- Markdown export
- Playwright e2e for share + import

## How to run locally

See `README.md`. `npm install && npm test && npm run dev`
