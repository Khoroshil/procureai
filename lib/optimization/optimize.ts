
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

  const warnings =
    createOfferWarnings(
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
    matchStatus: match.status,
    matchConfidence:
      match.confidence,
    warnings,
  };
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
        matches
          .filter(
            (match) =>
              match.requestLineId ===
                request.id &&
              isUsableMatch(
                match.status
              )
          )
          .map(
            (match) =>
              offers.find(
                (offer) =>
                  offer.id ===
                    match.offerId &&
                  offer.supplierId ===
                    supplierId
              )
          )
          .filter(
            (
              offer
            ): offer is SupplierOffer =>
              offer !== undefined
          )
          .filter((offer) => {
            const availability =
              getAvailabilityStatus(
                request,
                offer
              );

            const constraintsResult =
              checkOfferConstraints(
                request,
                offer,
                {
                  ...constraints,
                  requireAvailableStock:
                    true,
                }
              );

            return (
              availability ===
                "available" &&
              constraintsResult.allowed
            );
          });

      if (candidates.length === 0) {
        coversAll = false;
        break;
      }

      const cheapest =
        candidates.reduce(
          (best, current) =>
            current.price <
            best.price
              ? current
              : best
        );

      total +=
        cheapest.price *
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

  const allocations: PurchaseAllocation[] =
    [];

  const decisions: PurchaseDecision[] =
    [];

  const globalWarnings: Warning[] =
    [];

  for (const request of input.requests) {
    const requestMatches =
      input.matches.filter(
        (match) =>
          match.requestLineId ===
          request.id
      );

    const options =
      requestMatches
        .map((match) => {
          const offer =
            input.offers.find(
              (item) =>
                item.id ===
                match.offerId
            );

          return offer
            ? {
                offer,
                match,
              }
            : null;
        })
        .filter(
          (
            item
          ): item is {
            offer: SupplierOffer;
            match: MatchedItem;
          } => item !== null
        )
        .map(({ offer, match }) =>
          buildOfferOption(
            request,
            offer,
            match
          )
        );

    const warnings =
      options.flatMap(
        (option) =>
          option.warnings
      );

    const eligible =
      requestMatches
        .filter((match) =>
          isUsableMatch(
            match.status
          )
        )
        .map((match) => {
          const offer =
            input.offers.find(
              (item) =>
                item.id ===
                match.offerId
            );

          return offer
            ? {
                offer,
                match,
              }
            : null;
        })
        .filter(
          (
            item
          ): item is {
            offer: SupplierOffer;
            match: MatchedItem;
          } => item !== null
        )
        .filter(({ offer }) => {
          const availability =
            getAvailabilityStatus(
              request,
              offer
            );

          const constraintResult =
            checkOfferConstraints(
              request,
              offer,
              constraints
            );

          return (
            availability ===
              "available" &&
            constraintResult.allowed
          );
        });

    const ranked =
      rankOffers(
        eligible.map(
          ({ offer }) => offer
        ),
        strategy
      );

    let remaining =
      request.quantity;

    const selected:
      PurchaseAllocation[] = [];

    if (
      constraints.allowSplitPurchase ===
        false &&
      ranked.length > 0
    ) {
      const selectedOffer =
        ranked.find((offer) => {
          const availability =
            getAvailabilityStatus(
              request,
              offer
            );

          return (
            availability ===
              "available"
          );
        });

      if (selectedOffer) {
        const allocation = {
          requestLineId: request.id,
          offerId: selectedOffer.id,
          supplierId:
            selectedOffer.supplierId,
          quantity:
            request.quantity,
          unitPrice:
            selectedOffer.price,
          totalPrice:
            request.quantity *
            selectedOffer.price,
        };

        selected.push(allocation);
      }
    } else {
      for (const offer of ranked) {
        if (remaining <= 0) {
          break;
        }

        const available =
          offer.availableQuantity ??
          0;

        const quantity =
          Math.min(
            remaining,
            available
          );

        if (quantity <= 0) {
          continue;
        }

        const allocation = {
          requestLineId: request.id,
          offerId: offer.id,
          supplierId:
            offer.supplierId,
          quantity,
          unitPrice:
            offer.price,
          totalPrice:
            quantity *
            offer.price,
        };

        selected.push(allocation);

        remaining -= quantity;
      }
    }

    allocations.push(
      ...selected
    );

    const lineAllocatedQuantity =
      selected.reduce(
        (sum, item) =>
          sum + item.quantity,
        0
      );

    const status =
      lineAllocatedQuantity >=
      request.quantity
        ? "recommended"
        : requestMatches.length ===
          0
          ? "unavailable"
          : "requires_review";

    const lineWarnings =
      [...warnings];

    if (
      lineAllocatedQuantity <
      request.quantity
    ) {
      lineWarnings.push({
        code:
          "quantity_not_fully_covered",
        severity: "critical",
        message:
          `Не удалось автоматически покрыть всю потребность: ${request.quantity - lineAllocatedQuantity} шт. не распределено.`,
      });
    }

    const selectedSuppliers = [
      ...new Set(
        selected.map(
          (item) =>
            item.supplierId
        )
      ),
    ];

    const reasons =
      selectedSuppliers.length > 1
        ? [
            "Потребность распределена между несколькими поставщиками.",
          ]
        : selectedSuppliers.length ===
            1
          ? [
              `Выбран поставщик ${selectedSuppliers[0]}.`,
            ]
          : [
              "Автоматическая рекомендация не сформирована.",
            ];

    decisions.push({
      requestLine: request,
      options,
      allocations: selected,
      strategy,
      status,
      warnings: lineWarnings,
      recommendation: {
        summary:
          status === "recommended"
            ? "Позиция покрыта автоматически."
            : "Позиция требует проверки.",
        reasons,
        warnings:
          lineWarnings,
      },
    });

    globalWarnings.push(
      ...lineWarnings
    );
  }

  const totalCost =
    allocations.reduce(
      (sum, allocation) =>
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

  const supplierTotals: Record<
    string,
    {
      items: number;
      total: number;
    }
  > = {};

  for (const allocation of allocations) {
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
    success: decisions.every(
      (decision) =>
        decision.status ===
        "recommended"
    ),
    requestLines: input.requests,
    decisions,
    allocations,
    totalCost,
    bestSingleSupplierCost,
    potentialSavings,
    savingsMessage,
    suppliers,
    supplierTotals,
    warnings: globalWarnings,
    strategy,
  };
}
