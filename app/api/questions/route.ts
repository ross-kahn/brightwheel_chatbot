import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql()`SELECT * FROM questions ORDER BY created_at DESC LIMIT 500`;
  return Response.json(rows);
}
