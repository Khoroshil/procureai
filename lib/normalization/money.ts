export function parseMoney(
  value: unknown
): number | null {
  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : null;
  }

  const text = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!text) {
    return null;
  }

  const result = Number(text);

  return Number.isFinite(result)
    ? result
    : null;
}
