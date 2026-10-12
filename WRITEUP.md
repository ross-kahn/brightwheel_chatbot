# AI Front Desk: write-up

**Live demo:** https://brightwheel-takehome-ashy.vercel.app/ (switch to staff view using the link in the upper right corner).

**The idea.** Every question the assistant can't answer becomes a one-tap fix for the operator, and that fix answers the next parent. Staff answer an inbox question once; it is saved as knowledge and cited the next time. I chose breadth: a thin slice of parent chat, operator inbox and knowledge editing, joined into that one loop.

**Usability.** Parents get the answer first, in a few plain sentences, with tappable chips showing the handbook text behind it. Each reply is answered, "I don't know" (handed to staff, never guessed), or sensitive (health, pick-up, billing disputes), where the policy is stated and a person follows up. Emergencies get "call 911" first. A real system should also group messages that a parent splits across several lines, which today each get their own reply.

**Observability.** Every question is logged with its outcome, topic, sources and thumbs rating, and the staff view shows what parents ask about and where the assistant struggled.

**Testing.** An eval (`npm run eval`) checks model output on 28 parent questions, including sensitive topics, handbook gaps and prompt injection. It is good at catching regressions but does not guarantee accuracy; measuring that would need a different strategy, like staff reviewing a sample of real answers against the handbook. Unit tests (`npm test`) cover the code logic.

**Tokens.** There is no RAG. The whole knowledge base (about 5,300 tokens; the 56-page sample handbook would be about 30,000) sits in a cached system prompt, which removes retrieval misses. On Claude Opus 5.5 a question takes about 3 seconds and costs roughly half a cent with a warm cache, or three cents cold. The cache lasts five minutes, so a quiet center would mostly pay the cold price; a smaller model would be the first cost lever.

**Storage.** Two Postgres tables: knowledge sections and the question log, which keeps parents' words verbatim and grows without limit. Production would add retention rules, edit history, and tenant isolation so that one center's data could never reach another's.

**Privacy.** Questions go to Anthropic's API and may contain a child's name or health details. Staff answers become visible to every parent, and nothing yet stops a reply about one child being saved as knowledge. My next iteration would add an AI review step that screens each staff answer for sensitive details, tone and duplication before staff approve it.

**Security.** The assistant only sees the handbook and the current chat, so it cannot leak other parents' questions, but anything in the knowledge base can be coaxed out and should be treated as public. `/admin` and its APIs have no login (intentional for the prototype), so anyone with the URL can read the log, including contact details, and edit the knowledge.

**A production MVP would add:** sign-in through brightwheel accounts; answers personalised from brightwheel's own data (classroom, balance, calendar, menus); staff notifications on hand-offs; handbook import with operator review; rate limits.
