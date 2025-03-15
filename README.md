# Solana Transaction Analyzer

A package to analyze parsed Helius transactions including token transfers, fees, and Jito tips.

## Installation

```bash
npm install @your-username/solana-transaction-analyzer
```

## Usage

```javascript
import {
  getParsedHeliusTransaction,
  analyseParsedTransaction,
} from "@your-username/solana-transaction-analyzer";

// Example usage
const transaction = await getParsedHeliusTransaction("txSignature");
const analysis = await analyseParsedTransaction(transaction);
```

## Configuration

Set these environment variables:

- `HELIUS_API_KEY`: Your Helius API key
- `SOLANA_RPC_URL`: Solana RPC endpoint URL

## API

### `analyseParsedTransaction(tx: Transaction): AnalysisResult`

Returns an object containing:

- Token addresses and amounts
- SOL transfers
- Fee breakdown
- Transaction type (BUY/SELL)
- Price calculations

## License

MIT
# helius-transaction-analyser
