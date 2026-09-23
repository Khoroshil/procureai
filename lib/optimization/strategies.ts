
import type {
  OptimizationStrategy,
} from "../domain/types";

export type StrategyWeights = {
  price: number;
  delivery: number;
};

export function getStrategyWeights(
  strategy: OptimizationStrategy
): StrategyWeights {
  switch (strategy) {
    case "cheapest":
      return {
        price: 0.9,
        delivery: 0.1,
      };

    case "fastest":
      return {
        price: 0.1,
        delivery: 0.9,
      };

    case "balanced":
    default:
      return {
        price: 0.65,
        delivery: 0.35,
      };
  }
}

export function rankOffers<
  T extends {
    price: number;
    deliveryDays?: number;
  },
>(
  offers: T[],
  strategy: OptimizationStrategy
): T[] {
  if (offers.length <= 1) {
    return [...offers];
  }

  const weights =
    getStrategyWeights(strategy);

  const prices = offers.map(
    (offer) => offer.price
  );

  const deliveries = offers
    .map((offer) =>
      offer.deliveryDays
    )
    .filter(
      (
        value
      ): value is number =>
        value !== undefined
    );

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const minDelivery =
    deliveries.length > 0
      ? Math.min(...deliveries)
      : 0;

  const maxDelivery =
    deliveries.length > 0
      ? Math.max(...deliveries)
      : 0;

  const normalize = (
    value: number,
    min: number,
    max: number
  ): number => {
    if (max === min) {
      return 0;
    }

    return (
      (value - min) /
      (max - min)
    );
  };

  return offers
    .map((offer, index) => {
      const priceScore =
        normalize(
          offer.price,
          minPrice,
          maxPrice
        );

      const deliveryScore =
        offer.deliveryDays ===
        undefined
          ? 1
          : normalize(
              offer.deliveryDays,
              minDelivery,
              maxDelivery
            );

      const score =
        priceScore *
          weights.price +
        deliveryScore *
          weights.delivery;

      return {
        offer,
        score,
        index,
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      if (
        a.offer.price !==
        b.offer.price
      ) {
        return (
          a.offer.price -
          b.offer.price
        );
      }

      return a.index - b.index;
    })
    .map((item) => item.offer);
}
