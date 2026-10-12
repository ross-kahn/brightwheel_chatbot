# AI Front Desk: write-up

**Live demo:** TODO add URL (parent view at `/`, staff view at `/admin`)

**The idea.** Every question the assistant can't answer becomes a one-tap fix for the operator, and that fix answers the next parent. I chose breadth: a thin slice of parent chat, operator inbox and knowledge editing, joined into that one loop.

**Usability.** Parents get the answer first, in a few plain sentences, with tappable source chips showing the handbook text behind it. Each reply is one of three kinds: answered; "I don't know", which is handed to staff and never guessed; or sensitive (health, pick-up, billing disputes), where the policy is stated and a person follows up. Contact details are requested only at hand-off. Emergencies get "call 911" first.

**Observability.** Every question is logged with its outcome, topic, cited sections and thumbs rating. The staff view shows what parents ask about, the share answered without staff, and an inbox of what needs a person.

**Improving over time.** Staff answer an inbox question once. It is saved as knowledge and cited the next time a parent asks. Handbook sections are editable in place and take effect on the next question.

**Accuracy.** `npm run eval` runs 28 parent questions against expected outcomes, cited sections and required facts. It covers lookups, date and price arithmetic, sensitive topics, gaps in the handbook and prompt injection, and currently passes 28 of 28. I wrote both the prompt and the cases, so it is a regression check, not proof.

**Tokens.** There is no RAG. The whole knowledge base (about 5,300 tokens; the 56-page sample handbook would be about 30,000) goes in a cached system prompt, which removes retrieval misses. On Claude Opus 5.5 a question takes about 3 seconds and costs roughly half a cent with a warm cache, or three cents cold. The cache lasts five minutes, so a quiet center mostly pays the cold price. A smaller model is the first cost lever, and the eval is how I would check it.

**Storage.** Two Postgres tables: knowledge sections and the question log. The log keeps parents' words verbatim and grows without limit. Production needs retention rules and edit history on sections.

**Privacy.** Questions go to Anthropic's API and may contain a child's name or health details. Nothing identifies the parent unless they leave contact details. Staff answers become visible to every parent, so a reply about one child must not be saved as knowledge. The UI does not yet guard against that.

**Security.** The assistant only sees the handbook and the current chat, so it cannot leak other parents' questions. Treat the knowledge base as public, though: anything in it can be coaxed out. The real hole is that `/admin` and its APIs have no login, so anyone with the URL can read the log, including contact details, and edit the knowledge. There is no rate limit beyond a 500-character cap.

**For a production MVP.** Sign-in through brightwheel accounts, with data separated per center. Answers personalised from brightwheel's own data (the child's classroom, balance, calendar, menus) through tools instead of prose. Staff notified on hand-offs. Handbook import with operator review. Duplicate inbox questions grouped. The eval in CI. Rate limits and retention.
