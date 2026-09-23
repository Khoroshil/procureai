export function parseQuantity(
  value: unknown,
  fallback = 1
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value > 0 ? value : fallback;
  }

  const text = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const result = Number(text);

  if (!Number.isFinite(result) || result <= 0) {
    return fallback;
  }

  return result;
}
