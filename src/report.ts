/**
 * Module dependencies.
 */

import chalk from "chalk";
import type { Transaction } from "./parser.js";

/**
 * Export `AssetReport` type.
 */

export interface AssetReport {
  product: string;
  isin: string;
  buyQuantity: number;
  buyTotalEur: number;
  sellQuantity: number;
  sellTotalEur: number;
  totalFees: number;

  // Weighted average buy price (cost basis per unit).
  breakEvenPrice: number;

  // Average sell price.
  avgSellPrice: number;

  // Net position (positive = still holding, 0 = fully closed).
  remainingQuantity: number;

  // Realized P&L from matched sell vs buy quantities.
  realizedPnl: number;
}

/**
 * Generate report from transactions list.
 */

export function generateReport(transactions: Transaction[]): AssetReport[] {
  const transactionsByAsset = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const key = tx.isin;

    if (!transactionsByAsset.has(key)) {
      transactionsByAsset.set(key, []);
    }

    transactionsByAsset.get(key)!.push(tx);
  }

  const reports: AssetReport[] = [];

  for (const [isin, txs] of transactionsByAsset) {
    // Sort chronologically (oldest first) for FIFO cost basis
    txs.sort((a, b) => {
      const dateA = parseDate(a.date, a.time);
      const dateB = parseDate(b.date, b.time);

      return dateA.getTime() - dateB.getTime();
    });

    const product = txs[0].product;
    let buyQuantity = 0;
    let buyTotalEur = 0; // total cost (positive number)
    let sellQuantity = 0;
    let sellTotalEur = 0; // total proceeds (positive number)
    let totalFees = 0;

    // FIFO lot queue: each entry is { qty, pricePerUnit }
    const lots: { qty: number; pricePerUnit: number }[] = [];

    let realizedPnl = 0;

    for (const tx of txs) {
      totalFees += Math.abs(tx.fees);

      if (tx.quantity > 0) {
        // Buy
        const cost = Math.abs(tx.valueEur);
        buyQuantity += tx.quantity;
        buyTotalEur += cost;
        lots.push({ qty: tx.quantity, pricePerUnit: tx.price });
      } else {
        // Sell
        const qty = Math.abs(tx.quantity);
        const proceeds = Math.abs(tx.valueEur);
        sellQuantity += qty;
        sellTotalEur += proceeds;
        const sellPrice = tx.price;

        // Match against FIFO lots
        let remaining = qty;
        while (remaining > 0 && lots.length > 0) {
          const lot = lots[0];
          const matched = Math.min(remaining, lot.qty);

          realizedPnl += matched * (sellPrice - lot.pricePerUnit);
          lot.qty -= matched;
          remaining -= matched;

          if (lot.qty <= 0) lots.shift();
        }
      }
    }

    const remainingQuantity = buyQuantity - sellQuantity;
    const breakEvenPrice = buyQuantity > 0 ? buyTotalEur / buyQuantity : 0;
    const avgSellPrice = sellQuantity > 0 ? sellTotalEur / sellQuantity : 0;

    reports.push({
      product,
      isin,
      buyQuantity,
      buyTotalEur,
      sellQuantity,
      sellTotalEur,
      totalFees,
      breakEvenPrice,
      avgSellPrice,
      remainingQuantity,
      realizedPnl,
    });
  }

  // Sort by product name
  reports.sort((a, b) => a.product.localeCompare(b.product));

  return reports;
}

/**
 * Parse date.
 */

function parseDate(date: string, time: string): Date {
  // date = "DD-MM-YYYY", time = "HH:MM"
  const [d, m, y] = date.split("-");

  return new Date(`${y}-${m}-${d}T${time}:00`);
}

export function formatReport(reports: AssetReport[]): string {
  const lines: string[] = [];
  const eur = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const printPnL = (n: number, text: string) => (n >= 0 ? chalk.green(text) : chalk.red(text));

  lines.push("=".repeat(80));
  lines.push("  DEGIRO PORTFOLIO REPORT");
  lines.push("=".repeat(80));
  lines.push("");

  let totalRealizedPnl = 0;
  let totalFees = 0;
  let totalBought = 0;
  let totalSold = 0;

  for (const r of reports) {
    totalRealizedPnl += r.realizedPnl;
    totalFees += r.totalFees;
    totalBought += r.buyTotalEur;
    totalSold += r.sellTotalEur;

    const netPnl = r.realizedPnl - r.totalFees;

    lines.push(`  ${r.product}`);
    lines.push(`  ISIN: ${r.isin}`);
    lines.push("-".repeat(80));
    lines.push(`  Bought:           ${r.buyQuantity} units   @ avg ${eur(r.breakEvenPrice)} EUR   = ${eur(r.buyTotalEur)} EUR`);
    lines.push(`  Sold:             ${r.sellQuantity} units   @ avg ${eur(r.avgSellPrice)} EUR   = ${eur(r.sellTotalEur)} EUR`);
    lines.push(`  Remaining:        ${r.remainingQuantity} units`);
    lines.push(`  Break-even price: ${eur(r.breakEvenPrice)} EUR`);
    lines.push(`  Total fees:       ${chalk.yellow(`${eur(r.totalFees)} EUR`)}`);
    lines.push(`  Realized P&L:     ${printPnL(r.realizedPnl, `${r.realizedPnl >= 0 ? "+" : ""}${eur(r.realizedPnl)} EUR`)}`);
    lines.push(`  Net P&L (w/fees): ${printPnL(netPnl, `${netPnl >= 0 ? "+" : ""}${eur(netPnl)} EUR`)}`);
    lines.push("");
  }

  const totalNetPnl = totalRealizedPnl - totalFees;

  lines.push("=".repeat(80));
  lines.push("  SUMMARY");
  lines.push("=".repeat(80));
  lines.push(`  Total bought:       ${eur(totalBought)} EUR`);
  lines.push(`  Total sold:         ${eur(totalSold)} EUR`);
  lines.push(`  Total fees:         ${chalk.yellow(`${eur(totalFees)} EUR`)}`);
  lines.push(`  Total realized P&L: ${printPnL(totalRealizedPnl, `${totalRealizedPnl >= 0 ? "+" : ""}${eur(totalRealizedPnl)} EUR`)}`);
  lines.push(`  Net P&L (w/fees):   ${printPnL(totalNetPnl, `${totalNetPnl >= 0 ? "+" : ""}${eur(totalNetPnl)} EUR`)}`);
  lines.push("");

  return lines.join("\n");
}
