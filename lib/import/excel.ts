import * as XLSX from "xlsx";

export type RawRow = Record<string, unknown>;

export function readFirstExcelSheet(
  buffer: Buffer
): RawRow[] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("В Excel-файле отсутствует лист.");
  }

  const sheet = workbook.Sheets[firstSheetName];

  return XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: "",
  });
}
