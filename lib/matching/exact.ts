
import type {
  MatchedItem,
  RequestLine,
  SupplierOffer,
} from "../domain/types";

export function findExactMatches(
  request: RequestLine,
  offers: SupplierOffer[]
): MatchedItem[] {
  if (!request.articleNormalized) {
    return [];
  }

  return offers
    .filter(
      (offer) =>
        offer.articleNormalized !== "" &&
        offer.articleNormalized ===
          request.articleNormalized
    )
    .map((offer) => ({
      requestLineId: request.id,
      offerId: offer.id,
      status: "exact",
      method: "exact_article",
      confidence: 1,
      reasons: [
        "Точное совпадение нормализованного артикула",
      ],
      extractedAttributes: {},
    }));
}
