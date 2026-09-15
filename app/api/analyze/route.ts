import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

type Row = Record<string, unknown>;

type RequestItem = {
  key: string;
  article: string;
  name: string;
  quantity: number;
};

type OfferItem = {
  key: string;
  article: string;
  name: string;
  price: number;
  stock: number | null;
  delivery: string;
  supplier: string;
};

const REQUEST_ARTICLE_HEADERS = [
  "артикул",
  "код",
  "номер",
  "код товара",
  "артикул товара",
  "part number",
  "sku",
];

const REQUEST_NAME_HEADERS = [
  "наименование",
  "название",
  "товар",
  "позиция",
  "описание",
  "наименование товара",
];

const QUANTITY_HEADERS = [
  "количество",
  "кол-во",
  "колво",
  "qty",
  "количество шт",
  "требуемое количество",
];

const PRICE_HEADERS = [
  "цена",
  "цена за единицу",
  "цена ед",
  "цена/шт",
  "розничная цена",
  "оптовая цена",
  "стоимость",
  "price",
];

const STOCK_HEADERS = [
  "остаток",
  "наличие",
  "в наличии",
  "доступно",
  "количество в наличии",
  "stock",
];

const DELIVERY_HEADERS = [
  "срок",
  "срок поставки",
  "доставка",
  "срок доставки",
  "delivery",
];

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const result = Number(text);

  return Number.isFinite(result) ? result : 0;
}

function findColumn(
  headers: string[],
  aliases: string[]
): string | undefined {
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const header of headers) {
    if (normalizedAliases.includes(header)) {
      return header;
    }
  }

  for (const header of headers) {
    if (
      normalizedAliases.some((alias) =>
        header.includes(alias)
      )
    ) {
      return header;
    }
  }

  return undefined;
}

function rowsFromWorkbook(buffer: Buffer): Row[] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("В файле не найден лист Excel.");
  }

  const sheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json<Row>(sheet, {
    defval: "",
  });
}

function detectRequestRows(rows: Row[]): RequestItem[] {
  if (!rows.length) return [];

  const rawHeaders = Object.keys(rows[0]);
  const headers = rawHeaders.map(normalizeHeader);

  const articleHeader = findColumn(
    headers,
    REQUEST_ARTICLE_HEADERS
  );

  const nameHeader = findColumn(
    headers,
    REQUEST_NAME_HEADERS
  );

  const quantityHeader = findColumn(
    headers,
    QUANTITY_HEADERS
  );

  const articleKey = articleHeader
    ? rawHeaders[headers.indexOf(articleHeader)]
    : undefined;

  const nameKey = nameHeader
    ? rawHeaders[headers.indexOf(nameHeader)]
    : undefined;

  const quantityKey = quantityHeader
    ? rawHeaders[headers.indexOf(quantityHeader)]
    : undefined;

  return rows
    .map((row) => {
      const article = String(
        articleKey ? row[articleKey] ?? "" : ""
      ).trim();

      const name = String(
        nameKey ? row[nameKey] ?? "" : ""
      ).trim();

      const quantity = numberValue(
        quantityKey ? row[quantityKey] : 1
      );

      return {
        key: normalizeText(article || name),
        article,
        name,
        quantity: quantity > 0 ? quantity : 1,
      };
    })
    .filter((item) => item.key);
}

function detectOfferRows(
  rows: Row[],
  supplier: string
): OfferItem[] {
  if (!rows.length) return [];

  const rawHeaders = Object.keys(rows[0]);
  const headers = rawHeaders.map(normalizeHeader);

  const articleHeader = findColumn(
    headers,
    REQUEST_ARTICLE_HEADERS
  );

  const nameHeader = findColumn(
    headers,
    REQUEST_NAME_HEADERS
  );

  const priceHeader = findColumn(
    headers,
    PRICE_HEADERS
  );

  const stockHeader = findColumn(
    headers,
    STOCK_HEADERS
  );

  const deliveryHeader = findColumn(
    headers,
    DELIVERY_HEADERS
  );

  const articleKey = articleHeader
    ? rawHeaders[headers.indexOf(articleHeader)]
    : undefined;

  const nameKey = nameHeader
    ? rawHeaders[headers.indexOf(nameHeader)]
    : undefined;

  const priceKey = priceHeader
    ? rawHeaders[headers.indexOf(priceHeader)]
    : undefined;

  const stockKey = stockHeader
    ? rawHeaders[headers.indexOf(stockHeader)]
    : undefined;

  const deliveryKey = deliveryHeader
    ? rawHeaders[headers.indexOf(deliveryHeader)]
    : undefined;

  return rows
    .map((row) => {
      const article = String(
        articleKey ? row[articleKey] ?? "" : ""
      ).trim();

      const name = String(
        nameKey ? row[nameKey] ?? "" : ""
      ).trim();

      const price = numberValue(
        priceKey ? row[priceKey] : 0
      );

      const stockRaw = stockKey
        ? row[stockKey]
        : "";

      const stockText = String(
        stockRaw ?? ""
      )
        .trim()
        .toLowerCase();

      let stock: number | null = null;

      if (stockText) {
        const parsedStock = numberValue(stockRaw);

        if (parsedStock > 0) {
          stock = parsedStock;
        } else if (
          [
            "да",
            "есть",
            "в наличии",
            "много",
            "yes",
            "in stock",
          ].includes(stockText)
        ) {
          stock = 999999;
        }
      }

      const delivery = String(
        deliveryKey ? row[deliveryKey] ?? "" : ""
      ).trim();

      return {
        key: normalizeText(article || name),
        article,
        name,
        price,
        stock,
        delivery,
        supplier,
      };
    })
    .filter(
      (item) => item.key && item.price > 0
    );
}

function similarity(
  a: string,
  b: string
): number {
  if (!a || !b) return 0;

  if (a === b) return 1;

  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));

  const intersection = [...aTokens].filter(
    (token) => bTokens.has(token)
  ).length;

  const union = new Set([
    ...aTokens,
    ...bTokens,
  ]).size;

  return union
    ? intersection / union
    : 0;
}

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

    if (!(requestFile instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Не загружена заявка на закупку.",
        },
        { status: 400 }
      );
    }

    if (!offerFiles.length) {
      return NextResponse.json(
        {
          error:
            "Не загружены КП поставщиков.",
        },
        { status: 400 }
      );
    }

    const requestBuffer = Buffer.from(
      await requestFile.arrayBuffer()
    );

    const requestRows =
      rowsFromWorkbook(requestBuffer);

    const requestItems =
      detectRequestRows(requestRows);

    if (!requestItems.length) {
      return NextResponse.json(
        {
          error:
            "Не удалось распознать позиции заявки. Нужны колонки «Артикул», «Наименование» и «Количество».",
        },
        { status: 400 }
      );
    }

    const offers: OfferItem[] = [];
    const uploadedSuppliers: string[] = [];

    for (const file of offerFiles) {
      if (!(file instanceof File)) {
        continue;
      }

      const buffer = Buffer.from(
        await file.arrayBuffer()
      );

      const rows =
        rowsFromWorkbook(buffer);

      const supplier =
        file.name.replace(
          /\.(xlsx|xls|csv)$/i,
          ""
        );

      uploadedSuppliers.push(
        supplier
      );

      offers.push(
        ...detectOfferRows(
          rows,
          supplier
        )
      );
    }

    const supplierNames =
      [...new Set(uploadedSuppliers)];

    if (!offers.length) {
      return NextResponse.json(
        {
          error:
            "В загруженных КП не удалось найти позиции с ценой.",
        },
        { status: 400 }
      );
    }

    const results = requestItems.map(
      (requestItem) => {
        const candidates = offers
          .map((offer) => {
            const articleSimilarity =
              requestItem.article &&
              offer.article
                ? similarity(
                    normalizeText(
                      requestItem.article
                    ),
                    normalizeText(
                      offer.article
                    )
                  )
                : 0;

            const nameSimilarity =
              similarity(
                normalizeText(
                  requestItem.name
                ),
                normalizeText(
                  offer.name
                )
              );

            const exactArticle =
              normalizeText(
                requestItem.article
              ) !== "" &&
              normalizeText(
                requestItem.article
              ) ===
                normalizeText(
                  offer.article
                );

            return {
              ...offer,
              score: exactArticle
                ? 1
                : Math.max(
                    articleSimilarity,
                    nameSimilarity
                  ),
            };
          })
          .filter(
            (offer) =>
              offer.score >= 0.35
          );

        const availableCandidates =
          candidates.filter(
            (candidate) =>
              candidate.stock === null ||
              candidate.stock >=
                requestItem.quantity
          );

        availableCandidates.sort(
          (a, b) => {
            if (a.score !== b.score) {
              return b.score - a.score;
            }

            return (
              a.price - b.price
            );
          }
        );

        const exactCandidates =
          availableCandidates.filter(
            (candidate) =>
              candidate.score >= 0.99
          );

        const pool =
          exactCandidates.length
            ? exactCandidates
            : availableCandidates;

        pool.sort(
          (a, b) =>
            a.price - b.price
        );

        const best = pool[0];

        const total = best
          ? best.price *
            requestItem.quantity
          : null;

        return {
          article:
            requestItem.article,
          name:
            requestItem.name,
          quantity:
            requestItem.quantity,
          supplier:
            best?.supplier ?? null,
          price:
            best?.price ?? null,
          total,
          delivery:
            best?.delivery ?? null,
          alternatives:
            pool
              .slice(0, 10)
              .map(
                (candidate) => ({
                  supplier:
                    candidate.supplier,
                  price:
                    candidate.price,
                  stock:
                    candidate.stock,
                  delivery:
                    candidate.delivery,
                  score:
                    Number(
                      candidate.score.toFixed(
                        2
                      )
                    ),
                })
              ),
        };
      }
    );

    const validResults =
      results.filter(
        (item) =>
          item.price !== null &&
          item.total !== null
      );

    const unmatched =
      results.filter(
        (item) =>
          item.price === null
      ).length;

    const optimalTotal =
      validResults.reduce(
        (sum, item) =>
          sum + (item.total ?? 0),
        0
      );

    // Считаем стоимость закупки целиком
    // у каждого отдельного поставщика.
    const singleSupplierTotals =
      supplierNames.map(
        (supplier) => {
          let total = 0;

          for (
            const requestItem
            of requestItems
          ) {
            const candidates =
              offers.filter(
                (offer) => {
                  if (
                    offer.supplier !==
                    supplier
                  ) {
                    return false;
                  }

                  const articleMatch =
                    requestItem.article &&
                    offer.article &&
                    normalizeText(
                      requestItem.article
                    ) ===
                      normalizeText(
                        offer.article
                      );

                  const nameScore =
                    similarity(
                      normalizeText(
                        requestItem.name
                      ),
                      normalizeText(
                        offer.name
                      )
                    );

                  const enoughStock =
                    offer.stock ===
                      null ||
                    offer.stock >=
                      requestItem.quantity;

                  return (
                    enoughStock &&
                    (articleMatch ||
                      nameScore >= 0.35)
                  );
                }
              );

            candidates.sort(
              (a, b) =>
                a.price - b.price
            );

            const best =
              candidates[0];

            if (!best) {
              return Infinity;
            }

            total +=
              best.price *
              requestItem.quantity;
          }

          return total;
        }
      );

    const bestSingleSupplier =
      Math.min(
        ...singleSupplierTotals
      );

    const potentialSavings =
      Number.isFinite(
        bestSingleSupplier
      )
        ? Math.max(
            0,
            bestSingleSupplier -
              optimalTotal
          )
        : 0;

    const optimalBreakdown =
      validResults.reduce<
        Record<
          string,
          {
            items: number;
            total: number;
          }
        >
      >(
        (acc, item) => {
          const supplier =
            item.supplier ||
            "Не определён";

          if (!acc[supplier]) {
            acc[supplier] = {
              items: 0,
              total: 0,
            };
          }

          acc[supplier].items += 1;
          acc[supplier].total +=
            item.total ?? 0;

          return acc;
        },
        {}
      );

    return NextResponse.json({
      success: true,

      requestFile:
        requestFile.name,

      uploadedSuppliers:
        supplierNames,

      positionCount:
        requestItems.length,

      matchedCount:
        validResults.length,

      unmatchedCount:
        unmatched,

      supplierCount:
        supplierNames.length,

      totalCost:
        optimalTotal,

      bestSingleSupplierCost:
        Number.isFinite(
          bestSingleSupplier
        )
          ? bestSingleSupplier
          : null,

      potentialSavings,

      optimalBreakdown,

      results,
    });
  } catch (error) {
    console.error(
      "ProcureAI analyze error:",
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