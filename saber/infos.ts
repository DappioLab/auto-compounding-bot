import BN from "bn.js";
import {
  Connection,
  PublicKey,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
} from "@solana/web3.js";
import {
  QURARRY_MINE_PROGRAM_ID,
  SABER_WRAP_PROGRAM_ID,
  SWAP_PROGRAM_ID,
} from "./ids";
import {
  FARM_LAYOUT,
  MINER_LAYOUT,
  SWAPINFO_LAYOUT,
  WRAPINFO_LAYOUT,
} from "./layouts";
import { getTokenAccountAmount, getTokenSupply } from "../utils";

export class FarmInfo {
  infoPubkey: PublicKey;
  rewarderKey: PublicKey;
  tokenMintKey: PublicKey;
  bump: BN;
  index: BN;
  tokenMintDecimals: BN;
  famineTs: BN;
  lastUpdateTs: BN;
  rewardsPerTokenStored: BN;
  annualRewardsRate: BN;
  rewardsShare: BN;
  totalTokensDeposited: BN;
  numMiners: BN;
  constructor(
    infoPubkey: PublicKey,
    rewarderKey: PublicKey,
    tokenMintKey: PublicKey,
    bump: BN,
    index: BN,
    tokenMintDecimals: BN,
    famineTs: BN,
    lastUpdateTs: BN,
    rewardsPerTokenStored: BN,
    annualRewardsRate: BN,
    rewardsShare: BN,
    totalTokensDeposited: BN,
    numMiners: BN
  ) {
    this.infoPubkey = infoPubkey;
    this.rewarderKey = rewarderKey;
    this.tokenMintKey = tokenMintKey;
    this.bump = bump;
    this.index = index;
    this.tokenMintDecimals = tokenMintDecimals;
    this.famineTs = famineTs;
    this.lastUpdateTs = lastUpdateTs;
    this.rewardsPerTokenStored = rewardsPerTokenStored;
    this.annualRewardsRate = annualRewardsRate;
    this.rewardsShare = rewardsShare;
    this.totalTokensDeposited = totalTokensDeposited;
    this.numMiners = numMiners;
  }
}

export function parseFarmInfo(data: any, farmPubkey: PublicKey): FarmInfo {
  const dataBuffer = data as Buffer;
  const infoData = dataBuffer.slice(8);
  const newFarmInfo = FARM_LAYOUT.decode(infoData);
  const {
    rewarderKey,
    tokenMintKey,
    bump,
    index,
    tokenMintDecimals,
    famineTs,
    lastUpdateTs,
    rewardsPerTokenStored,
    annualRewardsRate,
    rewardsShare,
    totalTokensDeposited,
    numMiners,
  } = newFarmInfo;
  return new FarmInfo(
    farmPubkey,
    rewarderKey,
    tokenMintKey,
    new BN(bump),
    new BN(index),
    new BN(tokenMintDecimals),
    new BN(famineTs),
    new BN(lastUpdateTs),
    new BN(rewardsPerTokenStored),
    new BN(annualRewardsRate),
    new BN(rewardsShare),
    new BN(totalTokensDeposited),
    new BN(numMiners)
  );
}

export async function getAllFarms(
  connection: Connection,
  rewarderKey: PublicKey
): Promise<FarmInfo[]> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 8,
      bytes: rewarderKey.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 140,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters };
  const allFarmAccount = await connection.getProgramAccounts(
    QURARRY_MINE_PROGRAM_ID,
    config
  );
  const allFarmInfo: FarmInfo[] = [];
  for (const account of allFarmAccount) {
    const currentFarmInfo = parseFarmInfo(account.account.data, account.pubkey);
    allFarmInfo.push(currentFarmInfo);
  }
  return allFarmInfo;
}
export function checkFarming(
  allFarmInfo: FarmInfo[],
  mintPubkey: PublicKey
): [boolean, FarmInfo] {
  for (const info of allFarmInfo) {
    if (info.tokenMintKey.toString() === mintPubkey.toString()) {
      return [true, info];
    }
  }
  return [false, defaultFarm()];
}

export function defaultFarm(): FarmInfo {
  return new FarmInfo(
    PublicKey.default,
    PublicKey.default,
    PublicKey.default,
    new BN(0),
    new BN(0),
    new BN(0),
    new BN(0),
    new BN(0),
    new BN(0),
    new BN(0),
    new BN(0),
    new BN(0),
    new BN(0)
  );
}

export async function getMinerKey(
  wallet: PublicKey,
  farmPubkey: PublicKey
): Promise<[PublicKey, number]> {
  const minerBytes = new Uint8Array(Buffer.from("Miner", "utf-8"));
  const miner = await PublicKey.findProgramAddress(
    [minerBytes, farmPubkey.toBuffer(), wallet.toBuffer()],
    QURARRY_MINE_PROGRAM_ID
  );
  return miner;
}

export async function minerCreated(
  wallet: PublicKey,
  info: FarmInfo,
  connection: Connection
): Promise<boolean> {
  const miner = await getMinerKey(wallet, info.infoPubkey);
  const minerAccountInfo = await connection.getAccountInfo(miner[0]);

  if (
    minerAccountInfo?.owner.toString() === QURARRY_MINE_PROGRAM_ID.toString()
  ) {
    return true;
  }
  return false;
}

export class MinerInfo {
  infoPubkey: PublicKey;
  farmKey: PublicKey;
  owner: PublicKey;
  bump: BN;
  vault: PublicKey;
  rewardsEarned: BN;
  rewardsPerTokenPaid: BN;
  balance: BN;
  index: BN;
  constructor(
    infoPubkey: PublicKey,
    farmKey: PublicKey,
    owner: PublicKey,
    bump: BN,
    vault: PublicKey,
    rewardsEarned: BN,
    rewardsPerTokenPaid: BN,
    balance: BN,
    index: BN
  ) {
    this.infoPubkey = infoPubkey;
    this.farmKey = farmKey;
    this.owner = owner;
    this.bump = bump;
    this.index = index;
    this.vault = vault;
    this.rewardsEarned = rewardsEarned;
    this.rewardsPerTokenPaid = rewardsPerTokenPaid;
    this.balance = balance;
  }

  getUnclaimedRewards(swapInfo: SwapInfo) {
    if (
      swapInfo.farmingInfo?.infoPubkey.toString() === this.farmKey.toString()
    ) {
      const unClaim =
        this.balance
          .mul(
            swapInfo.farmingInfo.rewardsPerTokenStored.sub(
              this.rewardsPerTokenPaid
            )
          )
          .div(new BN([255, 255, 255, 255, 255, 255, 255, 255]))
          .add(this.rewardsEarned)
          .toNumber() / Math.pow(10, 6);
      return unClaim;
    } else {
      return 0;
    }
  }
}

export function parseMinerInfo(data: any, miner: PublicKey): MinerInfo {
  const dataBuffer = data as Buffer;
  const infoData = dataBuffer.slice(8);
  const newMinerInfo = MINER_LAYOUT.decode(infoData);
  const {
    infoPubkey,
    farmKey,
    owner,
    bump,
    vault,
    rewardsEarned,
    rewardsPerTokenPaid,
    balance,
    index,
  } = newMinerInfo;
  return new MinerInfo(
    infoPubkey,
    farmKey,
    owner,
    new BN(bump),
    vault,
    new BN(rewardsEarned),
    new BN(rewardsPerTokenPaid),
    new BN(balance),
    new BN(index)
  );
}

export async function getAllMiners(
  connection: Connection,
  wallet: PublicKey
): Promise<MinerInfo[]> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 8 + 32,
      bytes: wallet.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 145,
  };
  const filters = [adminIdMemcmp, sizeFilter];
  const config: GetProgramAccountsConfig = { filters };
  const allMinerAccount = await connection.getProgramAccounts(
    QURARRY_MINE_PROGRAM_ID,
    config
  );
  const allMinerInfo: MinerInfo[] = [];
  for (const account of allMinerAccount) {
    const currentFarmInfo = parseMinerInfo(
      account.account.data,
      account.pubkey
    );
    if (currentFarmInfo.balance === new BN(0)) {
      continue;
    }
    allMinerInfo.push(currentFarmInfo);
  }
  return allMinerInfo;
}

export const defaultMiner = new MinerInfo(
  PublicKey.default,
  PublicKey.default,
  PublicKey.default,
  new BN(0),
  PublicKey.default,
  new BN(0),
  new BN(0),
  new BN(0),
  new BN(0)
);

export interface SwapInfo {
  infoPublicKey: PublicKey;
  isInitialized: boolean;
  isPaused: boolean;
  nonce: BN;
  initialAmpFactor: BN;
  targetAmpFactor: BN;
  startRampTs: BN;
  stopRampTs: BN;
  futureAdminDeadline: BN;
  futureAdminKey: PublicKey;
  adminKey: PublicKey;
  tokenAccountA: PublicKey;
  tokenAccountB: PublicKey;
  AtokenAccountAmount?: BN;
  BtokenAccountAmount?: BN;
  poolMint: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  adminFeeAccountA: PublicKey;
  adminFeeAccountB: PublicKey;
}

export class SwapInfo implements SwapInfo {
  infoPublicKey: PublicKey;
  authority: PublicKey;
  isInitialized: boolean;
  isPaused: boolean;
  nonce: BN;
  initialAmpFactor: BN;
  targetAmpFactor: BN;
  startRampTs: BN;
  stopRampTs: BN;
  futureAdminDeadline: BN;
  futureAdminKey: PublicKey;
  adminKey: PublicKey;
  tokenAccountA: PublicKey;
  tokenAccountB: PublicKey;
  poolMint: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  adminFeeAccountA: PublicKey;
  adminFeeAccountB: PublicKey;
  AtokenAccountAmount?: BN;
  BtokenAccountAmount?: BN;
  LPtokenSupply?: BN;
  mintAWrapped?: boolean;
  mintAWrapInfo?: WrapInfo;
  mintBWrapped?: boolean;
  mintBWrapInfo?: WrapInfo;
  isFarming?: boolean;
  farmingInfo?: FarmInfo;
  constructor(
    infoPublicKey: PublicKey,
    authority: PublicKey,
    isInitialized: boolean,
    isPaused: boolean,
    nonce: BN,
    initialAmpFactor: BN,
    targetAmpFactor: BN,
    startRampTs: BN,
    stopRampTs: BN,
    futureAdminDeadline: BN,
    futureAdminKey: PublicKey,
    adminKey: PublicKey,
    tokenAccountA: PublicKey,
    tokenAccountB: PublicKey,
    poolMint: PublicKey,
    mintA: PublicKey,
    mintB: PublicKey,
    adminFeeAccountA: PublicKey,
    adminFeeAccountB: PublicKey
  ) {
    this.infoPublicKey = infoPublicKey;
    this.authority = authority;
    this.isInitialized = isInitialized;
    this.isPaused = isPaused;
    this.nonce = nonce;
    this.initialAmpFactor = initialAmpFactor;
    this.targetAmpFactor = targetAmpFactor;
    this.startRampTs = startRampTs;
    this.stopRampTs = stopRampTs;
    this.futureAdminDeadline = futureAdminDeadline;
    this.futureAdminKey = futureAdminKey;
    this.adminKey = adminKey;
    this.tokenAccountA = tokenAccountA;
    this.tokenAccountB = tokenAccountB;
    this.poolMint = poolMint;
    this.mintA = mintA;
    this.mintB = mintB;
    this.adminFeeAccountA = adminFeeAccountA;
    this.adminFeeAccountB = adminFeeAccountB;
  }

  async updateAmount(connection: Connection) {
    this.AtokenAccountAmount = await getTokenAccountAmount(
      connection,
      this.tokenAccountA
    );
    this.BtokenAccountAmount = await getTokenAccountAmount(
      connection,
      this.tokenAccountB
    );
    this.LPtokenSupply = await getTokenSupply(connection, this.poolMint);
  }
  async calculateDepositRecieve(
    connection: Connection,
    AtokenIn: BN,
    BtokenIN: BN
  ) {
    if (!this.AtokenAccountAmount) {
      await this.updateAmount(connection);
    }
  }
}

export async function parseSwapInfoData(
  data: any,
  pubkey: PublicKey
): Promise<SwapInfo> {
  const decodedData = SWAPINFO_LAYOUT.decode(data);
  const authority = (
    await PublicKey.findProgramAddress([pubkey.toBuffer()], SWAP_PROGRAM_ID)
  )[0];
  const {
    isInitialized,
    isPaused,
    nonce,
    initialAmpFactor,
    targetAmpFactor,
    startRampTs,
    stopRampTs,
    futureAdminDeadline,
    futureAdminKey,
    adminKey,
    tokenAccountA,
    tokenAccountB,
    poolMint,
    mintA,
    mintB,
    adminFeeAccountA,
    adminFeeAccountB,
  } = decodedData;
  const swapInfo = new SwapInfo(
    pubkey,
    authority,
    isInitialized,
    isPaused,
    new BN(nonce),
    new BN(initialAmpFactor),
    new BN(targetAmpFactor),
    new BN(startRampTs),
    new BN(stopRampTs),
    futureAdminDeadline,
    futureAdminKey,
    adminKey,
    tokenAccountA,
    tokenAccountB,
    poolMint,
    mintA,
    mintB,
    adminFeeAccountA,
    adminFeeAccountB
  );
  return swapInfo;
}

export interface WrapInfo {
  wrapAuthority: PublicKey;
  decimal: BN;
  multiplyer: BN;
  underlyingWrappedTokenMint: PublicKey;
  underlyingTokenAccount: PublicKey;
  wrappedTokenMint: PublicKey;
}

export class WrapInfo implements WrapInfo {
  wrapAuthority: PublicKey;
  decimal: BN;
  multiplyer: BN;
  underlyingWrappedTokenMint: PublicKey;
  underlyingTokenAccount: PublicKey;
  wrappedTokenMint: PublicKey;
  constructor(
    wrapAuthority: PublicKey,
    decimal: BN,
    multiplyer: BN,
    underlyingWrappedTokenMint: PublicKey,
    underlyingTokenAccount: PublicKey,
    wrappedTokenMint: PublicKey
  ) {
    this.wrapAuthority = wrapAuthority;
    this.decimal = decimal;
    this.multiplyer = multiplyer;
    this.underlyingWrappedTokenMint = underlyingWrappedTokenMint;
    this.underlyingTokenAccount = underlyingTokenAccount;
    this.wrappedTokenMint = wrappedTokenMint;
  }
}

export function parseWrapInfoData(data: any): WrapInfo {
  const dataBuffer = data as Buffer;
  const cutttedData = dataBuffer.slice(8);
  const decodedData = WRAPINFO_LAYOUT.decode(cutttedData);
  const {
    wrapAuthority,
    decimal,
    multiplyer,
    underlyingWrappedTokenMint,
    underlyingTokenAccount,
    wrappedTokenMint,
  } = decodedData;
  const wrap = new WrapInfo(
    wrapAuthority,
    decimal,
    multiplyer,
    underlyingWrappedTokenMint,
    underlyingTokenAccount,
    wrappedTokenMint
  );
  return wrap;
}

export async function checkWrapped(
  tokenMint: PublicKey,
  wrapInfoArray: WrapInfo[]
): Promise<[boolean, WrapInfo]> {
  for (const info of wrapInfoArray) {
    if (info.wrappedTokenMint.toString() === tokenMint.toString()) {
      return [true, info];
    }
  }
  return [false, defaultWrapInfo()];
}

function defaultWrapInfo(): WrapInfo {
  return new WrapInfo(
    PublicKey.default,
    new BN(0),
    new BN(0),
    PublicKey.default,
    PublicKey.default,
    PublicKey.default
  );
}

export async function getAllWrap(connection: Connection): Promise<WrapInfo[]> {
  const sizeFilter: DataSizeFilter = {
    dataSize: 114,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters };
  const allWrapAccount = await connection.getProgramAccounts(
    SABER_WRAP_PROGRAM_ID,
    config
  );
  const infoArray: WrapInfo[] = [];
  for (const account of allWrapAccount) {
    const wrapAccountInfo = parseWrapInfoData(account.account.data);
    wrapAccountInfo.wrapAuthority = account.pubkey;
    infoArray.push(wrapAccountInfo);
  }
  return infoArray;
}
