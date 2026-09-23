
import type {
  MatchedItem,
  RequestLine,
  SupplierOffer,
} from "../domain/types";

import { findExactMatches } from "./exact";
import { findFuzzyMatches } from "./fuzzy";

export function matchRequestLine(
  request: RequestLine,
  offers: SupplierOffer[]
): MatchedItem[] {
  const exactMatches =
    findExactMatches(
      request,
      offers
    );

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  return findFuzzyMatches(
    request,
    offers
  );
}

export function matchAllRequestLines(
  requests: RequestLine[],
  offers: SupplierOffer[]
): MatchedItem[] {
  return requests.flatMap(
    (request) =>
      matchRequestLine(
        request,
        offers
      )
  );
}
