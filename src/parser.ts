/**
 * Module dependencies.
 */

import { readFileSync } from "node:fs";

/**
 * Export `Transaction` type.
 */

export interface Transaction {
  date: string;
  time: string;
  product: string;
  isin: string;
  quantity: number;
  price: number;
  valueEur: number;
  fees: number;
  totalEur: number;
}

/**
 * Parse a European-format number string like "1.234,56" into a JS number.
 */

function parseEuNumber(raw: string): number {
  if (!raw || raw.trim() === "") return 0;

  const replacedSeparators = raw.replace(/\./g, '').replace(",", ".");

  return parseFloat(replacedSeparators);
}

/**
 * Parse a DEGIRO Transactions CSV that uses commas as field delimiters
 * and European number format (commas as decimal separators inside quoted fields).
 *
 * Fields containing commas are wrapped in double-quotes by DEGIRO.
 */

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let parsedField = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const character = line[i];

    if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      fields.push(parsedField);
      parsedField = "";
    } else {
      parsedField += character;
    }
  }

  fields.push(parsedField);

  return fields;
}

/**
 * Parse CSV.
 */

export function parseCsv(filePath: string): Transaction[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  // Skip header
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const cols = splitCsvLine(line);
    // Columns:
    //  0  Date
    //  1  Time
    //  2  Product
    //  3  ISIN
    //  4  Reference exchange
    //  5  Venue
    //  6  Quantity
    //  7  Price
    //  8  (price currency)
    //  9  Local value
    // 10  (local value currency)
    // 11  Value EUR
    // 12  Exchange rate
    // 13  AutoFX Fee
    // 14  Transaction and/or third party fees EUR
    // 15  Total EUR
    // 16  Order ID (sometimes empty before the UUID)

    return {
      date: cols[0],
      time: cols[1],
      product: cols[2],
      isin: cols[3],
      quantity: parseEuNumber(cols[6]),
      price: parseEuNumber(cols[7]),
      valueEur: parseEuNumber(cols[11]),
      fees: parseEuNumber(cols[14]),
      totalEur: parseEuNumber(cols[15]),
    };
  });
}
