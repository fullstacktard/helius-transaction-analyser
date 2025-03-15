# Solana Transaction Analyzer

A package to analyze parsed Helius transactions including token transfers, fees, and Jito tips.

## Installation

```bash
npm install solana-transaction-analyzer
```

## Usage

```javascript
import {
  getParsedHeliusTransaction,
  getSolanaRPCTransaction,
  analyseParsedTransaction,
} from "solana-transaction-analyzer";

// Example usage
const heliusTx = await getParsedHeliusTransaction("txSignature");
const rpcTx = await getSolanaRPCTransaction("txSignature");
const analysis = await analyseParsedTransaction(heliusTx);
```

## Configuration

Set these environment variables:

- `HELIUS_API_KEY`: Your Helius API key (get one from [Helius pricing page](https://www.helius.dev/pricing) - free tier available)
- `SOLANA_RPC_URL`: Solana RPC endpoint URL

## API

### `getParsedHeliusTransaction(transactionSignature: string)`

Fetches parsed transaction data from Helius API

### `getSolanaRPCTransaction(transactionSignature: string)`

Retrieves raw transaction data directly from Solana RPC

### `analyseParsedTransaction(tx: Transaction): AnalysisResult`

Returns an object containing:

- Token addresses and amounts
- SOL transfers
- Fee breakdown
- Transaction type (BUY/SELL)
- Price calculations
