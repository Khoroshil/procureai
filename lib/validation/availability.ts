
import type {
  RequestLine,
  SupplierOffer,
} from "../domain/types";

export type AvailabilityStatus =
  | "available"
  | "unavailable"
  | "unknown";

export function getAvailabilityStatus(
  request: RequestLine,
  offer: SupplierOffer
): AvailabilityStatus {
  const availableQuantity =
    offer.availableQuantity;

  if (
    availableQuantity === undefined
  ) {
    return "unknown";
  }

  if (
    availableQuantity <= 0 ||
    availableQuantity < request.quantity
  ) {
    return "unavailable";
  }

  return "available";
}
