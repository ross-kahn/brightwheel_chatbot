// Small helpers shared by the route handlers and the two client pages.
import type { SectionInput } from "./db";

// Browser side: sends a JSON request to one of our API routes.
export function sendJson(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: object) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Server side: reads a JSON body, returning null instead of throwing on bad input.
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" ? body : null;
}

// Server side: a JSON error response with a message the UI can show.
export function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

// Server side: parses a numeric route id, or null if it isn't a whole number.
export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Server side: validates a section title and text from a request body.
export function parseSectionInput(body: Record<string, unknown> | null): SectionInput | null {
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  return title && text ? { title, body: text } : null;
}
