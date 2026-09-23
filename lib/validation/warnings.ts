
import type {
  RequestLine,
  SupplierOffer,
  Warning,
} from "../domain/types";

import {
  getAvailabilityStatus,
} from "./availability";

export function createOfferWarnings(
  request: RequestLine,
  offer: SupplierOffer
): Warning[] {
  const warnings: Warning[] = [];

  const availability =
    getAvailabilityStatus(
      request,
      offer
    );

  if (
    availability === "unavailable"
  ) {
    warnings.push({
      code: "insufficient_stock",
      severity: "critical",
      message:
        "Недостаточное количество товара у поставщика.",
    });
  }

  if (
    availability === "unknown"
  ) {
    warnings.push({
      code: "unknown_stock",
      severity: "warning",
      message:
        "Остаток у поставщика не указан.",
    });
  }

  if (
    offer.deliveryDays === undefined
  ) {
    warnings.push({
      code: "unknown_delivery",
      severity: "warning",
      message:
        "Срок поставки не указан или не распознан.",
    });
  }

  if (
    offer.unit !== request.unit
  ) {
    warnings.push({
      code: "unit_mismatch",
      severity: "warning",
      message:
        `Единица заявки «${request.unit}» отличается от единицы предложения «${offer.unit}».`,
    });
  }

  if (
    offer.taxMode === "as_quoted"
  ) {
    warnings.push({
      code: "vat_not_normalized",
      severity: "info",
      message:
        "Налоговый режим предложения пока не нормализован.",
    });
  }

  return warnings;
}
