# AI workflow note

This assignment is explicitly AI-forward. I used an AI coding agent (Hermes on Grok) as a pair-programmer, not as an unsupervised code generator.

## Tools

- **Hermes / Grok** — scaffolding, boilerplate routes, first-pass UI, test drafts, documentation
- **Browser + curl** — verifying the running app (login, CRUD, share, import)
- **Node test runner** — access, sharing, import, persistence
- No Copilot/Cursor session on this slice; one agent, one repo

## Where AI sped the work up

- Next.js app skeleton, cookie session helpers, and route-handler wiring
- TipTap toolbar + editor client component
- First draft of README / architecture / submission inventory
- Turning the written access rules into unit tests

That is the boring, high-volume part of a 4–6 hour take-home. Using AI there bought time for product decisions: what to cut, how sharing should fail, how the page should feel.

## What I changed or rejected

- **Rejected a Google Docs clone** (realtime, comments, version history, suggestion mode). The agent will happily build all of it. That would have been a shallow demo.
- **Rejected indigo SaaS dashboard chrome.** The first UI pass looked like every AI template. I restyled it as a paper workspace (editorial type, owned vs shared lists, no fake metrics).
- **Rejected putting access checks only in React.** Generated UI assumed the client was enough. Rules live in `src/lib/access.ts` and are enforced in `src/lib/db.ts`.
- **Rejected Vercel-only serverless SQLite.** It does not survive. Single-instance SQLite is honest for this scope; Postgres is the documented next step.
- **Tightened share errors.** Early output returned generic 500s. Reviewers need “no Commons account for that email” and “only the owner can share.”
- **Stopped the editor from remounting on every keystroke** after an AI-generated `key={id + html}` broke typing.

## How I verified

- `npm test` — 12 tests on access, grant/revoke, formatting round-trip, markdown/text import
- Running the app and exercising: login as Alex → edit Welcome → refresh → sign in as Jordan and see it under Shared → share with Sam → import a markdown file → attach a file
- Read the generated files; did not submit anything I had not opened
- Noted incomplete items in `SUBMISSION.md` instead of implying they exist

## Judgment

AI is a multiplier on a clear spec and a liability on an unbounded one. The valuable part of this exercise is the scope cut and the access model. The agent typed faster. I decided what not to type.
