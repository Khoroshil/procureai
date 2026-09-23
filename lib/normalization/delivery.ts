export function parseDeliveryDays(
  value: unknown
): number | undefined {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!text) {
    return undefined;
  }

  if (
    text.includes("сегодня") ||
    text.includes("в наличии") ||
    text === "есть"
  ) {
    return 0;
  }

  if (text.includes("завтра")) {
    return 1;
  }

  const range = text.match(
    /(\d+)\s*[-–—]\s*(\d+)/
  );

  if (range) {
    return Number(range[2]);
  }

  const single = text.match(/\d+/);

  return single
    ? Number(single[0])
    : undefined;
}
