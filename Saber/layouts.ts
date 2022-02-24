import { publicKey, struct, u64, u128, u8, u16, i64, bool } from "@project-serum/borsh";

export const FARM_LAYOUT = struct([
  publicKey("rewarderKey"),
  publicKey("tokenMintKey"),
  u8("bump"),
  u16("index"),
  u8("tokenMintDecimals"),
  i64("famineTs"),
  i64("lastUpdateTs"),
  u128("rewardsPerTokenStored"),
  u64("annualRewardsRate"),
  u64("rewardsShare"),
  u64("totalTokensDeposited"),
  u64("numMiners"),
]);

export const MINER_LAYOUT = struct([
  publicKey("farmKey"),
  publicKey("owner"),
  u8("bump"),
  publicKey("vault"),
  u64("rewardsEarned"),
  u128("rewardsPerTokenPaid"),
  u64("balance"),
  u64("index"),
]);

export const SWAPINFO_LAYOUT = struct([
  bool("isInitialized"),
  bool("isPaused"),
  u8("nonce"),
  u64("initialAmpFactor"),
  u64("targetAmpFactor"),
  i64("startRampTs"),
  i64("stopRampTs"),
  i64("futureAdminDeadline"),
  publicKey("futureAdminKey"),
  publicKey("adminKey"),
  publicKey("tokenAccountA"),
  publicKey("tokenAccountB"),
  publicKey("poolMint"),
  publicKey("mintA"),
  publicKey("mintB"),
  publicKey("adminFeeAccountA"),
  publicKey("adminFeeAccountB"),
]);

export const WRAPINFO_LAYOUT = struct([
  u8("decimal"),
  u64("multiplyer"),
  publicKey("underlyingWrappedTokenMint"),
  publicKey("underlyingTokenAccount"),
  publicKey("wrappedTokenMint"),
]);

export const DEPOSIT_LAYPOUT = struct([
  u8('instruction'),
  u64('AtokenAmount'),
  u64('BtokenAmount'),
  u64('minimalRecieve'),
]);

export const WITHDRAW_LAYOUT = struct([
  u8('instruction'),
  u64('LPtokenAmount'),
  u64('minimalRecieve'),
]);

export const WRAP_LAYOUT = struct([
  u64('amount'),
]);

export const UNWRAP_LAYOUT = struct([
  u64('amount'),
]);

export const DEPOSIT_TO_FARM_LAYOUT = struct([
  u64('amount'),
]);

export const CREATE_MINER_LAYOUT = struct([
  u64('amount'),
]);

export const WITHDRAW_FROM_FARM_LAYOUT = struct([
  u64('amount'),
]);
