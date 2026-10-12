import { deleteSection, updateSection } from "@/lib/db";
import { errorResponse, parseId, parseSectionInput, readJson } from "@/lib/http";

// Replaces a section's title and text.
export async function PUT(request: Request, ctx: RouteContext<"/api/sections/[id]">) {
  const id = parseId((await ctx.params).id);
  const input = parseSectionInput(await readJson(request));
  if (!id || !input) return errorResponse("A title and some text are required.");
  const section = await updateSection(id, input);
  return section ? Response.json(section) : errorResponse("Not found", 404);
}

// Deletes a section so the assistant stops using it.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/sections/[id]">) {
  const id = parseId((await ctx.params).id);
  if (!id) return errorResponse("Bad request");
  await deleteSection(id);
  return Response.json({ ok: true });
}
