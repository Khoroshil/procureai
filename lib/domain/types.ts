export type TaxMode =
  | "as_quoted"
  | "vat_inclusive"
  | "vat_exclusive";

export type MatchStatus =
  | "exact"
  | "probable"
  | "requires_review"
  | "incompatible"
  | "not_found";

export type MatchMethod =
  | "exact_article"
  | "normalized_article"
  | "text_similarity"
  | "deepseek";

export type WarningSeverity =
  | "info"
  | "warning"
  | "critical";

export type DecisionStatus =
  | "recommended"
  | "requires_review"
  | "unavailable";

export type OptimizationStrategy =
  | "balanced"
  | "cheapest"
  | "fastest";

export type RequestLine = {
  id: string;
  articleRaw: string;
  articleNormalized: string;
  nameRaw: string;
  nameNormalized: string;
  manufacturer?: string;
  quantity: number;
  unit: string;
  specifications: Record<string, string>;
};

export type SupplierOffer = {
  id: string;
  supplierId: string;
  articleRaw: string;
  articleNormalized: string;
  nameRaw: string;
  nameNormalized: string;
  manufacturer?: string;

  priceRaw?: string;
  price: number;
  currency: string;

  vatRate?: number;
  vatIncluded?: boolean;
  taxMode?: TaxMode;

  unitRaw?: string;
  unit: string;
  packageQuantity?: number;
  minOrderQuantity?: number;

  availableQuantity?: number;
  deliveryDays?: number;
  deliveryText?: string;

  specifications: Record<string, string>;
};

export type MatchedItem = {
  requestLineId: string;
  offerId: string;

  status: MatchStatus;
  method: MatchMethod;
  confidence: number;

  reasons: string[];
  extractedAttributes: Record<string, string>;
};

export type OfferOption = {
  requestLineId: string;
  offerId: string;
  supplierId: string;

  unitPrice: number;
  totalPrice: number;

  availability:
    | "available"
    | "unavailable"
    | "unknown";

  deliveryDays?: number;

  matchStatus: MatchStatus;
  matchConfidence: number;

  warnings: Warning[];
};

export type PurchaseAllocation = {
  requestLineId: string;
  offerId: string;
  supplierId: string;

  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type Warning = {
  code: string;
  severity: WarningSeverity;
  message: string;
};

export type Recommendation = {
  summary: string;
  reasons: string[];
  warnings: Warning[];
};

export type PurchaseDecision = {
  requestLine: RequestLine;
  options: OfferOption[];

  allocations: PurchaseAllocation[];

  strategy: OptimizationStrategy;
  status: DecisionStatus;

  warnings: Warning[];
  recommendation: Recommendation;
};

export type PurchaseResult = {
  success: boolean;

  requestLines: RequestLine[];
  decisions: PurchaseDecision[];

  allocations: PurchaseAllocation[];

  totalCost: number;

  bestSingleSupplierCost: number | null;
  potentialSavings: number | null;
  savingsMessage: string | null;

  suppliers: string[];
  supplierTotals: Record<
    string,
    {
      items: number;
      total: number;
    }
  >;

  warnings: Warning[];

  strategy: OptimizationStrategy;
};
