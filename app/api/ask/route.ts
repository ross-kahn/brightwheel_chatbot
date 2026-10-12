import { answerQuestion, type Turn } from "@/lib/answer";
import { listSections, sql } from "@/lib/db";

const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 64) : "anonymous";

  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return Response.json(
      { error: `Please ask a question of up to ${MAX_QUESTION_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const history: Turn[] = (Array.isArray(body?.history) ? body.history : [])
    .filter(
      (t: unknown): t is Turn =>
        typeof t === "object" &&
        t !== null &&
        ((t as Turn).role === "user" || (t as Turn).role === "assistant") &&
        typeof (t as Turn).content === "string",
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((t: Turn) => ({ role: t.role, content: t.content.slice(0, 2000) }));
  // The API needs the conversation to open with a user turn.
  while (history.length && history[0].role !== "user") history.shift();

  const sections = await listSections();
  const { answer, failed } = await answerQuestion(question, history, sections);
  const status = failed || answer.mode !== "answered" ? "needs_review" : "ok";

  const [row] = await sql()`
    INSERT INTO questions (session_id, text, answer, mode, category, section_ids, status)
    VALUES (${sessionId}, ${question}, ${answer.answer}, ${answer.mode}, ${answer.category},
            ${answer.section_ids}, ${status})
    RETURNING id`;

  return Response.json({
    id: row.id,
    answer: answer.answer,
    mode: answer.mode,
    sources: sections
      .filter((s) => answer.section_ids.includes(s.id))
      .map((s) => ({ id: s.id, title: s.title, body: s.body })),
  });
}
