import BN from "bn.js";
import { OpenOrders } from "@project-serum/serum";
import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
import { parseTokenAccount } from "../utils";
import { AMM_INFO_LAYOUT_V4 } from "./layouts";

export interface LiquidityPoolInfo {
  infoPubkey: PublicKey;
  version: number;
  status: BN;
  nonce: BN;
  orderNum: BN;
  depth: BN;
  coinDecimals: BN;
  pcDecimals: BN;
  state: BN;
  resetFlag: BN;
  minSize: BN;
  volMaxCutRatio: BN;
  amountWaveRatio: BN;
  coinLotSize: BN;
  pcLotSize: BN;
  minPriceMultiplier: BN;
  maxPriceMultiplier: BN;
  needTakePnlCoin: BN;
  needTakePnlPc: BN;
  totalPnlPc: BN;
  totalPnlCoin: BN;
  poolTotalDepositPc: BN;
  poolTotalDepositCoin: BN;
  systemDecimalsValue: BN;
  poolCoinTokenAccount: PublicKey;
  poolPcTokenAccount: PublicKey;
  coinMintAddress: PublicKey;
  pcMintAddress: PublicKey;
  lpMintAddress: PublicKey;
  ammOpenOrders: PublicKey;
  serumMarket: PublicKey;
  serumProgramId: PublicKey;
  ammTargetOrders: PublicKey;
  poolWithdrawQueue: PublicKey;
  poolTempLpTokenAccount: PublicKey;
  ammOwner: PublicKey;
  pnlOwner: PublicKey;
  coinAccountAmount?: BN;
  pcAccountAmount?: BN;
  srmTokenAccount?: PublicKey;
  ammQuantities?: PublicKey;
}

export class PoolInfo implements LiquidityPoolInfo {
  infoPubkey: PublicKey;
  version: number;
  status: BN;
  nonce: BN;
  orderNum: BN;
  depth: BN;
  coinDecimals: BN;
  pcDecimals: BN;
  state: BN;
  resetFlag: BN;
  minSize: BN;
  volMaxCutRatio: BN;
  amountWaveRatio: BN;
  coinLotSize: BN;
  pcLotSize: BN;
  minPriceMultiplier: BN;
  maxPriceMultiplier: BN;
  needTakePnlCoin: BN;
  needTakePnlPc: BN;
  totalPnlPc: BN;
  totalPnlCoin: BN;
  poolTotalDepositPc: BN;
  poolTotalDepositCoin: BN;
  systemDecimalsValue: BN;
  poolCoinTokenAccount: PublicKey;
  poolPcTokenAccount: PublicKey;
  coinMintAddress: PublicKey;
  pcMintAddress: PublicKey;
  lpMintAddress: PublicKey;
  ammOpenOrders: PublicKey;
  serumMarket: PublicKey;
  serumProgramId: PublicKey;
  ammTargetOrders: PublicKey;
  poolWithdrawQueue: PublicKey;
  poolTempLpTokenAccount: PublicKey;
  ammOwner: PublicKey;
  pnlOwner: PublicKey;
  coinAccountAmount?: BN;
  pcAccountAmount?: BN;
  ammOrderbaseTokenTotal?: BN;
  ammOrderquoteTokenTotal?: BN;
  srmTokenAccount?: PublicKey;
  ammQuantities?: PublicKey;
  constructor(
    infoPubkey: PublicKey,
    version: number,
    status: BN,
    nonce: BN,
    orderNum: BN,
    depth: BN,
    coinDecimals: BN,
    pcDecimals: BN,
    state: BN,
    resetFlag: BN,
    minSize: BN,
    volMaxCutRatio: BN,
    amountWaveRatio: BN,
    coinLotSize: BN,
    pcLotSize: BN,
    minPriceMultiplier: BN,
    maxPriceMultiplier: BN,
    needTakePnlCoin: BN,
    needTakePnlPc: BN,
    totalPnlPc: BN,
    totalPnlCoin: BN,
    poolTotalDepositPc: BN,
    poolTotalDepositCoin: BN,
    systemDecimalsValue: BN,
    poolCoinTokenAccount: PublicKey,
    poolPcTokenAccount: PublicKey,
    coinMintAddress: PublicKey,
    pcMintAddress: PublicKey,
    lpMintAddress: PublicKey,
    ammOpenOrders: PublicKey,
    serumMarket: PublicKey,
    serumProgramId: PublicKey,
    ammTargetOrders: PublicKey,
    poolWithdrawQueue: PublicKey,
    poolTempLpTokenAccount: PublicKey,
    ammOwner: PublicKey,
    pnlOwner: PublicKey,
    srmTokenAccount?: PublicKey,
    ammQuantities?: PublicKey,
  ) {
    this.totalPnlPc = totalPnlPc;
    this.totalPnlCoin = totalPnlCoin;
    this.infoPubkey = infoPubkey;
    this.version = version;
    this.status = status;
    this.nonce = nonce;
    this.orderNum = orderNum;
    this.depth = depth;
    this.coinDecimals = coinDecimals;
    this.pcDecimals = pcDecimals;
    this.state = state;
    this.resetFlag = resetFlag;
    this.minSize = minSize;
    this.volMaxCutRatio = volMaxCutRatio;
    this.amountWaveRatio = amountWaveRatio;
    this.coinLotSize = coinLotSize;
    this.pcLotSize = pcLotSize;
    this.minPriceMultiplier = minPriceMultiplier;
    this.maxPriceMultiplier = maxPriceMultiplier;
    this.needTakePnlCoin = needTakePnlCoin;
    this.needTakePnlPc = needTakePnlPc;
    this.poolTotalDepositPc = poolTotalDepositPc;
    this.poolTotalDepositCoin = poolTotalDepositCoin;
    this.systemDecimalsValue = systemDecimalsValue;
    this.poolCoinTokenAccount = poolCoinTokenAccount;
    this.poolPcTokenAccount = poolPcTokenAccount;
    this.coinMintAddress = coinMintAddress;
    this.pcMintAddress = pcMintAddress;
    this.lpMintAddress = lpMintAddress;
    this.ammOpenOrders = ammOpenOrders;
    this.serumMarket = serumMarket;
    this.serumProgramId = serumProgramId;
    this.ammTargetOrders = ammTargetOrders;
    this.ammQuantities = ammQuantities;
    this.poolWithdrawQueue = poolWithdrawQueue;
    this.poolTempLpTokenAccount = poolTempLpTokenAccount;
    this.ammOwner = ammOwner;
    this.pnlOwner = pnlOwner;
    this.srmTokenAccount = srmTokenAccount;
  }
  async calculateSwapOutAmount(fromSide: string, amountIn: BN, connection: Connection) {
    const pool = await this.updatePoolAmount(connection);
    if (fromSide === "coin") {
      const x1 = pool.coinAccountAmount
      ?.add(pool.ammOrderbaseTokenTotal as BN)
      .sub(pool.needTakePnlCoin) as BN;
      const y1 = pool.pcAccountAmount
      ?.add(pool.ammOrderquoteTokenTotal as BN)
      .sub(pool.needTakePnlPc) as BN;
      const k = x1.mul(y1);
      const x2 = x1.add(amountIn);
      const y2 = k.div(x2);
      const amountOut = y1.sub(y2);

      return amountOut;
    } else if (fromSide === "pc") {
      const x1 = pool.pcAccountAmount
      ?.add(pool.ammOrderquoteTokenTotal as BN)
      .sub(pool.needTakePnlPc) as BN;
      const y1 = pool.coinAccountAmount
      ?.add(pool.ammOrderbaseTokenTotal as BN)
      .sub(pool.needTakePnlCoin) as BN;
      const k = x1.mul(y1);
      const x2 = x1.add(amountIn);
      const y2 = k.div(x2);
      const amountOut = y1.sub(y2);

      return amountOut;
    }

    return new BN(0);
  }
  async updatePoolAmount(connection: Connection) {
    const accounts: PublicKey[] = [];
    accounts.push(this.poolPcTokenAccount);
    accounts.push(this.poolCoinTokenAccount);
    accounts.push(this.ammOpenOrders);
    const infos = (await connection.getMultipleAccountsInfo(
      accounts,
    )) as AccountInfo<Buffer>[];

    const pc = parseTokenAccount(
      infos[0].data,
      accounts[0],
    );
    this.pcAccountAmount = pc.amount;
    const coin = parseTokenAccount(
      infos[1].data,
      accounts[1],
    );
    this.coinAccountAmount = coin.amount;
    const ammOrder = OpenOrders.fromAccountInfo(
      accounts[2],
      infos[2],
      this.serumProgramId,
    );
    this.ammOrderquoteTokenTotal = ammOrder.quoteTokenTotal;
    this.ammOrderbaseTokenTotal = ammOrder.baseTokenTotal;
    return this;
  }
}

export function parseV4PoolInfo(data: any, infoPubkey: PublicKey) {
  const poolData = Buffer.from(data);
  const rawPoolData = AMM_INFO_LAYOUT_V4.decode(poolData);
  const {
    status,
    nonce,
    orderNum,
    depth,
    coinDecimals,
    pcDecimals,
    state,
    resetFlag,
    minSize,
    volMaxCutRatio,
    amountWaveRatio,
    coinLotSize,
    pcLotSize,
    minPriceMultiplier,
    maxPriceMultiplier,
    systemDecimalsValue,
    minSeparateNumerator,
    minSeparateDenominator,
    tradeFeeNumerator,
    tradeFeeDenominator,
    pnlNumerator,
    pnlDenominator,
    swapFeeNumerator,
    swapFeeDenominator,
    needTakePnlCoin,
    needTakePnlPc,
    totalPnlPc,
    totalPnlCoin,
    poolTotalDepositPc,
    poolTotalDepositCoin,
    swapCoinInAmount,
    swapPcOutAmount,
    swapCoin2PcFee,
    swapPcInAmount,
    swapCoinOutAmount,
    swapPc2CoinFee,
    poolCoinTokenAccount,
    poolPcTokenAccount,
    coinMintAddress,
    pcMintAddress,
    lpMintAddress,
    ammOpenOrders,
    serumMarket,
    serumProgramId,
    ammTargetOrders,
    poolWithdrawQueue,
    poolTempLpTokenAccount,
    ammOwner,
    pnlOwner,
  } = rawPoolData;
  return new PoolInfo(
    infoPubkey,
    4,
    status,
    nonce,
    orderNum,
    depth,
    coinDecimals,
    pcDecimals,
    state,
    resetFlag,
    minSize,
    volMaxCutRatio,
    amountWaveRatio,
    coinLotSize,
    pcLotSize,
    minPriceMultiplier,
    maxPriceMultiplier,
    needTakePnlCoin,
    needTakePnlPc,
    totalPnlPc,
    totalPnlCoin,
    poolTotalDepositPc,
    poolTotalDepositCoin,
    systemDecimalsValue,
    poolCoinTokenAccount,
    poolPcTokenAccount,
    coinMintAddress,
    pcMintAddress,
    lpMintAddress,
    ammOpenOrders,
    serumMarket,
    serumProgramId,
    ammTargetOrders,
    poolWithdrawQueue,
    poolTempLpTokenAccount,
    ammOwner,
    pnlOwner,
  );
}

export async function updateAllTokenAmount(
  pools: PoolInfo[],
  connection: Connection,
) {
  let accounts: PublicKey[] = [];
  let allAccountInfo: AccountInfo<Buffer>[] = [];
  for (const pool of pools) {
    accounts.push(pool.poolPcTokenAccount);
    accounts.push(pool.poolCoinTokenAccount);
    accounts.push(pool.ammOpenOrders);
    if (accounts.length > 96) {
      const infos = (await connection.getMultipleAccountsInfo(
      accounts,
      )) as AccountInfo<Buffer>[];
      allAccountInfo = allAccountInfo.concat(infos);
      accounts = [];
    }
  }
  const infos = (await connection.getMultipleAccountsInfo(
    accounts,
  )) as AccountInfo<Buffer>[];
  allAccountInfo = allAccountInfo.concat(infos);
  for (let index = 0; index < pools.length; index++) {
    const pc = parseTokenAccount(
      allAccountInfo[index * 3].data,
      pools[index].poolPcTokenAccount,
    );
    pools[index].pcAccountAmount = pc.amount;
    const coin = parseTokenAccount(
      allAccountInfo[index * 3 + 1].data,
      pools[index].poolCoinTokenAccount,
    );
    pools[index].coinAccountAmount = coin.amount;
    const ammOrder = OpenOrders.fromAccountInfo(
      pools[index].ammOpenOrders,
      allAccountInfo[index * 3 + 2],
      pools[index].serumProgramId,
    );
    pools[index].ammOrderquoteTokenTotal = ammOrder.quoteTokenTotal;
    pools[index].ammOrderbaseTokenTotal = ammOrder.baseTokenTotal;
  }
  return pools;
}
