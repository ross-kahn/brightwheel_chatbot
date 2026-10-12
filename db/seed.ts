// Creates the tables and resets them to the demo data.
// Run with: npm run db:seed
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { QUESTIONS, SECTIONS } from "./seed-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgres")) {
    throw new Error("DATABASE_URL is missing or is not a Postgres URL. Check .env.local.");
  }
  const sql = neon(url);

  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  for (const statement of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    await sql.query(statement);
  }

  await sql`TRUNCATE questions, sections RESTART IDENTITY`;

  for (const s of SECTIONS) {
    await sql`INSERT INTO sections (id, title, body) VALUES (${s.id}, ${s.title}, ${s.body})`;
  }
  await sql`SELECT setval(pg_get_serial_sequence('sections', 'id'), (SELECT max(id) FROM sections))`;

  for (const [i, q] of QUESTIONS.entries()) {
    await sql`
      INSERT INTO questions (session_id, text, answer, mode, category, section_ids, feedback, contact, status, created_at)
      VALUES (${`seed-${i}`}, ${q.text}, ${q.answer}, ${q.mode}, ${q.category}, ${q.section_ids},
              ${q.feedback ?? null}, ${q.contact ?? null}, ${q.status},
              now() - make_interval(hours => ${q.hoursAgo}))`;
  }

  console.log(`Seeded ${SECTIONS.length} sections and ${QUESTIONS.length} questions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
