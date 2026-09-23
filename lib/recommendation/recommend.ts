
import type {
  PurchaseDecision,
  PurchaseResult,
  Recommendation,
  Warning,
} from "../domain/types";

function uniqueWarnings(
  warnings: Warning[]
): Warning[] {
  const seen = new Set<string>();

  return warnings.filter((warning) => {
    const key =
      `${warning.code}:${warning.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function buildRecommendation(
  decision: PurchaseDecision
): Recommendation {
  const allocations =
    decision.allocations;

  const suppliers = [
    ...new Set(
      allocations.map(
        (allocation) =>
          allocation.supplierId
      )
    ),
  ];

  const reasons: string[] = [];

  if (
    decision.status ===
    "recommended"
  ) {
    if (suppliers.length === 1) {
      reasons.push(
        `Позиция покрыта поставщиком ${suppliers[0]}.`
      );
    } else if (
      suppliers.length > 1
    ) {
      reasons.push(
        "Потребность распределена между несколькими поставщиками."
      );
    }

    if (
      decision.strategy ===
      "cheapest"
    ) {
      reasons.push(
        "Для выбора использована стратегия минимальной стоимости."
      );
    }

    if (
      decision.strategy ===
      "fastest"
    ) {
      reasons.push(
        "Для выбора использована стратегия минимального срока поставки."
      );
    }

    if (
      decision.strategy ===
      "balanced"
    ) {
      reasons.push(
        "Для выбора использована сбалансированная стратегия цены и срока."
      );
    }
  } else if (
    decision.status ===
    "requires_review"
  ) {
    reasons.push(
      "Автоматическое решение требует проверки закупщиком."
    );
  } else {
    reasons.push(
      "Автоматическая рекомендация не сформирована."
    );
  }

  const warnings =
    uniqueWarnings(
      decision.warnings
    );

  if (warnings.length > 0) {
    reasons.push(
      "Для позиции обнаружены условия, которые необходимо учитывать при закупке."
    );
  }

  const summary =
    decision.status ===
    "recommended"
      ? suppliers.length > 1
        ? "Позиция покрыта распределённой закупкой."
        : "Позиция покрыта автоматически."
      : decision.status ===
          "requires_review"
        ? "Позиция требует проверки."
        : "Позиция не может быть автоматически рекомендована.";

  return {
    summary,
    reasons,
    warnings,
  };
}

export function buildResultRecommendations(
  result: PurchaseResult
): PurchaseDecision[] {
  return result.decisions.map(
    (decision) => ({
      ...decision,
      recommendation:
        buildRecommendation(
          decision
        ),
    })
  );
}
