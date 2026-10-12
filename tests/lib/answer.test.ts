import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerQuestion } from "@/lib/answer";
import type { Section } from "@/lib/db";

// Replace the Anthropic SDK with a client whose only method is our mock.
const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse };
  },
}));

const SECTIONS: Section[] = [
  { id: 2, title: "Closure calendar", body: "Closed on Veterans Day.", source: "handbook", from_question_id: null, updated_at: "" },
  { id: 9, title: "Meals", body: "Lunch is provided.", source: "handbook", from_question_id: null, updated_at: "" },
];

// Makes the mocked model return the given structured output.
function modelReturns(parsed: object | null, stop_reason = "end_turn") {
  parse.mockResolvedValue({
    parsed_output: parsed,
    stop_reason,
    usage: { cache_read_input_tokens: 0, cache_creation_input_tokens: 0, input_tokens: 0, output_tokens: 0 },
  });
}

// The request body passed to the model on the most recent call.
const lastRequest = () => parse.mock.calls.at(-1)![0];

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("answerQuestion: checking the model's reply", () => {
  it("returns a grounded answer unchanged", async () => {
    modelReturns({ answer: "We're closed.", mode: "answered", category: "hours_and_closures", section_ids: [2] });

    expect(await answerQuestion("Open on Veterans Day?", [], SECTIONS)).toEqual({
      answer: { answer: "We're closed.", mode: "answered", category: "hours_and_closures", section_ids: [2] },
      failed: false,
    });
  });

  it("drops citations to sections that don't exist and removes duplicates", async () => {
    modelReturns({ answer: "Yes.", mode: "answered", category: "meals", section_ids: [9, 404, 9, 2] });

    const { answer } = await answerQuestion("Lunch?", [], SECTIONS);

    expect(answer.section_ids).toEqual([9, 2]);
  });

  it("downgrades an answer to unknown when none of its citations are real", async () => {
    modelReturns({ answer: "Park out back.", mode: "answered", category: "other", section_ids: [404] });

    const { answer, failed } = await answerQuestion("Parking?", [], SECTIONS);

    expect(answer.mode).toBe("unknown");
    expect(answer.answer).toBe("Park out back.");
    expect(failed).toBe(false);
  });

  it("keeps a sensitive reply sensitive even with no citations", async () => {
    modelReturns({ answer: "Call 911.", mode: "sensitive", category: "health_and_illness", section_ids: [] });

    const { answer } = await answerQuestion("He won't wake up", [], SECTIONS);

    expect(answer.mode).toBe("sensitive");
  });
});

describe("answerQuestion: failures become a hand-off", () => {
  // Every failure should give the parent the same safe reply and flag it for staff.
  async function expectHandoff() {
    const { answer, failed } = await answerQuestion("Anything", [], SECTIONS);
    expect(failed).toBe(true);
    expect(answer.mode).toBe("unknown");
    expect(answer.section_ids).toEqual([]);
    expect(answer.answer).toContain("front desk");
  }

  it("when the model refuses", async () => {
    modelReturns({ answer: "x", mode: "answered", category: "other", section_ids: [2] }, "refusal");
    await expectHandoff();
  });

  it("when the reply can't be parsed", async () => {
    modelReturns(null);
    await expectHandoff();
  });

  it("when the API call throws", async () => {
    parse.mockRejectedValue(new Error("overloaded"));
    await expectHandoff();
  });
});

describe("answerQuestion: the request it sends", () => {
  beforeEach(() => {
    modelReturns({ answer: "ok", mode: "answered", category: "other", section_ids: [2] });
  });

  it("puts every section in a cached system prompt", async () => {
    await answerQuestion("Lunch?", [], SECTIONS);

    const [system] = lastRequest().system;
    expect(system.cache_control).toEqual({ type: "ephemeral" });
    for (const s of SECTIONS) {
      expect(system.text).toContain(`id="${s.id}"`);
      expect(system.text).toContain(s.title);
      expect(system.text).toContain(s.body);
    }
  });

  it("keeps the date out of the system prompt so the cache survives the clock", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T15:00:00Z"));
    await answerQuestion("Lunch?", [], SECTIONS);
    const monday = lastRequest();

    vi.setSystemTime(new Date("2026-10-13T15:00:00Z"));
    await answerQuestion("Lunch?", [], SECTIONS);
    const tuesday = lastRequest();

    expect(tuesday.system[0].text).toBe(monday.system[0].text);
    expect(monday.messages.at(-1).content).toContain("Monday, October 12, 2026");
    expect(tuesday.messages.at(-1).content).toContain("Tuesday, October 13, 2026");
  });

  it("sends earlier turns first and the new question last", async () => {
    const history = [
      { role: "user" as const, content: "Infant tuition?" },
      { role: "assistant" as const, content: "$1,850 a month." },
    ];

    await answerQuestion("And toddlers?", history, SECTIONS);

    const { messages } = lastRequest();
    expect(messages.slice(0, 2)).toEqual(history);
    expect(messages).toHaveLength(3);
    expect(messages[2].role).toBe("user");
    expect(messages[2].content).toMatch(/And toddlers\?$/);
  });

  it("uses the CLAUDE_MODEL override, and Opus 5.5 without one", async () => {
    vi.stubEnv("CLAUDE_MODEL", "");
    await answerQuestion("Lunch?", [], SECTIONS);
    expect(lastRequest().model).toBe("claude-opus-5-5");

    vi.stubEnv("CLAUDE_MODEL", "claude-haiku-5-5");
    await answerQuestion("Lunch?", [], SECTIONS);
    expect(lastRequest().model).toBe("claude-haiku-5-5");
  });
});
