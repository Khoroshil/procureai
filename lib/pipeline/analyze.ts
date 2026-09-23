
import type {
  OptimizationStrategy,
  PurchaseResult,
} from "../domain/types";

import {
  readSpreadsheet,
  extractOfferRows,
  extractRequestRows,
} from "../import";

import {
  normalizeOfferRows,
  normalizeRequestRows,
} from "../normalization/normalize";

import {
  matchAllRequestLines,
} from "../matching/match";

import {
  optimizePurchase,
} from "../optimization/optimize";

import {
  buildResultRecommendations,
} from "../recommendation/recommend";

import {
  toProcurementReport,
  type ProcurementReport,
} from "../reports/types";

import type {
  ProcurementConstraints,
} from "../validation/constraints";

export type PipelineFile = {
  buffer: Buffer;
  filename: string;
};

export type AnalyzePipelineInput = {
  requestFile: PipelineFile;
  offerFiles: PipelineFile[];

  strategy?: OptimizationStrategy;

  constraints?: ProcurementConstraints;
};

export type AnalyzePipelineOutput = {
  result: PurchaseResult;
  report: ProcurementReport;
};

export async function analyzeProcurement(
  input: AnalyzePipelineInput
): Promise<AnalyzePipelineOutput> {
  const requestRawRows =
    readSpreadsheet(
      input.requestFile.buffer,
      input.requestFile.filename
    );

  const requestImportedRows =
    extractRequestRows(
      requestRawRows
    );

  const requestLines =
    normalizeRequestRows(
      requestImportedRows
    );

  if (requestLines.length === 0) {
    throw new Error(
      "Не удалось распознать заявку."
    );
  }

  const offers = input.offerFiles.flatMap(
    (file) => {
      const rawRows =
        readSpreadsheet(
          file.buffer,
          file.filename
        );

      const importedRows =
        extractOfferRows(
          rawRows,
          file.filename
        );

      return normalizeOfferRows(
        importedRows
      );
    }
  );

  if (offers.length === 0) {
    throw new Error(
      "В коммерческих предложениях не найдены корректные позиции."
    );
  }

  const matches =
    await matchAllRequestLines(
      requestLines,
      offers
    );

  let result =
    optimizePurchase({
      requests:
        requestLines,
      offers,
      matches,
      strategy:
        input.strategy ??
        "balanced",
      constraints:
        input.constraints ?? {
          allowSplitPurchase: true,
        },
    });

  result = {
    ...result,
    decisions:
      buildResultRecommendations(
        result
      ),
  };

  const report =
    toProcurementReport(
      result
    );

  return {
    result,
    report,
  };
}
