import { describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/questions/[id]/route";
import { GET } from "@/app/api/questions/route";
import { dismissQuestion, listQuestions, resolveQuestion, setContact, setFeedback } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  dismissQuestion: vi.fn(),
  listQuestions: vi.fn(),
  resolveQuestion: vi.fn(),
  setContact: vi.fn(),
  setFeedback: vi.fn(),
}));

const writes = [dismissQuestion, resolveQuestion, setContact, setFeedback];

// Calls the PATCH route for one question id with a JSON body.
function patch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://test.local/api/questions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) },
  );
}

describe("GET /api/questions", () => {
  it("returns the question log", async () => {
    const rows = [{ id: 1, text: "Parking?" }];
    vi.mocked(listQuestions).mockResolvedValue(rows as never);

    expect(await (await GET()).json()).toEqual(rows);
  });
});

describe("PATCH /api/questions/[id]: parent actions", () => {
  it.each(["up", "down"] as const)("records a thumbs %s", async (feedback) => {
    const res = await patch("5", { feedback });

    expect(await res.json()).toEqual({ ok: true });
    expect(setFeedback).toHaveBeenCalledWith(5, feedback);
  });

  it("trims contact details and caps them at 200 characters", async () => {
    await patch("5", { contact: `  ${"a".repeat(300)}  ` });

    expect(setContact).toHaveBeenCalledWith(5, "a".repeat(200));
  });
});

describe("PATCH /api/questions/[id]: operator actions", () => {
  it("dismisses a question", async () => {
    await patch("5", { dismiss: true });

    expect(dismissQuestion).toHaveBeenCalledWith(5);
  });

  it("saves a trimmed answer, with no title when none is given", async () => {
    vi.mocked(resolveQuestion).mockResolvedValue(true);

    const res = await patch("5", { resolve: { body: "  Park out front.  ", title: "   " } });

    expect(res.status).toBe(200);
    expect(resolveQuestion).toHaveBeenCalledWith(5, "Park out front.", null);
  });

  it("passes on a title when the operator gives one", async () => {
    vi.mocked(resolveQuestion).mockResolvedValue(true);

    await patch("5", { resolve: { body: "Park out front.", title: " Parking " } });

    expect(resolveQuestion).toHaveBeenCalledWith(5, "Park out front.", "Parking");
  });

  it("returns 404 when the question to resolve doesn't exist", async () => {
    vi.mocked(resolveQuestion).mockResolvedValue(false);

    const res = await patch("999", { resolve: { body: "Park out front." } });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/questions/[id]: rejected requests", () => {
  it.each([
    ["an id that isn't a number", "abc", { dismiss: true }],
    ["a zero id", "0", { dismiss: true }],
    ["an empty body", "5", {}],
    ["an unknown feedback value", "5", { feedback: "sideways" }],
    ["blank contact details", "5", { contact: "   " }],
    ["dismiss that isn't literally true", "5", { dismiss: "true" }],
    ["an answer with no text", "5", { resolve: { body: "  " } }],
  ])("rejects %s and changes nothing", async (_label, id, body) => {
    const res = await patch(id, body);

    expect(res.status).toBe(400);
    for (const write of writes) expect(write).not.toHaveBeenCalled();
  });

  it("applies only one action when a body carries several", async () => {
    await patch("5", { feedback: "up", resolve: { body: "Injected knowledge." } });

    expect(setFeedback).toHaveBeenCalledWith(5, "up");
    expect(resolveQuestion).not.toHaveBeenCalled();
  });
});
