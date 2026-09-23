
import type {
  MatchedItem,
  RequestLine,
  SupplierOffer,
} from "../domain/types";

function tokenSimilarity(
  a: string,
  b: string
): number {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));

  const intersection = [...aTokens].filter(
    (token) => bTokens.has(token)
  ).length;

  const union = new Set([
    ...aTokens,
    ...bTokens,
  ]).size;

  return union === 0
    ? 0
    : intersection / union;
}

export function findFuzzyMatches(
  request: RequestLine,
  offers: SupplierOffer[],
  threshold = 0.35
): MatchedItem[] {
  return offers
    .map((offer) => {
      const articleScore =
        tokenSimilarity(
          request.articleNormalized,
          offer.articleNormalized
        );

      const nameScore =
        tokenSimilarity(
          request.nameNormalized,
          offer.nameNormalized
        );

      const confidence = Math.max(
        articleScore,
        nameScore
      );

      return {
        offer,
        confidence,
        articleScore,
        nameScore,
      };
    })
    .filter(
      (item) =>
        item.confidence >= threshold
    )
    .sort(
      (a, b) =>
        b.confidence - a.confidence
    )
    .map((item) => ({
      requestLineId: request.id,
      offerId: item.offer.id,
      status:
        item.confidence >= 0.7
          ? "probable"
          : "requires_review",
      method: "text_similarity",
      confidence: Number(
        item.confidence.toFixed(3)
      ),
      reasons: [
        `Сходство артикула: ${item.articleScore.toFixed(2)}`,
        `Сходство названия: ${item.nameScore.toFixed(2)}`,
      ],
      extractedAttributes: {},
    }));
}
