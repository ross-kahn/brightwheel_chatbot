import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the Neon driver. `query` stands in for the tagged-template function
// it returns, and `transaction` for its batch method.
const { neon, query, transaction } = vi.hoisted(() => ({
  neon: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@neondatabase/serverless", () => ({ neon }));

// Loads a fresh copy of the module so its cached client doesn't leak between tests.
async function loadDb() {
  vi.resetModules();
  return import("@/lib/db");
}

// The SQL text of the nth query, with the interpolated values removed.
const sqlText = (call = 0) => (query.mock.calls[call][0] as string[]).join("?");

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://test");
  neon.mockReturnValue(Object.assign(query, { transaction }));
  query.mockResolvedValue([]);
});

describe("database client", () => {
  it("fails with a clear message when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const db = await loadDb();

    await expect(db.listSections()).rejects.toThrow("DATABASE_URL is not set");
    expect(neon).not.toHaveBeenCalled();
  });

  it("connects once and reuses the client", async () => {
    const db = await loadDb();

    await db.listSections();
    await db.listQuestions();

    expect(neon).toHaveBeenCalledTimes(1);
    expect(neon).toHaveBeenCalledWith("postgres://test");
  });
});

describe("sections", () => {
  it("lists sections in id order, which the prompt cache relies on", async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    query.mockResolvedValue(rows);
    const db = await loadDb();

    expect(await db.listSections()).toBe(rows);
    expect(sqlText()).toMatch(/ORDER BY id\s*$/);
  });

  it("returns the updated section", async () => {
    query.mockResolvedValue([{ id: 3, title: "Meals" }]);
    const db = await loadDb();

    expect(await db.updateSection(3, { title: "Meals", body: "Lunch at 11:30." })).toEqual({ id: 3, title: "Meals" });
    expect(query.mock.calls[0].slice(1)).toEqual(["Meals", "Lunch at 11:30.", 3]);
  });

  it("returns null when the section to update doesn't exist", async () => {
    const db = await loadDb();

    expect(await db.updateSection(999, { title: "x", body: "y" })).toBeNull();
  });
});

describe("questions", () => {
  it("returns the new row id when logging a question", async () => {
    query.mockResolvedValue([{ id: 41 }]);
    const db = await loadDb();

    const id = await db.logQuestion({
      sessionId: "s1",
      text: "Parking?",
      answer: "I don't know.",
      mode: "unknown",
      category: "other",
      sectionIds: [],
      status: "needs_review",
    });

    expect(id).toBe(41);
    expect(query.mock.calls[0].slice(1)).toEqual(["s1", "Parking?", "I don't know.", "unknown", "other", [], "needs_review"]);
  });

  it("only moves an 'ok' question to the inbox on a thumbs down", async () => {
    const db = await loadDb();

    await db.setFeedback(7, "down");

    expect(sqlText()).toContain("status = 'ok' THEN 'needs_review' ELSE status");
  });

  it("saves the answer and resolves the question in one transaction", async () => {
    transaction.mockResolvedValue([[{ id: 16 }], []]);
    const db = await loadDb();

    expect(await db.resolveQuestion(7, "Park out front.", null)).toBe(true);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0][0]).toHaveLength(2);
    expect(sqlText(0)).toContain("INSERT INTO sections");
    expect(sqlText(1)).toContain("UPDATE questions SET status = 'resolved'");
  });

  it("reports false when the question to resolve doesn't exist", async () => {
    transaction.mockResolvedValue([[], []]);
    const db = await loadDb();

    expect(await db.resolveQuestion(999, "Park out front.", "Parking")).toBe(false);
  });
});
