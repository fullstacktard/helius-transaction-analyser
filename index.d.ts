declare module "helius-transaction-analyzer" {
  export function getParsedHeliusTransaction(transaction: any): Promise<any>;
  export function getSolanaRPCTransaction(
    transactionSignature: string
  ): Promise<any>;
  export function analyseParsedTransaction(tx: any): Promise<{
    signature: string | null;
    type: string | null;
    tokenAddress: string | null;
    tokenAmount: number | null;
    decimals: number | null;
    solAmount: number | null;
    fee: number | null;
    tipAmount: number | null;
    otherFees: number | null;
    wallet: string | null;
    block: number | null;
    blockTime: number | null;
    tokenPrice: number | null;
  }>;
}
