// All database access lives here so routes stay thin and queries have one home.
// PROTOTYPE: single center, no tenant column. Production would scope every
// query by center id and enforce it with row-level security.
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type Section = {
  id: number;
  title: string;
  body: string;
  source: "handbook" | "operator_answer";
  from_question_id: number | null;
  updated_at: string;
};

export type Mode = "answered" | "unknown" | "sensitive";

export type Question = {
  id: number;
  session_id: string;
  text: string;
  answer: string;
  mode: Mode;
  category: string;
  section_ids: number[];
  feedback: "up" | "down" | null;
  contact: string | null;
  status: "ok" | "needs_review" | "resolved";
  created_at: string;
};

export type SectionInput = { title: string; body: string };

let client: NeonQueryFunction<false, false> | undefined;

// Creates the client on first use so `next build` works without DATABASE_URL.
function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

// Returns the whole knowledge base in a stable order (the prompt cache depends on it).
export async function listSections(): Promise<Section[]> {
  return (await sql()`SELECT * FROM sections ORDER BY id`) as Section[];
}

// Adds a handbook section written by an operator in the Knowledge tab.
export async function createSection({ title, body }: SectionInput): Promise<Section> {
  const [row] = await sql()`INSERT INTO sections (title, body) VALUES (${title}, ${body}) RETURNING *`;
  return row as Section;
}

// Replaces a section's title and text. Returns null if the id doesn't exist.
export async function updateSection(id: number, { title, body }: SectionInput): Promise<Section | null> {
  const [row] = await sql()`
    UPDATE sections SET title = ${title}, body = ${body}, updated_at = now()
    WHERE id = ${id} RETURNING *`;
  return (row as Section) ?? null;
}

// Removes a section. Logged questions that cited it keep the dangling id.
export async function deleteSection(id: number): Promise<void> {
  await sql()`DELETE FROM sections WHERE id = ${id}`;
}

// Returns the most recent questions for the operator view.
// PROTOTYPE: fixed cap of 500 rows; production would paginate.
export async function listQuestions(): Promise<Question[]> {
  return (await sql()`SELECT * FROM questions ORDER BY created_at DESC LIMIT 500`) as Question[];
}

// Logs a parent question with the assistant's reply and returns the new row id.
export async function logQuestion(q: {
  sessionId: string;
  text: string;
  answer: string;
  mode: Mode;
  category: string;
  sectionIds: number[];
  status: Question["status"];
}): Promise<number> {
  const [row] = await sql()`
    INSERT INTO questions (session_id, text, answer, mode, category, section_ids, status)
    VALUES (${q.sessionId}, ${q.text}, ${q.answer}, ${q.mode}, ${q.category}, ${q.sectionIds}, ${q.status})
    RETURNING id`;
  return row.id;
}

// Records a parent's thumbs rating. A thumbs down sends an "ok" question to the inbox.
export async function setFeedback(id: number, feedback: "up" | "down"): Promise<void> {
  await sql()`
    UPDATE questions
    SET feedback = ${feedback},
        status = CASE WHEN ${feedback} = 'down' AND status = 'ok' THEN 'needs_review' ELSE status END
    WHERE id = ${id}`;
}

// Stores how the parent wants to be reached after a hand-off.
export async function setContact(id: number, contact: string): Promise<void> {
  await sql()`UPDATE questions SET contact = ${contact} WHERE id = ${id}`;
}

// Clears a question from the inbox without changing the knowledge base.
export async function dismissQuestion(id: number): Promise<void> {
  await sql()`UPDATE questions SET status = 'resolved' WHERE id = ${id}`;
}

// Saves the operator's answer as a new knowledge section and resolves the
// question, in one transaction. The title defaults to the parent's question.
// Returns false if the question doesn't exist.
export async function resolveQuestion(id: number, body: string, title: string | null): Promise<boolean> {
  const db = sql();
  const [inserted] = await db.transaction([
    db`INSERT INTO sections (title, body, source, from_question_id)
       SELECT left(coalesce(${title}, text), 200), ${body}, 'operator_answer', id
       FROM questions WHERE id = ${id}
       RETURNING id`,
    db`UPDATE questions SET status = 'resolved' WHERE id = ${id}`,
  ]);
  return inserted.length > 0;
}
