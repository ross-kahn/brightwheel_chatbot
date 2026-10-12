import { afterEach, describe, expect, it, vi } from "vitest";
import { errorResponse, parseId, parseSectionInput, readJson, sendJson } from "@/lib/http";

// Builds a POST request with a raw (possibly invalid) body.
function post(body: string) {
  return new Request("http://test.local", { method: "POST", body });
}

describe("parseId", () => {
  it("accepts a positive whole number", () => {
    expect(parseId("42")).toBe(42);
  });

  it.each(["0", "-3", "1.5", "abc", "12abc", ""])("rejects %j", (raw) => {
    expect(parseId(raw)).toBeNull();
  });
});

describe("parseSectionInput", () => {
  it("trims the title and text", () => {
    expect(parseSectionInput({ title: "  Parking  ", body: "\nUse the front lot.\n" })).toEqual({
      title: "Parking",
      body: "Use the front lot.",
    });
  });

  it("caps the title at 200 characters but leaves the text alone", () => {
    const input = parseSectionInput({ title: "t".repeat(250), body: "b".repeat(5000) });
    expect(input?.title).toHaveLength(200);
    expect(input?.body).toHaveLength(5000);
  });

  it.each([
    ["a missing body", null],
    ["a missing title", { body: "text" }],
    ["text that is only whitespace", { title: "Parking", body: "   \n " }],
    ["non-string fields", { title: 7, body: ["text"] }],
  ])("rejects %s", (_label, body) => {
    expect(parseSectionInput(body as Record<string, unknown> | null)).toBeNull();
  });
});

describe("readJson", () => {
  it("returns a parsed object", async () => {
    expect(await readJson(post('{"question":"Are you open?"}'))).toEqual({ question: "Are you open?" });
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["an empty body", ""],
    ["a JSON string", '"hello"'],
    ["JSON null", "null"],
    ["a JSON array", '[{"question":"hi"}]'],
  ])("returns null for %s", async (_label, body) => {
    expect(await readJson(post(body))).toBeNull();
  });
});

describe("errorResponse", () => {
  it("defaults to 400 with the message under `error`", async () => {
    const res = errorResponse("Bad request");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Bad request" });
  });

  it("uses the given status", () => {
    expect(errorResponse("Not found", 404).status).toBe(404);
  });
});

describe("sendJson", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the body as JSON with a JSON content type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    await sendJson("/api/questions/5", "PATCH", { feedback: "up" });

    expect(fetchMock).toHaveBeenCalledWith("/api/questions/5", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: '{"feedback":"up"}',
    });
  });

  it("sends no body when none is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    await sendJson("/api/sections/3", "DELETE");

    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });
});
