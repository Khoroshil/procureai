import { readCsv } from "./csv";
import {
  readFirstExcelSheet,
  type RawRow,
} from "./excel";

export type ImportedRequestRow = {
  row: RawRow;
  articleRaw: unknown;
  nameRaw: unknown;
  quantityRaw: unknown;
  unitRaw: unknown;
};

export type ImportedOfferRow = {
  row: RawRow;
  articleRaw: unknown;
  nameRaw: unknown;
  priceRaw: unknown;
  stockRaw: unknown;
  deliveryRaw: unknown;
  unitRaw: unknown;
  supplier: string;
};

const ARTICLE_HEADERS = [
  "артикул",
  "код",
  "номер",
  "код товара",
  "артикул товара",
  "part number",
  "sku",
];

const NAME_HEADERS = [
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

const UNIT_HEADERS = [
  "ед изм",
  "ед изм.",
  "единица измерения",
  "единица",
  "unit",
];

const UNIT_HEADERS = [
  "ед изм",
  "ед изм.",
  "единица измерения",
  "единица",
  "unit",
];

const UNIT_HEADERS = [
  "ед изм",
  "ед изм.",
  "единица измерения",
  "единица",
  "unit",
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

function findColumnKey(
  rows: RawRow[],
  aliases: string[]
): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }

  const originalHeaders = Object.keys(rows[0]);
  const headers = originalHeaders.map(normalizeHeader);
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const header of headers) {
    if (normalizedAliases.includes(header)) {
      return originalHeaders[headers.indexOf(header)];
    }
  }

  for (const header of headers) {
    if (
      normalizedAliases.some((alias) =>
        header.includes(alias)
      )
    ) {
      return originalHeaders[headers.indexOf(header)];
    }
  }

  return undefined;
}

function valueFromRow(
  row: RawRow,
  key: string | undefined
): unknown {
  return key ? row[key] ?? "" : "";
}

function getSupplierName(
  filename: string
): string {
  return filename.replace(
    /\.(xlsx|xls|csv)$/i,
    ""
  );
}

export function readSpreadsheet(
  buffer: Buffer,
  filename: string
): RawRow[] {
  const isCsv = /\.csv$/i.test(filename);

  return isCsv
    ? readCsv(buffer)
    : readFirstExcelSheet(buffer);
}

export function extractRequestRows(
  rows: RawRow[]
): ImportedRequestRow[] {
  if (rows.length === 0) {
    return [];
  }

  const articleKey = findColumnKey(
    rows,
    ARTICLE_HEADERS
  );

  const nameKey = findColumnKey(
    rows,
    NAME_HEADERS
  );

  const quantityKey = findColumnKey(
    rows,
    QUANTITY_HEADERS
  );

  const unitKey = findColumnKey(
    rows,
    UNIT_HEADERS
  );

  return rows.map((row) => ({
    row,
    articleRaw: valueFromRow(row, articleKey),
    nameRaw: valueFromRow(row, nameKey),
    quantityRaw: valueFromRow(row, quantityKey),
    unitRaw: valueFromRow(row, unitKey),
  }));
}

export function extractOfferRows(
  rows: RawRow[],
  filename: string
): ImportedOfferRow[] {
  if (rows.length === 0) {
    return [];
  }

  const articleKey = findColumnKey(
    rows,
    ARTICLE_HEADERS
  );

  const nameKey = findColumnKey(
    rows,
    NAME_HEADERS
  );

  const priceKey = findColumnKey(
    rows,
    PRICE_HEADERS
  );

  const stockKey = findColumnKey(
    rows,
    STOCK_HEADERS
  );

  const deliveryKey = findColumnKey(
    rows,
    DELIVERY_HEADERS
  );

  const unitKey = findColumnKey(
    rows,
    UNIT_HEADERS
  );

  const supplier = getSupplierName(filename);

  return rows.map((row) => ({
    row,
    articleRaw: valueFromRow(row, articleKey),
    nameRaw: valueFromRow(row, nameKey),
    priceRaw: valueFromRow(row, priceKey),
    stockRaw: valueFromRow(row, stockKey),
    deliveryRaw: valueFromRow(row, deliveryKey),
    unitRaw: valueFromRow(row, unitKey),
    supplier,
  }));
}
