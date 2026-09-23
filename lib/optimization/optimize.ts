
import type {
  MatchStatus,
  MatchedItem,
  OfferOption,
  OptimizationStrategy,
  PurchaseAllocation,
  PurchaseDecision,
  PurchaseResult,
  RequestLine,
  SupplierOffer,
  Warning,
} from "../domain/types";

import {
  checkOfferConstraints,
  type ProcurementConstraints,
} from "../validation/constraints";

import {
  createOfferWarnings,
} from "../validation/warnings";

import {
  getAvailabilityStatus,
} from "../validation/availability";

import {
  rankOffers,
} from "./strategies";

type OptimizationInput = {
  requests: RequestLine[];
  offers: SupplierOffer[];
  matches: MatchedItem[];
  strategy?: OptimizationStrategy;
  constraints?: ProcurementConstraints;
};

function isUsableMatch(
  status: MatchStatus
): boolean {
  return (
    status === "exact" ||
    status === "probable"
  );
}

function isOfferAllowed(
  request: RequestLine,
  offer: SupplierOffer,
  constraints: ProcurementConstraints
): boolean {
  const availability =
    getAvailabilityStatus(
      request,
      offer
    );

  if (
    availability === "unavailable"
  ) {
    return false;
  }

  if (
    constraints.requireAvailableStock ===
    true &&
    availability !== "available"
  ) {
    return false;
  }

  return checkOfferConstraints(
    request,
    offer,
    constraints
  ).allowed;
}

function getOfferCapacity(
  request: RequestLine,
  offer: SupplierOffer
): number {
  if (
    offer.availableQuantity ===
    undefined
  ) {
    return request.quantity;
  }

  return Math.max(
    0,
    offer.availableQuantity
  );
}

function buildOfferOption(
  request: RequestLine,
  offer: SupplierOffer,
  match: MatchedItem
): OfferOption {
  const availability =
    getAvailabilityStatus(
      request,
      offer
    );

  return {
    requestLineId: request.id,
    offerId: offer.id,
    supplierId: offer.supplierId,

    unitPrice: offer.price,

    totalPrice:
      offer.price *
      request.quantity,

    availability,

    deliveryDays:
      offer.deliveryDays,

    matchStatus:
      match.status,

    matchConfidence:
      match.confidence,

    warnings:
      createOfferWarnings(
        request,
        offer
      ),
  };
}

function buildMatchesForRequest(
  request: RequestLine,
  offers: SupplierOffer[],
  matches: MatchedItem[]
): Array<{
  offer: SupplierOffer;
  match: MatchedItem;
}> {
  return matches
    .filter(
      (match) =>
        match.requestLineId ===
          request.id &&
        isUsableMatch(
          match.status
        )
    )
    .map((match) => {
      const offer =
        offers.find(
          (item) =>
            item.id ===
            match.offerId
        );

      return offer
        ? { offer, match }
        : null;
    })
    .filter(
      (
        item
      ): item is {
        offer: SupplierOffer;
        match: MatchedItem;
      } =>
        item !== null
    );
}

function calculateBestSingleSupplierCost(
  requests: RequestLine[],
  offers: SupplierOffer[],
  matches: MatchedItem[],
  constraints: ProcurementConstraints
): number | null {
  const suppliers = [
    ...new Set(
      offers.map(
        (offer) =>
          offer.supplierId
      )
    ),
  ];

  const totals: number[] = [];

  for (const supplierId of suppliers) {
    let total = 0;
    let coversAll = true;

    for (const request of requests) {
      const candidates =
        buildMatchesForRequest(
          request,
          offers.filter(
            (offer) =>
              offer.supplierId ===
              supplierId
          ),
          matches
        )
        .filter(
          ({ offer }) =>
            isOfferAllowed(
              request,
              offer,
              constraints
            )
        );

      if (
        candidates.length === 0
      ) {
        coversAll = false;
        break;
      }

      const cheapest =
        candidates.reduce(
          (best, current) =>
            current.offer.price <
            best.offer.price
              ? current
              : best
        );

      total +=
        cheapest.offer.price *
        request.quantity;
    }

    if (coversAll) {
      totals.push(total);
    }
  }

  return totals.length > 0
    ? Math.min(...totals)
    : null;
}

export function optimizePurchase(
  input: OptimizationInput
): PurchaseResult {
  const strategy =
    input.strategy ?? "balanced";

  const constraints =
    input.constraints ?? {
      allowSplitPurchase: true,
    };

  const allocations:
    PurchaseAllocation[] = [];

  const decisions:
    PurchaseDecision[] = [];

  const globalWarnings:
    Warning[] = [];

  for (const request of input.requests) {
    const requestMatches =
      buildMatchesForRequest(
        request,
        input.offers,
        input.matches
      );

    const options =
      requestMatches.map(
        ({ offer, match }) =>
          buildOfferOption(
            request,
            offer,
            match
          )
      );

    const eligible =
      requestMatches.filter(
        ({ offer }) =>
          isOfferAllowed(
            request,
            offer,
            constraints
          )
      );

    const ranked =
      rankOffers(
        eligible.map(
          ({ offer }) =>
            offer
        ),
        strategy
      );

    const selected:
      PurchaseAllocation[] = [];

    let remaining =
      request.quantity;

    if (
      constraints.allowSplitPurchase ===
        false
    ) {
      const selectedOffer =
        ranked[0];

      if (selectedOffer) {
        selected.push({
          requestLineId:
            request.id,
          offerId:
            selectedOffer.id,
          supplierId:
            selectedOffer.supplierId,
          quantity:
            request.quantity,
          unitPrice:
            selectedOffer.price,
          totalPrice:
            selectedOffer.price *
            request.quantity,
        });

        remaining = 0;
      }
    } else {
      for (const offer of ranked) {
        if (
          remaining <= 0
        ) {
          break;
        }

        const capacity =
          getOfferCapacity(
            request,
            offer
          );

        if (
          capacity <= 0
        ) {
          continue;
        }

        const quantity =
          Math.min(
            remaining,
            capacity
          );

        selected.push({
          requestLineId:
            request.id,
          offerId:
            offer.id,
          supplierId:
            offer.supplierId,
          quantity,
          unitPrice:
            offer.price,
          totalPrice:
            quantity *
            offer.price,
        });

        remaining -=
          quantity;
      }
    }

    allocations.push(
      ...selected
    );

    const lineWarnings =
      options.flatMap(
        (option) =>
          option.warnings
      );

    const uniqueWarningMap =
      new Map<
        string,
        Warning
      >();

    for (
      const warning of lineWarnings
    ) {
      const key =
        `${warning.code}:${warning.message}`;

      uniqueWarningMap.set(
        key,
        warning
      );
    }

    const uniqueWarnings = [
      ...uniqueWarningMap.values(),
    ];

    if (
      remaining > 0
    ) {
      uniqueWarnings.push({
        code:
          "quantity_not_fully_covered",
        severity:
          "critical",
        message:
          `Не удалось автоматически покрыть всю потребность: ${remaining} шт. не распределено.`,
      });
    }

    const hasAllocation =
      selected.length > 0;

    const fullyCovered =
      remaining <= 0;

    let status:
      | "recommended"
      | "requires_review"
      | "unavailable";

    if (
      fullyCovered
    ) {
      status =
        "recommended";
    } else if (
      hasAllocation ||
      eligible.length > 0
    ) {
      status =
        "requires_review";
    } else {
      status =
        "unavailable";
    }

    const suppliers = [
      ...new Set(
        selected.map(
          (allocation) =>
            allocation.supplierId
        )
      ),
    ];

    const reasons: string[] =
      [];

    if (
      suppliers.length ===
      1
    ) {
      reasons.push(
        `Позиция закупается у ${suppliers[0]}.`
      );
    } else if (
      suppliers.length > 1
    ) {
      reasons.push(
        "Позиция распределена между несколькими поставщиками."
      );
    }

    if (
      strategy ===
      "cheapest"
    ) {
      reasons.push(
        "Использована стратегия минимальной стоимости."
      );
    }

    if (
      strategy ===
      "fastest"
    ) {
      reasons.push(
        "Использована стратегия минимального срока поставки."
      );
    }

    if (
      strategy ===
      "balanced"
    ) {
      reasons.push(
        "Использована сбалансированная стратегия цены и срока."
      );
    }

    if (
      status !==
      "recommended"
    ) {
      reasons.push(
        "Позиция требует проверки закупщиком."
      );
    }

    const recommendation =
      {
        summary:
          status ===
          "recommended"
            ? "Позиция покрыта автоматически."
            : status ===
                "requires_review"
              ? "Позиция требует проверки."
              : "Для позиции не найдено подходящего предложения.",

        reasons,

        warnings:
          uniqueWarnings,
      };

    decisions.push({
      requestLine:
        request,

      options,

      allocations:
        selected,

      strategy,

      status,

      warnings:
        uniqueWarnings,

      recommendation,
    });

    globalWarnings.push(
      ...uniqueWarnings
    );
  }

  const totalCost =
    allocations.reduce(
      (
        sum,
        allocation
      ) =>
        sum +
        allocation.totalPrice,
      0
    );

  const suppliers = [
    ...new Set(
      allocations.map(
        (allocation) =>
          allocation.supplierId
      )
    ),
  ];

  const supplierTotals:
    Record<
      string,
      {
        items: number;
        total: number;
      }
    > = {};

  for (
    const allocation of allocations
  ) {
    const current =
      supplierTotals[
        allocation.supplierId
      ] ?? {
        items: 0,
        total: 0,
      };

    current.items += 1;

    current.total +=
      allocation.totalPrice;

    supplierTotals[
      allocation.supplierId
    ] = current;
  }

  const bestSingleSupplierCost =
    calculateBestSingleSupplierCost(
      input.requests,
      input.offers,
      input.matches,
      constraints
    );

  const potentialSavings =
    bestSingleSupplierCost ===
    null
      ? null
      : Math.max(
          0,
          bestSingleSupplierCost -
            totalCost
        );

  const savingsMessage =
    bestSingleSupplierCost ===
    null
      ? "Экономия не рассчитывается: ни один отдельный поставщик не покрывает всю заявку."
      : null;

  return {
    success:
      decisions.every(
        (decision) =>
          decision.status ===
          "recommended"
      ),

    requestLines:
      input.requests,

    decisions,

    allocations,

    totalCost,

    bestSingleSupplierCost,

    potentialSavings,

    savingsMessage,

    suppliers,

    supplierTotals,

    warnings:
      globalWarnings,

    strategy,
  };
}
