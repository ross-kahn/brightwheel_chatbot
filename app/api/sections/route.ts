// PROTOTYPE: the section routes have no login. Production would require a
// staff session and keep an edit history.
import { createSection, listSections } from "@/lib/db";
import { errorResponse, parseSectionInput, readJson } from "@/lib/http";

// Returns the whole knowledge base for the Knowledge tab.
export async function GET() {
  return Response.json(await listSections());
}

// Adds a new knowledge section.
export async function POST(request: Request) {
  const input = parseSectionInput(await readJson(request));
  if (!input) return errorResponse("A title and some text are required.");
  return Response.json(await createSection(input));
}
