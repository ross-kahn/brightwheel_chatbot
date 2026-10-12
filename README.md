# AI Front Desk

A prototype front desk assistant for a fictional childcare center, built for the brightwheel take-home. Parents ask questions in a chat; the assistant answers from the center's handbook, and anything it can't answer goes to staff, whose reply becomes knowledge for the next parent.

- **Live demo:** https://brightwheel-takehome-ashy.vercel.app/ (parent view at `/`, staff view at `/admin`)
- **Write-up:** [WRITEUP.md](WRITEUP.md)

## Try it

The center is "Little Sprouts Early Learning Center". Everything it knows is in the staff view under **Knowledge**.

**1. Ask something the handbook covers.** Tap a source chip under the answer to see the handbook text behind it.

- "Are you open on Veterans Day?"
- "I forgot to pack lunch. What is it today?" (the answer depends on the weekday)
- "How much is part-time tuition for my 4 year old?" (needs a calculation)
- Then a follow-up: "And for a 2 year old?"

**2. Ask something sensitive.** The assistant states the written policy and flags it for staff instead of deciding for the parent.

- "My child has a fever, can they come in?"
- "My neighbor is picking up Maya today, is that ok?"

**3. Watch it learn.** This is the main idea of the prototype.

1. Ask something the handbook leaves out: parking at drop-off, potty training, sunscreen or birthday treats. The assistant says it doesn't know and hands the question to staff.
2. Open the staff view. The question is in **Needs you**. Write a short answer and choose **Save and teach the assistant**.
3. Go back to the parent view and ask again in different words. The assistant now answers and cites the staff entry.

If one of those has already been answered by an earlier visitor, pick another, or delete the entry under **Knowledge**.

**4. Change the source of truth.** In the staff view, open **Knowledge**, edit a tuition figure, and ask about tuition again.

**5. Try to break it.** Ask it to ignore its instructions, to repeat its prompt, or about something unrelated to the center.

**6. Look at the log.** **All questions** in the staff view shows every question, how it was handled, and which topics needed staff most.

## Tech stack

| Part | What the prototype uses |
|---|---|
| App | Next.js 16 (App Router, TypeScript) with Tailwind, as one deployable |
| Hosting | Vercel, on the free plan |
| Database | Neon Postgres, connected through Vercel |
| Model | Claude Opus 5.5 at low effort, through the Anthropic TypeScript SDK |
| API key | A personal Anthropic key with a spend limit |
| Secrets | Stored as Vercel environment variables. Nothing secret is in the repo; local runs read a gitignored `.env.local` |
| Tests | Vitest for unit tests, plus a small eval script for model output |

The app was written with help from Claude Code, running Claude Opus 5.5 at medium effort.

## Run it locally

Requires Node 22, a Postgres database (the project uses Neon) and an Anthropic API key.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run db:seed              # creates the tables and loads the demo data
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Key for the Claude API |
| `DATABASE_URL` | Postgres connection string |
| `CLAUDE_MODEL` | Optional. Defaults to `claude-opus-5-5` |

`npm run db:seed` deletes every row in both tables before loading the demo data, so don't point it at a database you want to keep.

## Tests

There are two kinds, and they answer different questions.

| Command | What it checks | Needs |
|---|---|---|
| `npm test` | The code around the model: input limits, inbox routing, history cleaning, citation checks, failure handling, the API routes | Nothing. The model and database are mocked, and it runs in under a second |
| `npm run eval` | The model's answers: 28 parent questions checked for the right outcome, the right cited section and the facts that must appear | `ANTHROPIC_API_KEY`. Makes 28 real API calls and takes under a minute |

Suggested use:

- **Run `npm test` after any code change.** It is free and fast.
- **Run `npm run eval` after changing the prompt in `lib/answer.ts`, the seed handbook, or the model.** To compare models, set `CLAUDE_MODEL` and run it again. It prints the pass count, latency and answer length.
- **Add a case to `db/eval.ts` whenever the assistant gets something wrong.** A case is one line: the question, the expected outcome, and the facts the answer must contain. A failing case prints its reasons and the full answer.

The eval uses the seed handbook in `db/seed-data.ts`, not the database, so its results don't change when someone edits knowledge on the live site. It catches regressions; it does not prove the assistant is accurate on questions it hasn't seen.

The React pages have no automated tests.

## Where things are

| Path | What it holds |
|---|---|
| `app/page.tsx` | Parent chat |
| `app/admin/` | Staff view: one file per tab |
| `app/api/` | Route handlers: `ask`, `questions`, `sections` |
| `lib/answer.ts` | The prompt and the Claude call |
| `lib/db.ts` | Every database query |
| `lib/http.ts`, `lib/center.ts` | Shared request helpers and center settings |
| `db/` | Schema, seed data, seed script and the eval |
| `tests/` | Unit tests, mirroring the layout above |

## Prototype shortcuts

Anything that would not ship is marked in the code with a `PROTOTYPE:` comment explaining what production would do instead. Search for that word to list them. The main ones: there is no login on the staff view or its APIs, no rate limit, one hard-coded center, and one database shared by local and production.
