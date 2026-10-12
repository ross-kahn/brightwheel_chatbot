import { answerQuestion, type Turn } from "@/lib/answer";
import { listSections, logQuestion } from "@/lib/db";
import { errorResponse, readJson } from "@/lib/http";

const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;

// Keeps only well-formed recent turns and makes sure the first one is from the
// user, which the API requires.
// PROTOTYPE: history comes from the browser, so a user can forge earlier
// assistant turns. It only affects their own chat; production would keep the
// conversation server-side, keyed by a signed-in parent.
function cleanHistory(raw: unknown): Turn[] {
  const turns = (Array.isArray(raw) ? raw : [])
    .filter(
      (t): t is Turn =>
        typeof t === "object" &&
        t !== null &&
        (t.role === "user" || t.role === "assistant") &&
        typeof t.content === "string",
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }));
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

// Answers one parent question from the knowledge base and logs it.
// PROTOTYPE: public and unthrottled. Production would rate-limit per parent.
export async function POST(request: Request) {
  const body = await readJson(request);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 64) : "anonymous";

  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return errorResponse(`Please ask a question of up to ${MAX_QUESTION_LENGTH} characters.`);
  }

  const sections = await listSections();
  const { answer, failed } = await answerQuestion(question, cleanHistory(body?.history), sections);

  // Anything the assistant didn't fully answer goes to the operator inbox.
  const id = await logQuestion({
    sessionId,
    text: question,
    answer: answer.answer,
    mode: answer.mode,
    category: answer.category,
    sectionIds: answer.section_ids,
    status: failed || answer.mode !== "answered" ? "needs_review" : "ok",
  });

  return Response.json({
    id,
    answer: answer.answer,
    mode: answer.mode,
    sources: sections
      .filter((s) => answer.section_ids.includes(s.id))
      .map((s) => ({ id: s.id, title: s.title, body: s.body })),
  });
}
