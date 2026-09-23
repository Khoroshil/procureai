
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  analyzeProcurement,
} from "../../../lib/pipeline/analyze";

import {
  toLegacyAnalysisResponse,
} from "../../../lib/reports/legacy";

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const requestFile =
      formData.get("request");

    const offerFiles =
      formData.getAll("offers");

    if (
      !(requestFile instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Не загружена заявка на закупку.",
        },
        { status: 400 }
      );
    }

    const validOfferFiles =
      offerFiles.filter(
        (
          file
        ): file is File =>
          file instanceof File
      );

    if (
      validOfferFiles.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Не загружены коммерческие предложения.",
        },
        { status: 400 }
      );
    }

    const strategyRaw =
      formData.get("strategy");

    const strategy =
      strategyRaw === "fastest" ||
      strategyRaw === "balanced" ||
      strategyRaw === "cheapest"
        ? strategyRaw
        : "cheapest";

    const pipelineResult =
      await analyzeProcurement({
        requestFile: {
          filename:
            requestFile.name,
          buffer:
            Buffer.from(
              await requestFile.arrayBuffer()
            ),
        },

        offerFiles:
          await Promise.all(
            validOfferFiles.map(
              async (file) => ({
                filename:
                  file.name,
                buffer:
                  Buffer.from(
                    await file.arrayBuffer()
                  ),
              })
            )
          ),

        strategy,

        constraints: {
          allowSplitPurchase:
            true,
        },
      });

    return NextResponse.json(
      toLegacyAnalysisResponse(
        pipelineResult.result,
        requestFile.name,
        validOfferFiles.map(
          (file) =>
            file.name.replace(
              /\.(xlsx|xls|csv)$/i,
              ""
            )
        )
      )
    );
  } catch (error) {
    console.error(
      "ProcureAI analysis error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Не удалось обработать файлы. Проверьте формат Excel/CSV и структуру колонок.",
      },
      { status: 500 }
    );
  }
}
