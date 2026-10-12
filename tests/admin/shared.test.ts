import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Badge, categoryLabel, timeAgo } from "@/app/admin/shared";

describe("timeAgo", () => {
  const NOW = new Date("2026-10-12T18:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  // Returns an ISO timestamp the given number of minutes before NOW.
  const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

  it.each([
    [0.3, "just now"],
    [5, "5m ago"],
    [59, "59m ago"],
    [60, "1h ago"],
    [150, "3h ago"],
    [24 * 60, "1d ago"],
    [36 * 60, "2d ago"],
  ])("shows %d minutes as %j", (minutes, expected) => {
    expect(timeAgo(minutesAgo(minutes))).toBe(expected);
  });
});

describe("categoryLabel", () => {
  it("returns the display label for a known category", () => {
    expect(categoryLabel("health_and_illness")).toBe("Health & illness");
  });

  it("falls back to the stored value for a category it doesn't know", () => {
    expect(categoryLabel("field_trips")).toBe("field_trips");
  });
});

describe("Badge", () => {
  it.each([
    ["answered", "Answered", "emerald"],
    ["unknown", "Couldn't answer", "amber"],
    ["sensitive", "Sensitive", "rose"],
  ] as const)("labels and colours the %s mode", (mode, label, colour) => {
    const element = Badge({ mode });
    expect(element.props.children).toBe(label);
    expect(element.props.className).toContain(colour);
  });
});
