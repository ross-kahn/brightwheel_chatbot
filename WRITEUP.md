# AI Front Desk: write-up

**Live demo:** https://brightwheel-takehome-ashy.vercel.app/ (switch to staff view using the link in the upper right corner).

**The idea.** Every question the assistant can't answer becomes a one-tap fix for the operator, and that fix answers the next parent. Staff answer an inbox question once; it is saved as knowledge and cited the next time. I chose breadth: a thin slice of parent chat, operator inbox and knowledge editing, joined into that one loop.

**Usability.** Parents get the answer first, in a few plain sentences, with tappable chips showing the handbook text behind it. Each reply is answered, "I don't know" (handed to staff, never guessed), or sensitive (health, pick-up, billing disputes), where the policy is stated and a person follows up. Emergencies get "call 911" first. One known gap: each message is answered and logged on its own, so a parent who splits a thought across several short messages gets a reply to each fragment. A real system should wait briefly for the parent to stop typing and answer the messages together.

**Observability.** Every question is logged with its outcome, topic, sources and thumbs rating. The staff view shows what parents ask about, the share answered without staff, and what is waiting on a person.

**Accuracy.** `npm run eval` checks 28 parent questions for the right outcome, cited section and required facts, covering lookups, date and price arithmetic, sensitive topics, handbook gaps and prompt injection. It passes 28 of 28. I wrote both the prompt and the cases, so it is a regression check, not proof.

**Tokens.** There is no RAG. The whole knowledge base (about 5,300 tokens; the 56-page sample handbook would be about 30,000) sits in a cached system prompt, which removes retrieval misses. On Claude Opus 5.5 a question takes about 3 seconds and costs roughly half a cent with a warm cache, or three cents cold. The cache lasts five minutes, so a quiet center would mostly pay the cold price. A smaller model would be the first cost lever, with the eval as the check.

**Storage.** Two Postgres tables: knowledge sections and the question log, which keeps parents' words verbatim and grows without limit. Production would add retention rules and edit history. For tenancy I would use one shared database with a center id on every row, enforced by row-level security, and build each prompt from one center's rows so the model never holds two centers' data. A database per center would isolate better but cost more to run across thousands of small centers.

**Privacy.** Questions go to Anthropic's API and may contain a child's name or health details. Staff answers become visible to every parent, and nothing yet stops a reply about one child being saved as knowledge. My next iteration would be an AI review step between the staff answer and the knowledge base. It would flag child-specific details, tidy tone and ambiguity, and point out overlap with existing sections, then show staff the entry to approve.

**Security.** The assistant only sees the handbook and the current chat, so it cannot leak other parents' questions. The knowledge base should be treated as public, since anything in it can be coaxed out. `/admin` and its APIs have no login (intentional for the prototype), so anyone with the URL can read the log, including contact details, and edit the knowledge. There is no rate limit beyond a 500-character cap.

**A production MVP would add:** sign-in through brightwheel accounts; answers personalised from brightwheel's own data (classroom, balance, calendar, menus) through tools; staff notifications on hand-offs; handbook import with operator review; grouping of duplicate inbox questions; the eval in CI; rate limits.
