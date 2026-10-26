# Architecture note

## Product judgment

The prompt asked for a Google Docs-inspired editor under a 4–6 hour cap. The useful product is not feature parity. It is a coherent loop:

1. Sign in as a real user (even if seeded)
2. Write in a document that feels like a page, not a form
3. Keep that writing after refresh
4. Hand the page to someone else and see owned vs shared
5. Bring existing files into the same loop

Everything else is a sequel. Realtime CRDT, comments, and version history were cut on purpose so sharing, persistence, and the editing surface could be real instead of sketched.

## Stack

- **Next.js 16 App Router** — UI + HTTP API in one deployable
- **TipTap** — rich text in the browser; HTML + JSON stored so formatting round-trips
- **SQLite via better-sqlite3** — zero-cost local persistence, no paid database for reviewers
- **Signed cookies** — HMAC session, httpOnly, seeded bcrypt passwords
- **mammoth / marked** — .docx and .md import

SQLite is the right store for a single-instance take-home. If this became a multi-instance internal tool, the document/share tables move to Postgres with almost no query change. The access rules already live in `src/lib/access.ts` so they can be tested without the web framework.

## Access model

Deliberately small:

- One **owner**
- Zero or more **editors** (share by existing user email)
- Only the owner can grant or revoke
- Unshared users get 404, not a leaky 403 on existence

That is enough to demonstrate intent. Role explosion (viewer, commenter, domain-wide ACLs) would have eaten the timebox without improving the demo.

## File handling

Two product-relevant paths, both capped at 5 MB:

- **Import** `.txt` / `.md` / `.html` / `.docx` → new document or replace current draft
- **Attach** any file to a document (receipt, screenshot, export) stored on disk and authorized through the same share rules

Unsupported import types fail with a message that matches the UI copy.

## Runtime shape

```
browser  →  Next route handlers  →  access.ts  →  SQLite
                              ↘  data/uploads
```

No separate backend process. Autosave is debounced (~700ms) from the client. The editor remounts when the open document identity changes, not on every keystroke.

## Quality bar for the timebox

- One meaningful automated test suite around the riskiest logic (sharing + import + persistence)
- Explicit error messages on auth, share, and file type failures
- Desktop-first workspace (Operate + Inspect surfaces) instead of a marketing landing page
- Docs that tell a reviewer what was cut and why

## What another 2–4 hours would buy

- Presence / “also editing” indicator without true OT
- Markdown export
- Postgres + object storage for a multi-instance deploy
- A viewer role
- Sidebar on small screens
