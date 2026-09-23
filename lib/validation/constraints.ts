
import type {
  RequestLine,
  SupplierOffer,
} from "../domain/types";

import {
  getAvailabilityStatus,
} from "./availability";

export type ProcurementConstraints = {
  maxDeliveryDays?: number;
  requireAvailableStock?: boolean;
  requireVatIncluded?: boolean;
  allowSplitPurchase?: boolean;
  maxSuppliers?: number;
};

export type ConstraintCheckResult = {
  allowed: boolean;
  reasons: string[];
};

export function checkOfferConstraints(
  request: RequestLine,
  offer: SupplierOffer,
  constraints: ProcurementConstraints = {}
): ConstraintCheckResult {
  const reasons: string[] = [];

  if (
    constraints.requireAvailableStock &&
    getAvailabilityStatus(
      request,
      offer
    ) !== "available"
  ) {
    reasons.push(
      "Поставщик не подтверждает необходимый остаток."
    );
  }

  if (
    constraints.maxDeliveryDays !== undefined &&
    (
      offer.deliveryDays === undefined ||
      offer.deliveryDays >
        constraints.maxDeliveryDays
    )
  ) {
    reasons.push(
      "Срок поставки превышает установленный лимит или неизвестен."
    );
  }

  if (
    constraints.requireVatIncluded &&
    offer.vatIncluded !== true
  ) {
    reasons.push(
      "Цена с включённым НДС не подтверждена."
    );
  }

  return {
    allowed:
      reasons.length === 0,
    reasons,
  };
}
