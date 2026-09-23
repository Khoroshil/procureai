import * as XLSX from "xlsx";
import type { RawRow } from "./excel";

export function readCsv(
  buffer: Buffer
): RawRow[] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    raw: true,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("CSV-файл не содержит данных.");
  }

  const sheet = workbook.Sheets[firstSheetName];

  return XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: "",
  });
}
