import {
  Connection,
  MemcmpFilter,
  GetProgramAccountsConfig,
  DataSizeFilter,
  PublicKey,
} from "@solana/web3.js";
import {
  ADMIN_KEY,
  DEPRECATED_POOLS,
  SABER_QUARRY_REWARDER,
  SWAP_PROGRAM_ID,
} from "./ids";
import {
  SwapInfo,
  checkWrapped,
  getAllWrap,
  parseSwapInfoData,
  checkFarming,
  getAllFarms,
} from "./infos";

export { FarmInfo, getAllMiners, defaultMiner } from "./infos";
export { claimRewardTx, createDepositTx, depositToFarm } from "./transactions";

export async function getAllSwaps(conn: Connection): Promise<SwapInfo[]> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 75,
      bytes: ADMIN_KEY.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 395,
  };
  const filters = [sizeFilter];
  const config: GetProgramAccountsConfig = { filters };
  const allSaberAccount = await conn.getProgramAccounts(
    SWAP_PROGRAM_ID,
    config
  );
  const infoArray: SwapInfo[] = [];
  const wrapInfoArray = await getAllWrap(conn);
  const allFarmInfo = await getAllFarms(conn, SABER_QUARRY_REWARDER);

  for (const account of allSaberAccount) {
    if (DEPRECATED_POOLS.includes(account.pubkey)) {
      continue;
    }
    const saberAccountInfo = await parseSwapInfoData(
      account.account.data,
      account.pubkey
    );
    if (saberAccountInfo.isPaused) {
      continue;
    }
    const mintAwrapped = await checkWrapped(
      saberAccountInfo.mintA,
      wrapInfoArray
    );
    saberAccountInfo.mintAWrapped = mintAwrapped[0];
    if (mintAwrapped[0]) {
      saberAccountInfo.mintAWrapInfo = mintAwrapped[1];
    }
    const mintBwrapped = await checkWrapped(
      saberAccountInfo.mintB,
      wrapInfoArray
    );
    saberAccountInfo.mintBWrapped = mintBwrapped[0];
    if (mintBwrapped[0]) {
      saberAccountInfo.mintBWrapInfo = mintBwrapped[1];
    }
    const farmStarted = checkFarming(allFarmInfo, saberAccountInfo.poolMint);
    if (farmStarted[0]) {
      saberAccountInfo.isFarming = true;
      saberAccountInfo.farmingInfo = farmStarted[1];
    }
    infoArray.push(saberAccountInfo);
  }
  return infoArray;
}

export async function getSwap(
  connection: Connection,
  swap: PublicKey
): Promise<SwapInfo> {
  const adminIdMemcmp: MemcmpFilter = {
    memcmp: {
      offset: 75,
      bytes: ADMIN_KEY.toString(),
    },
  };
  const sizeFilter: DataSizeFilter = {
    dataSize: 395,
  };
  const filters = [adminIdMemcmp, sizeFilter];

  const wrapInfoArray = await getAllWrap(connection);
  const allFarmInfo = await getAllFarms(connection, SABER_QUARRY_REWARDER);
  const saberAccount: any = await connection.getAccountInfo(swap);
  const saberAccountInfo = await parseSwapInfoData(saberAccount.data, swap);
  const mintAwrapped = await checkWrapped(
    saberAccountInfo.mintA,
    wrapInfoArray
  );

  saberAccountInfo.mintAWrapped = mintAwrapped[0];
  if (mintAwrapped[0]) {
    saberAccountInfo.mintAWrapInfo = mintAwrapped[1];
  }
  const mintBwrapped = await checkWrapped(
    saberAccountInfo.mintB,
    wrapInfoArray
  );
  saberAccountInfo.mintBWrapped = mintBwrapped[0];
  if (mintBwrapped[0]) {
    saberAccountInfo.mintBWrapInfo = mintBwrapped[1];
  }
  const farmStarted = checkFarming(allFarmInfo, saberAccountInfo.poolMint);
  if (farmStarted[0]) {
    saberAccountInfo.isFarming = true;
    saberAccountInfo.farmingInfo = farmStarted[1];
  }
  saberAccountInfo.infoPublicKey = swap;

  return saberAccountInfo;
}
