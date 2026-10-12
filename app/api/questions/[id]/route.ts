import { dismissQuestion, resolveQuestion, setContact, setFeedback } from "@/lib/db";
import { errorResponse, parseId, readJson } from "@/lib/http";

// Applies one change to a logged question, chosen by the body:
//   { feedback: "up" | "down" }   parent rates the answer
//   { contact: string }           parent leaves a way to reach them
//   { resolve: { body, title? } } operator's answer becomes knowledge
//   { dismiss: true }             operator marks it as needing no change
// PROTOTYPE: parent and operator actions share one unauthenticated route, so
// anyone could add knowledge by calling "resolve". Production would split
// these into a parent route (tied to their own question) and a staff route.
export async function PATCH(request: Request, ctx: RouteContext<"/api/questions/[id]">) {
  const id = parseId((await ctx.params).id);
  const body = await readJson(request);
  if (!id || !body) return errorResponse("Bad request");

  const resolve = body.resolve as { body?: unknown; title?: unknown } | undefined;

  if (body.feedback === "up" || body.feedback === "down") {
    await setFeedback(id, body.feedback);
  } else if (typeof body.contact === "string" && body.contact.trim()) {
    await setContact(id, body.contact.trim().slice(0, 200));
  } else if (body.dismiss === true) {
    await dismissQuestion(id);
  } else if (typeof resolve?.body === "string" && resolve.body.trim()) {
    const title = typeof resolve.title === "string" && resolve.title.trim() ? resolve.title.trim() : null;
    const found = await resolveQuestion(id, resolve.body.trim(), title);
    if (!found) return errorResponse("Not found", 404);
  } else {
    return errorResponse("Nothing to update");
  }

  return Response.json({ ok: true });
}
