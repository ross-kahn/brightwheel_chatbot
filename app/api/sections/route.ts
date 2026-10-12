import { listSections, sql } from "@/lib/db";

export async function GET() {
  return Response.json(await listSections());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!title || !text) {
    return Response.json({ error: "A title and some text are required." }, { status: 400 });
  }
  const [row] = await sql()`
    INSERT INTO sections (title, body) VALUES (${title.slice(0, 200)}, ${text}) RETURNING *`;
  return Response.json(row);
}
