#!/usr/bin/env node

/**
 * Module dependencies.
 */

import { generateReport, formatReport } from "./report.js";
import { parseCsv } from "./parser.js";
import { resolve } from "node:path";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: degiro-report <path-to-degiro-csv>");

  process.exit(1);
}

const transactions = parseCsv(resolve(filePath));
const reports = generateReport(transactions);

console.log(formatReport(reports));
