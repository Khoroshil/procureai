
import type {
  PurchaseResult,
} from "../domain/types";

import {
  normalizeText,
} from "../normalization/normalize";

export type LegacyAnalysisResponse = {
  success: true;

  requestFile: string;

  uploadedSuppliers: string[];

  positionCount: number;
  matchedCount: number;
  unmatchedCount: number;
  supplierCount: number;

  totalCost: number;

  bestSingleSupplierCost:
    number | null;

  potentialSavings:
    number | null;

  savingsMessage:
    string | null;

  optimalBreakdown:
    Record<
      string,
      {
        items: number;
        total: number;
      }
    >;

  results: Array<{
    article: string;
    name: string;
    quantity: number;
    supplier: string | null;
    price: number | null;
    total: number | null;
    delivery: string | null;
    alternatives: Array<{
      supplier: string;
      price: number;
      stock: number | null;
      delivery: string;
      score: number;
    }>;
  }>;
};

function supplierId(
  supplierName: string
): string {
  return normalizeText(
    supplierName
  ).replace(/\s+/g, "-");
}

function displaySupplier(
  id: string,
  supplierMap: Map<string, string>
): string {
  return (
    supplierMap.get(id) ??
    id
  );
}

function formatDelivery(
  days?: number
): string {
  if (days === undefined) {
    return "";
  }

  if (days === 0) {
    return "В наличии";
  }

  return `${days} дн.`;
}

export function toLegacyAnalysisResponse(
  result: PurchaseResult,
  requestFileName: string,
  supplierNames: string[]
): LegacyAnalysisResponse {
  const supplierMap =
    new Map<string, string>();

  for (
    const name of supplierNames
  ) {
    supplierMap.set(
      supplierId(name),
      name
    );
  }

  const matchedCount =
    result.decisions.filter(
      (decision) =>
        decision.status ===
        "recommended"
    ).length;

  const unmatchedCount =
    result.requestLines.length -
    matchedCount;

  const optimalBreakdown =
    Object.fromEntries(
      Object.entries(
        result.supplierTotals
      ).map(
        ([
          supplier,
          data,
        ]) => [
          displaySupplier(
            supplier,
            supplierMap
          ),
          data,
        ]
      )
    );

  const results =
    result.decisions.map(
      (decision) => {
        const allocations =
          decision.allocations;

        const firstAllocation =
          allocations[0] ??
          null;

        const firstOption =
          firstAllocation
            ? decision.options.find(
                (option) =>
                  option.offerId ===
                  firstAllocation.offerId
              ) ?? null
            : null;

        const selectedSuppliers = [
          ...new Set(
            allocations.map(
              (allocation) =>
                displaySupplier(
                  allocation.supplierId,
                  supplierMap
                )
            )
          ),
        ];

        const supplier =
          selectedSuppliers.length === 0
            ? null
            : selectedSuppliers.join(
                ", "
              );

        const price =
          allocations.length === 1
            ? allocations[0].unitPrice
            : null;

        const total =
          allocations.length > 0
            ? allocations.reduce(
                (sum, allocation) =>
                  sum +
                  allocation.totalPrice,
                0
              )
            : null;

        const alternatives =
          decision.options.map(
            (option) => ({
              supplier:
                displaySupplier(
                  option.supplierId,
                  supplierMap
                ),

              price:
                option.unitPrice,

              stock:
                option.availability ===
                "unavailable"
                  ? 0
                  : null,

              delivery:
                formatDelivery(
                  option.deliveryDays
                ),

              score:
                Number(
                  option.matchConfidence.toFixed(
                    2
                  )
                ),
            })
          );

        return {
          article:
            decision.requestLine
              .articleRaw,

          name:
            decision.requestLine
              .nameRaw,

          quantity:
            decision.requestLine
              .quantity,

          supplier,

          price,

          total,

          delivery:
            firstOption
              ? formatDelivery(
                  firstOption.deliveryDays
                )
              : null,

          alternatives,
        };
      }
    );

  return {
    success: true,

    requestFile:
      requestFileName,

    uploadedSuppliers:
      supplierNames,

    positionCount:
      result.requestLines.length,

    matchedCount,

    unmatchedCount,

    supplierCount:
      supplierNames.length,

    totalCost:
      result.totalCost,

    bestSingleSupplierCost:
      result.bestSingleSupplierCost,

    potentialSavings:
      result.potentialSavings,

    savingsMessage:
      result.savingsMessage,

    optimalBreakdown,

    results,
  };
}
