# degiro-report

CLI tool that parses DEGIRO transaction CSV exports and generates a portfolio report with per-asset breakdowns.

## Features

- Parses DEGIRO CSV exports (European number format)
- FIFO cost basis matching for realized P&L
- Per-asset report: total bought, total sold, break-even price, realized P&L
- Color-coded output (green/red for P&L, yellow for fees)

## Installation

```bash
npm install -g degiro-report
```

## Usage

```bash
degiro-report <path-to-csv>
```

### Example

```bash
degiro-report ~/Downloads/Degiro_Transactions.csv
```

### Output

For each asset:

- **Bought** — total units and EUR spent
- **Sold** — total units and EUR received
- **Remaining** — units still held
- **Break-even price** — weighted average buy price
- **Total fees** — sum of all transaction fees
- **Realized P&L** — profit/loss on closed positions (FIFO)
- **Net P&L** — realized P&L minus fees

Plus a portfolio-wide summary.

## Exporting from DEGIRO

1. Log in to your DEGIRO account
2. Go to **Inbox > Transactions**
3. Set the date range and click **Export**
4. Save the CSV file and pass its path to `degiro-report`

## Development

```bash
git clone <repo-url>
cd degiro-report
npm install
npm run build
```

Run locally without installing globally:

```bash
node dist/index.js <path-to-csv>
```

## License

MIT
