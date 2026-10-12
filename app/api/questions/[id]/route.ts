import { sql } from "@/lib/db";

// One endpoint for everything that can happen to a logged question:
//   { feedback: "up" | "down" }   parent rates the answer
//   { contact: string }           parent leaves a way to reach them
//   { resolve: { title, body } }  operator writes the answer, which becomes knowledge
//   { dismiss: true }             operator marks it as needing no change
export async function PATCH(request: Request, ctx: RouteContext<"/api/questions/[id]">) {
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  if (!Number.isInteger(id) || !body) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const db = sql();

  if (body.feedback === "up" || body.feedback === "down") {
    await db`
      UPDATE questions
      SET feedback = ${body.feedback},
          status = CASE WHEN ${body.feedback} = 'down' AND status = 'ok' THEN 'needs_review' ELSE status END
      WHERE id = ${id}`;
  } else if (typeof body.contact === "string" && body.contact.trim()) {
    await db`UPDATE questions SET contact = ${body.contact.trim().slice(0, 200)} WHERE id = ${id}`;
  } else if (body.dismiss === true) {
    await db`UPDATE questions SET status = 'resolved' WHERE id = ${id}`;
  } else if (typeof body.resolve?.body === "string" && body.resolve.body.trim()) {
    const [question] = await db`SELECT text FROM questions WHERE id = ${id}`;
    if (!question) return Response.json({ error: "Not found" }, { status: 404 });
    const title = (typeof body.resolve.title === "string" && body.resolve.title.trim()) || question.text;
    await db`
      INSERT INTO sections (title, body, source, from_question_id)
      VALUES (${title.slice(0, 200)}, ${body.resolve.body.trim()}, 'operator_answer', ${id})`;
    await db`UPDATE questions SET status = 'resolved' WHERE id = ${id}`;
  } else {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  return Response.json({ ok: true });
}
