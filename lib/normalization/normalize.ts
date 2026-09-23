import type {
  RequestLine,
  SupplierOffer,
} from "../domain/types";

import type {
  ImportedOfferRow,
  ImportedRequestRow,
} from "../import";

import { parseDeliveryDays } from "./delivery";
import { parseMoney } from "./money";
import { parseQuantity } from "./quantity";

export function normalizeText(
  value: unknown
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeArticle(
  value: unknown
): string {
  return normalizeText(value)
    .replace(/\s/g, "");
}

export function normalizeUnit(
  value: unknown
): string {
  const unit = normalizeText(value);

  if (!unit) {
    return "шт";
  }

  if (
    unit === "штук" ||
    unit === "штука" ||
    unit === "шт"
  ) {
    return "шт";
  }

  return unit;
}

export function parseAvailabilityValue(
  value: unknown
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return undefined;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return undefined;
    }

    return Math.max(0, value);
  }

  const text = String(value)
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е");

  const unavailable = new Set([
    "нет",
    "не",
    "нет в наличии",
    "не в наличии",
    "отсутствует",
    "отсутствует на складе",
    "недоступно",
    "нет остатка",
    "нет остатков",
    "no",
    "out of stock",
  ]);

  if (unavailable.has(text)) {
    return 0;
  }

  const available = new Set([
    "да",
    "есть",
    "в наличии",
    "наличие",
    "доступно",
    "много",
    "yes",
    "in stock",
  ]);

  if (available.has(text)) {
    return Number.MAX_SAFE_INTEGER;
  }

  const numeric = text
    .replace(/\s/g, "")
    .replace(",", ".")
    .match(/-?\d+(?:\.\d+)?/);

  if (numeric) {
    const result = Number(numeric[0]);

    return Number.isFinite(result)
      ? Math.max(0, result)
      : undefined;
  }

  return undefined;
}

export function normalizeRequestRows(
  rows: ImportedRequestRow[]
): RequestLine[] {
  return rows
    .map((row, index) => {
      const articleRaw =
        String(row.articleRaw ?? "").trim();

      const nameRaw =
        String(row.nameRaw ?? "").trim();

      const quantity =
        parseQuantity(row.quantityRaw, 1);

      const articleNormalized =
        normalizeArticle(articleRaw);

      const nameNormalized =
        normalizeText(nameRaw);

      return {
        id: `request-${index + 1}`,
        articleRaw,
        articleNormalized,
        nameRaw,
        nameNormalized,
        quantity,
        unit: normalizeUnit(row.unitRaw),
        specifications: {},
      };
    })
    .filter(
      (item) =>
        item.articleNormalized !== "" ||
        item.nameNormalized !== ""
    );
}

export function normalizeOfferRows(
  rows: ImportedOfferRow[]
): SupplierOffer[] {
  return rows
    .map((row, index): SupplierOffer | null => {
      const articleRaw =
        String(row.articleRaw ?? "").trim();

      const nameRaw =
        String(row.nameRaw ?? "").trim();

      const price =
        parseMoney(row.priceRaw);

      if (
        price === null ||
        price <= 0
      ) {
        return null;
      }

      const articleNormalized =
        normalizeArticle(articleRaw);

      const nameNormalized =
        normalizeText(nameRaw);

      const availableQuantity =
        parseAvailabilityValue(
          row.stockRaw
        );

      const deliveryText =
        String(row.deliveryRaw ?? "")
          .trim();

      const supplierId =
        normalizeText(row.supplier)
          .replace(/\s+/g, "-");

      return {
        id: `${supplierId}-offer-${index + 1}`,
        supplierId,
        articleRaw,
        articleNormalized,
        nameRaw,
        nameNormalized,
        priceRaw:
          String(row.priceRaw ?? ""),
        price,
        currency: "RUB",
        taxMode: "as_quoted",
        unitRaw:
          String(row.unitRaw ?? ""),
        unit: normalizeUnit(row.unitRaw),
        availableQuantity,
        deliveryDays:
          parseDeliveryDays(deliveryText),
        deliveryText,
        specifications: {},
      };
    })
    .filter(
      (item): item is SupplierOffer =>
        item !== null &&
        (
          item.articleNormalized !== "" ||
          item.nameNormalized !== ""
        )
    );
}
