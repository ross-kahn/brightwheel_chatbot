export const CENTER = {
  name: "Little Sprouts Early Learning Center",
  phone: "(555) 010-4477",
  timeZone: "America/Denver",
};

export const CATEGORIES = [
  "hours_and_closures",
  "tuition_and_billing",
  "health_and_illness",
  "meals",
  "enrollment_and_tours",
  "pickup_and_safety",
  "curriculum",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  hours_and_closures: "Hours & closures",
  tuition_and_billing: "Tuition & billing",
  health_and_illness: "Health & illness",
  meals: "Meals",
  enrollment_and_tours: "Enrollment & tours",
  pickup_and_safety: "Pickup & safety",
  curriculum: "Curriculum",
  other: "Other",
};

export function todayAtCenter(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CENTER.timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
}
