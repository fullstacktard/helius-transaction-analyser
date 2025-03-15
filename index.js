import dotenv from "dotenv";
import { Connection } from "@solana/web3.js";
dotenv.config();

export async function getParsedHeliusTransaction(transaction) {
  try {
    const url = `https://api.helius.xyz/v0/transactions/?api-key=${process.env.HELIUS_API_KEY}&commitment=confirmed`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transactions: [transaction],
      }),
    });

    const data = await response.json();

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getSolanaRPCTransaction(transactionSignature) {
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");
    const tx = await connection.getTransaction(transactionSignature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      throw new Error("Transaction not found");
    }

    return tx;
  } catch (error) {
    throw error;
  }
}

export async function analyseParsedTransaction(tx) {
  const result = {
    signature: null,
    type: null,
    tokenAddress: null,
    tokenAmount: null,
    decimals: null,
    solAmount: null,
    fee: null,
    tipAmount: null,
    otherFees: null,
    wallet: null,
    block: null,
    blockTime: null,
    tokenPrice: null,
  };

  try {
    if (!tx || !tx[0] || tx[0].transactionError) {
      return result;
    }
    const transaction = tx[0];
    result.signature = transaction.signature;
    const feePayer = transaction.feePayer;
    result.wallet = feePayer;
    result.fee = transaction.fee / 1e9;
    result.block = transaction.slot;
    result.blockTime = transaction.timestamp;

    // Group token transfers by type
    const transfers = {
      wsol: transaction.tokenTransfers.find(
        (transfer) =>
          transfer.mint === "So11111111111111111111111111111111111111112"
      ),
      token: transaction.tokenTransfers.filter(
        (transfer) =>
          transfer.mint !== "So11111111111111111111111111111111111111112" &&
          (transfer.fromUserAccount === feePayer ||
            transfer.toUserAccount === feePayer)
      ),
      sol: transaction.nativeTransfers.filter(
        (transfer) =>
          transfer.fromUserAccount === feePayer ||
          transfer.toUserAccount === feePayer
      ),
    };
    // Calculate tip amount (small transfers < 0.05 SOL)
    const smallTransfers = transfers.sol.filter(
      (transfer) =>
        transfer.fromUserAccount === feePayer && transfer.amount < 50000000
    );

    // Jito tip addresses
    const JITO_TIP_RECEIVERS = new Set([
      "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
      "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
      "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
      "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
      "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
      "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
      "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
      "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
    ]);

    const { tipTransfers, otherTransfers } = smallTransfers.reduce(
      (acc, transfer) => {
        if (JITO_TIP_RECEIVERS.has(transfer.toUserAccount)) {
          acc.tipTransfers.push(transfer);
        } else {
          acc.otherTransfers.push(transfer);
        }
        return acc;
      },
      { tipTransfers: [], otherTransfers: [] }
    );

    result.tipAmount = tipTransfers.reduce((sum, t) => sum + t.amount / 1e9, 0);
    result.otherFees = otherTransfers.reduce(
      (sum, t) => sum + t.amount / 1e9,
      0
    );

    // Calculate main SOL amount (excluding fees and tips)
    const calculateSolAmount = () => {
      let amount = 0;
      let solAmount = 0;
      // Handle native SOL transfers first
      transfers.sol
        .filter(
          (transfer) => transfer.amount >= 50000000 // >= 0.05 SOL
        )
        .forEach((transfer) => {
          solAmount += transfer.amount / 1e9;
        });

      let wSolTransfers = transfers?.wsol?.tokenAmount || 0;

      // If no native SOL found, check WSOL
      amount = Math.max(solAmount, wSolTransfers);
      // If no amount found yet, check account balance changes
      if (amount === 0) {
        const feePayerAccount = transaction.accountData.find(
          (account) => account.account === feePayer
        );
        const counterpartyAccount = transaction.accountData.find(
          (account) =>
            account.account !== feePayer &&
            Math.abs(account.nativeBalanceChange) > 50000000 // > 0.05 SOL
        );

        if (feePayerAccount && counterpartyAccount) {
          // Use the absolute value of the larger balance change
          amount =
            Math.abs(
              Math.max(
                feePayerAccount.nativeBalanceChange,
                counterpartyAccount.nativeBalanceChange
              )
            ) / 1e9;
        }
      }

      return amount;
    };
    const STABLE_MINTS = new Set([
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
      // Add other stablecoins as needed
    ]);
    // Find all token transfers involving the fee payer
    const userTokenTransfers = transfers.token.filter(
      (transfer) =>
        transfer.fromUserAccount === feePayer ||
        transfer.toUserAccount === feePayer
    );
    if (userTokenTransfers.length > 0) {
      if (userTokenTransfers.length === 1) {
        // Handle single token transfer
        const transfer = userTokenTransfers[0];
        if (transfer.fromUserAccount === feePayer) {
          result.type = "SELL";
          result.tokenAddress = transfer.mint;
          result.tokenAmount = transfer.tokenAmount;
          result.solAmount = calculateSolAmount();
        } else if (transfer.toUserAccount === feePayer) {
          result.type = "BUY";
          result.tokenAddress = transfer.mint;
          result.tokenAmount = transfer.tokenAmount;
          result.solAmount = calculateSolAmount();
        }

        // Find decimals from account data
        const tokenData = transaction.accountData
          .flatMap((acc) => acc.tokenBalanceChanges || [])
          .find((t) => t.mint === transfer.mint);
        result.decimals = tokenData?.rawTokenAmount?.decimals || null;
      } else {
        // Handle multiple token transfers - MODIFIED SECTION
        // Filter out stablecoin transfers
        const nonStableTransfers = userTokenTransfers.filter(
          (t) => !STABLE_MINTS.has(t.mint)
        );

        if (nonStableTransfers.length === 0) return result;

        // Get first and last NON-STABLE transfers
        const firstTransfer = nonStableTransfers[0];
        const lastTransfer = nonStableTransfers[nonStableTransfers.length - 1];

        // Determine direction based on FIRST non-stable transfer
        if (firstTransfer.fromUserAccount === feePayer) {
          result.type = "SELL";
          result.tokenAddress = firstTransfer.mint;
          result.tokenAmount = firstTransfer.tokenAmount;
        } else if (firstTransfer.toUserAccount === feePayer) {
          result.type = "BUY";
          result.tokenAddress = firstTransfer.mint;
          result.tokenAmount = firstTransfer.tokenAmount;
        }

        // Find decimals from account data using FIRST transfer's mint
        const tokenData = transaction.accountData
          .flatMap((acc) => acc.tokenBalanceChanges || [])
          .find((t) => t.mint === firstTransfer.mint);
        result.decimals = tokenData?.rawTokenAmount?.decimals || null;

        // Calculate SOL amount from ALL transfers (including stables)
        result.solAmount = calculateSolAmount();
      }
    }
    result.tokenPrice = result.solAmount / result.tokenAmount;
    return result;
  } catch (error) {
    feedLog(error);
    return result;
  }
}
