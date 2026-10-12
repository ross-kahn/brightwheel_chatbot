import { describe, expect, it, vi } from "vitest";
import { DELETE, PUT } from "@/app/api/sections/[id]/route";
import { GET, POST } from "@/app/api/sections/route";
import { createSection, deleteSection, listSections, updateSection } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  createSection: vi.fn(),
  deleteSection: vi.fn(),
  listSections: vi.fn(),
  updateSection: vi.fn(),
}));

const SAVED = { id: 3, title: "Parking", body: "Use the front lot." };

// Builds a request and the route context for one section id.
function call(method: string, id: string, body?: unknown) {
  const request = new Request(`http://test.local/api/sections/${id}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return [request, { params: Promise.resolve({ id }) }] as const;
}

describe("GET /api/sections", () => {
  it("returns every section", async () => {
    vi.mocked(listSections).mockResolvedValue([SAVED] as never);

    expect(await (await GET()).json()).toEqual([SAVED]);
  });
});

describe("POST /api/sections", () => {
  it("creates a section from trimmed input and returns it", async () => {
    vi.mocked(createSection).mockResolvedValue(SAVED as never);

    const res = await POST(call("POST", "", { title: " Parking ", body: " Use the front lot. " })[0]);

    expect(await res.json()).toEqual(SAVED);
    expect(createSection).toHaveBeenCalledWith({ title: "Parking", body: "Use the front lot." });
  });

  it("rejects a section with no text", async () => {
    const res = await POST(call("POST", "", { title: "Parking" })[0]);

    expect(res.status).toBe(400);
    expect(createSection).not.toHaveBeenCalled();
  });
});

describe("PUT /api/sections/[id]", () => {
  it("updates the section and returns it", async () => {
    vi.mocked(updateSection).mockResolvedValue(SAVED as never);

    const res = await PUT(...call("PUT", "3", { title: "Parking", body: "Use the front lot." }));

    expect(await res.json()).toEqual(SAVED);
    expect(updateSection).toHaveBeenCalledWith(3, { title: "Parking", body: "Use the front lot." });
  });

  it("returns 404 when the section doesn't exist", async () => {
    vi.mocked(updateSection).mockResolvedValue(null);

    const res = await PUT(...call("PUT", "999", { title: "Parking", body: "Use the front lot." }));

    expect(res.status).toBe(404);
  });

  it.each([
    ["a bad id", "abc", { title: "Parking", body: "Use the front lot." }],
    ["a blank title", "3", { title: " ", body: "Use the front lot." }],
  ])("rejects %s without touching the database", async (_label, id, body) => {
    const res = await PUT(...call("PUT", id, body));

    expect(res.status).toBe(400);
    expect(updateSection).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/sections/[id]", () => {
  it("deletes the section", async () => {
    const res = await DELETE(...call("DELETE", "3"));

    expect(await res.json()).toEqual({ ok: true });
    expect(deleteSection).toHaveBeenCalledWith(3);
  });

  it("rejects a bad id without deleting anything", async () => {
    const res = await DELETE(...call("DELETE", "abc"));

    expect(res.status).toBe(400);
    expect(deleteSection).not.toHaveBeenCalled();
  });
});
