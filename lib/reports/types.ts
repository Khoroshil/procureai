
import type {
  PurchaseResult,
  PurchaseDecision,
  RequestLine,
  OfferOption,
  PurchaseAllocation,
  Warning,
} from "../domain/types";

export type ReportLine = {
  requestLineId: string;

  article: string;
  name: string;

  quantity: number;
  unit: string;

  selectedSupplier: string | null;
  selectedUnitPrice: number | null;
  selectedTotalPrice: number | null;

  deliveryDays: number | null;

  status: PurchaseDecision["status"];

  alternatives: OfferOption[];

  allocations: PurchaseAllocation[];

  warnings: Warning[];
};

export type ProcurementReport = {
  requestLines: RequestLine[];

  lines: ReportLine[];

  allocations: PurchaseAllocation[];

  suppliers: string[];

  totalCost: number;

  bestSingleSupplierCost: number | null;
  potentialSavings: number | null;
  savingsMessage: string | null;

  warnings: Warning[];
};

export function toProcurementReport(
  result: PurchaseResult
): ProcurementReport {
  const lines: ReportLine[] =
    result.decisions.map(
      (decision) => {
        const allocations =
          decision.allocations;

        const primaryAllocation =
          allocations[0] ?? null;

        const selectedOption =
          primaryAllocation
            ? decision.options.find(
                (option) =>
                  option.offerId ===
                  primaryAllocation.offerId
              ) ?? null
            : null;

        return {
          requestLineId:
            decision.requestLine.id,

          article:
            decision.requestLine.articleRaw,

          name:
            decision.requestLine.nameRaw,

          quantity:
            decision.requestLine.quantity,

          unit:
            decision.requestLine.unit,

          selectedSupplier:
            primaryAllocation
              ?.supplierId ?? null,

          selectedUnitPrice:
            primaryAllocation
              ?.unitPrice ?? null,

          selectedTotalPrice:
            allocations.length > 0
              ? allocations.reduce(
                  (sum, allocation) =>
                    sum +
                    allocation.totalPrice,
                  0
                )
              : null,

          deliveryDays:
            selectedOption
              ?.deliveryDays ?? null,

          status:
            decision.status,

          alternatives:
            decision.options,

          allocations,

          warnings:
            decision.warnings,
        };
      }
    );

  return {
    requestLines:
      result.requestLines,

    lines,

    allocations:
      result.allocations,

    suppliers:
      result.suppliers,

    totalCost:
      result.totalCost,

    bestSingleSupplierCost:
      result.bestSingleSupplierCost,

    potentialSavings:
      result.potentialSavings,

    savingsMessage:
      result.savingsMessage,

    warnings:
      result.warnings,
  };
}
