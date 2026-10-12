import { sql } from "@/lib/db";

export async function PUT(request: Request, ctx: RouteContext<"/api/sections/[id]">) {
  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!Number.isInteger(id) || !title || !text) {
    return Response.json({ error: "A title and some text are required." }, { status: 400 });
  }
  const [row] = await sql()`
    UPDATE sections SET title = ${title.slice(0, 200)}, body = ${text}, updated_at = now()
    WHERE id = ${id} RETURNING *`;
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/sections/[id]">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "Bad request" }, { status: 400 });
  await sql()`DELETE FROM sections WHERE id = ${id}`;
  return Response.json({ ok: true });
}
