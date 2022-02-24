import BN from "bn.js";
import { Market } from "@project-serum/serum";
import { NATIVE_MINT } from "@solana/spl-token";
import * as Token from "@solana/spl-token"
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { PoolInfo } from "./infos";
import * as ixs from "./instructions";
import { AMM_AUTHORITY, LIQUIDITY_POOL_PROGRAM_ID_V3, LIQUIDITY_POOL_PROGRAM_ID_V4 } from "./ids";
import { createATAWithoutCheckIx, findAssociatedTokenAddress, wrapNative } from "../utils";

export async function swap(
  pool: PoolInfo,
  fromMint: PublicKey,
  toMint: PublicKey,
  wallet: PublicKey,
  amountIn: BN,
  minAmountOut: BN,
  connection: Connection,
  fromTokenAccount?: PublicKey,
): Promise<Transaction> {
  const tx = new Transaction();
  const cleanUpTx = new Transaction();
  if (fromTokenAccount) {
    fromTokenAccount = fromTokenAccount as PublicKey;
  } else {
    fromTokenAccount = await findAssociatedTokenAddress(wallet, fromMint);
  }
  const toTokenAccount = await findAssociatedTokenAddress(wallet, toMint);
  tx.add(await createATAWithoutCheckIx(wallet, toMint, wallet));
  if (fromMint.toString() === NATIVE_MINT.toString()) {
    tx.add(await wrapNative(amountIn, wallet));
    cleanUpTx.add(
      Token.createCloseAccountInstruction(
      fromTokenAccount,
      wallet,
      wallet,
      [],
      ),
    );
  }
  if (toMint.toString() === NATIVE_MINT.toString()) {
    cleanUpTx.add(
      Token.createCloseAccountInstruction(
      toTokenAccount,
      wallet,
      wallet,
      [],
      ),
    );
  }
  const serumMarket = await Market.load(
    connection,
    pool.serumMarket,
    undefined,
    pool.serumProgramId,
  );
  let programId = PublicKey.default;
  if (pool.version === 3) {
    programId = LIQUIDITY_POOL_PROGRAM_ID_V3;
  } else if (pool.version === 4) {
    programId = LIQUIDITY_POOL_PROGRAM_ID_V4;
  }
  const serumVaultSigner = await PublicKey.createProgramAddress(
    [
      serumMarket.address.toBuffer(),
      serumMarket.decoded.vaultSignerNonce.toArrayLike(Buffer, "le", 8),
    ],
    serumMarket.programId,
  );
  const swapIxs = ixs.swapInstruction(
    programId,
    pool.infoPubkey,
    AMM_AUTHORITY,
    pool.ammOpenOrders,
    pool.ammTargetOrders,
    pool.poolCoinTokenAccount,
    pool.poolPcTokenAccount,
    pool.serumProgramId,
    pool.serumMarket,
    serumMarket.bidsAddress,
    serumMarket.asksAddress,
    new PublicKey(serumMarket.decoded.eventQueue),
    new PublicKey(serumMarket.decoded.baseVault),
    new PublicKey(serumMarket.decoded.quoteVault),
    serumVaultSigner,
    fromTokenAccount,
    toTokenAccount,
    wallet,
    amountIn,
    minAmountOut,
  );
  tx.add(swapIxs);
  tx.add(cleanUpTx);
  return tx;
}
