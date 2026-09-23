
import type {
  MatchedItem,
  RequestLine,
  SupplierOffer,
} from "../domain/types";

import { assessDeepSeekMatch } from "./deepseek";
import { findExactMatches } from "./exact";
import { findFuzzyMatches } from "./fuzzy";

export async function matchRequestLine(
  request: RequestLine,
  offers: SupplierOffer[]
): Promise<MatchedItem[]> {
  const exactMatches =
    findExactMatches(
      request,
      offers
    );

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  const fuzzyMatches =
    findFuzzyMatches(
      request,
      offers
    );

  if (fuzzyMatches.length === 0) {
    return [];
  }

  const candidateMatches =
    fuzzyMatches.slice(0, 10);

  const candidateOffers =
    candidateMatches
      .map((match) =>
        offers.find(
          (offer) =>
            offer.id ===
            match.offerId
        )
      )
      .filter(
        (
          offer
        ): offer is SupplierOffer =>
          offer !== undefined
      );

  const deepSeekResult =
    await assessDeepSeekMatch(
      request,
      candidateOffers
    );

  if (
    deepSeekResult.matched &&
    deepSeekResult.candidateIndex !==
      null
  ) {
    const selected =
      candidateMatches[
        deepSeekResult.candidateIndex
      ];

    if (selected) {
      return [
        {
          ...selected,
          status: "probable",
          method: "deepseek",
          confidence:
            deepSeekResult.confidence,
          reasons: [
            deepSeekResult.reason,
          ],
        },
      ];
    }
  }

  return fuzzyMatches;
}

export async function matchAllRequestLines(
  requests: RequestLine[],
  offers: SupplierOffer[]
): Promise<MatchedItem[]> {
  const results =
    await Promise.all(
      requests.map(
        (request) =>
          matchRequestLine(
            request,
            offers
          )
      )
    );

  return results.flat();
}
