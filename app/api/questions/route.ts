import { listQuestions } from "@/lib/db";

// Returns the question log for the operator view.
// PROTOTYPE: no login, so this exposes every question and any contact details
// to anyone with the URL. Production would require a staff session.
export async function GET() {
  return Response.json(await listQuestions());
}
