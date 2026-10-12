import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_LABELS, todayAtCenter } from "@/lib/center";

describe("todayAtCenter", () => {
  it("formats the weekday, date and time in the center's time zone", () => {
    // 20:05 UTC is 2:05 pm in Denver during daylight time.
    const text = todayAtCenter(new Date("2026-10-12T20:05:00Z"));
    expect(text).toContain("Monday, October 12, 2026");
    expect(text).toContain("2:05 PM");
  });

  it("uses the center's calendar day, not the UTC one", () => {
    // Early on Veterans Day in UTC is still the evening of the 10th in Denver.
    const text = todayAtCenter(new Date("2026-11-11T03:30:00Z"));
    expect(text).toContain("Tuesday, November 10, 2026");
    expect(text).toContain("8:30 PM");
  });
});

describe("CATEGORY_LABELS", () => {
  it("has a non-empty label for every category", () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
    for (const category of CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeTruthy();
    }
  });
});
