import BN from "bn.js";
import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ADD_LIQUIDITY_LAYOUT, REMOVE_LIQUIDITY_LAYOUT, SWAP_LAYOUT } from "./layouts";

export function swapInstruction(
  programId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammTargetOrders: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  // serum
  serumProgramId: PublicKey,
  serumMarket: PublicKey,
  serumBids: PublicKey,
  serumAsks: PublicKey,
  serumEventQueue: PublicKey,
  serumCoinVaultAccount: PublicKey,
  serumPcVaultAccount: PublicKey,
  serumVaultSigner: PublicKey,
  // user
  userSourceTokenAccount: PublicKey,
  userDestTokenAccount: PublicKey,
  userOwner: PublicKey,
  amountIn: BN,
  minAmountOut: BN
): TransactionInstruction {
  const keys = [
    // spl token
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    // amm
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    // serum
    { pubkey: serumProgramId, isSigner: false, isWritable: false },
    { pubkey: serumMarket, isSigner: false, isWritable: true },
    { pubkey: serumBids, isSigner: false, isWritable: true },
    { pubkey: serumAsks, isSigner: false, isWritable: true },
    { pubkey: serumEventQueue, isSigner: false, isWritable: true },
    { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: false },
    { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userDestTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false }
  ]

  const data = Buffer.alloc(SWAP_LAYOUT.span)
  SWAP_LAYOUT.encode(
    {
      instruction: 9,
      amountIn,
      minAmountOut
    },
    data
  )

  return new TransactionInstruction({
    keys,
    programId,
    data
  })
}

export function addLiquidityInstruction(
  programId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammQuantities: PublicKey,
  lpMintAddress: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  // serum
  serumMarket: PublicKey,
  // user
  userCoinTokenAccount: PublicKey,
  userPcTokenAccount: PublicKey,
  userLpTokenAccount: PublicKey,
  userOwner: PublicKey,
  maxCoinAmount: BN,
  maxPcAmount: BN,
  fixedFromCoin: BN
): TransactionInstruction {
  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: false },
    { pubkey: ammQuantities, isSigner: false, isWritable: true },
    { pubkey: lpMintAddress, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: serumMarket, isSigner: false, isWritable: false },
    { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false }
  ]

  const data = Buffer.alloc(ADD_LIQUIDITY_LAYOUT.span)
  ADD_LIQUIDITY_LAYOUT.encode(
    {
      instruction: 3,
      maxCoinAmount,
      maxPcAmount,
      fixedFromCoin
    },
    data
  )

  return new TransactionInstruction({
    keys,
    programId,
    data
  })
}

export function addLiquidityInstructionV4(
  programId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammTargetOrders: PublicKey,
  lpMintAddress: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  // serum
  serumMarket: PublicKey,
  // user
  userCoinTokenAccount: PublicKey,
  userPcTokenAccount: PublicKey,
  userLpTokenAccount: PublicKey,
  userOwner: PublicKey,
  maxCoinAmount: BN,
  maxPcAmount: BN,
  fixedFromCoin: BN
): TransactionInstruction {
  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: false },
    { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: lpMintAddress, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: serumMarket, isSigner: false, isWritable: false },
    { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false }
  ]

  const data = Buffer.alloc(ADD_LIQUIDITY_LAYOUT.span)
  ADD_LIQUIDITY_LAYOUT.encode(
    {
      instruction: 3,
      maxCoinAmount,
      maxPcAmount,
      fixedFromCoin
    },
    data
  )

  return new TransactionInstruction({
    keys,
    programId,
    data
  })
}

export function removeLiquidityInstruction(
  programId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammQuantities: PublicKey,
  lpMintAddress: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  poolWithdrawQueue: PublicKey,
  poolTempLpTokenAccount: PublicKey,
  // serum
  serumProgramId: PublicKey,
  serumMarket: PublicKey,
  serumCoinVaultAccount: PublicKey,
  serumPcVaultAccount: PublicKey,
  serumVaultSigner: PublicKey,
  // user
  userLpTokenAccount: PublicKey,
  userCoinTokenAccount: PublicKey,
  userPcTokenAccount: PublicKey,
  userOwner: PublicKey,
  amount: BN
): TransactionInstruction {
  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammQuantities, isSigner: false, isWritable: true },
    { pubkey: lpMintAddress, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolWithdrawQueue, isSigner: false, isWritable: true },
    { pubkey: poolTempLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: serumProgramId, isSigner: false, isWritable: false },
    { pubkey: serumMarket, isSigner: false, isWritable: true },
    { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: false },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false }
  ]

  const data = Buffer.alloc(REMOVE_LIQUIDITY_LAYOUT.span)
  REMOVE_LIQUIDITY_LAYOUT.encode(
    {
      instruction: 4,
      amount
    },
    data
  )

  return new TransactionInstruction({
    keys,
    programId,
    data
  })
}

export function removeLiquidityInstructionV4(
  programId: PublicKey,
  // amm
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammTargetOrders: PublicKey,
  lpMintAddress: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  poolWithdrawQueue: PublicKey,
  poolTempLpTokenAccount: PublicKey,
  // serum
  serumProgramId: PublicKey,
  serumMarket: PublicKey,
  serumCoinVaultAccount: PublicKey,
  serumPcVaultAccount: PublicKey,
  serumVaultSigner: PublicKey,
  // user
  userLpTokenAccount: PublicKey,
  userCoinTokenAccount: PublicKey,
  userPcTokenAccount: PublicKey,
  userOwner: PublicKey,
  amount: BN
): TransactionInstruction {
  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: lpMintAddress, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolWithdrawQueue, isSigner: false, isWritable: true },
    { pubkey: poolTempLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: serumProgramId, isSigner: false, isWritable: false },
    { pubkey: serumMarket, isSigner: false, isWritable: true },
    { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: false },
    { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userOwner, isSigner: true, isWritable: false }
  ]

  const data = Buffer.alloc(REMOVE_LIQUIDITY_LAYOUT.span)
  REMOVE_LIQUIDITY_LAYOUT.encode(
    {
      instruction: 4,
      amount
    },
    data
  )

  return new TransactionInstruction({
    keys,
    programId,
    data
  })
}
