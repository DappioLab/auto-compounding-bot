import {
  Connection,
  Keypair,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import * as saber from "./saber";
import * as raydium from "./raydium";
import BN from "bn.js";
import * as utils from "./utils";
import { SBR_AMM_ID } from "./raydium/ids";
import { SBR_MINT, USDC_UST_POOL } from "./saber/ids";

// Load keypair
const keyPairPath = `${os.homedir()}/.config/solana/id.json`;
const privateKeyUint8Array = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
const privateKey = Uint8Array.from(privateKeyUint8Array);
const wallet = Keypair.fromSecretKey(privateKey);

async function main() {
  const conn = new Connection("https://rpc-mainnet-fork.dappio.xyz", { wsEndpoint: "wss://rpc-mainnet-fork.dappio.xyz/ws", commitment: "processed", });
  // const connection = new Connection("https://solana-api.tt-prod.net", { commitment: "processed", });
  console.log("Fetching All Saber SwapInfos...");
  const swaps = await saber.getAllSwaps(conn);
  console.log("Fetching All Saber Miners...");
  const miners = await saber.getAllMiners(conn, wallet.publicKey);
  console.log("Fetching Saber AMM Pool on Raydium...");
  const sbrAmm = (await raydium.getAmmPool(SBR_AMM_ID, conn));

  // Claim All mining rewards
  console.log("Claiming All mining rewards...")
  for (const miner of miners) {
    for (const swap of swaps) {
      if (miner.farmKey.toString() === swap.farmingInfo?.infoPubkey.toString()) {
        if (miner.balance.toNumber() > 0) {
          // Create claimRewardTx
          const claimRewardTx = await saber.claimRewardTx(swap.farmingInfo as saber.FarmInfo, wallet.publicKey, conn)
          // Send Tx
          const result = await utils.signAndSendAll(claimRewardTx, conn, wallet)
          console.log(miner.getUnclaimedRewards(swap), "SBR Reward Claimed. Tx:", result);
        }
      }
    }
  }

  let tokenAccounts = await utils.getAllTokenAccount(wallet.publicKey, conn);
  let swapOutAmount = new BN(0);

  // Swap all SBR to USDC
  console.log("Swapping all SBR to USDC...")
  for (const token of tokenAccounts) {
    if (token.mint === SBR_MINT && token.amount.cmpn(0)) {
      swapOutAmount = await (await sbrAmm.calculateSwapOutAmount("coin", token.amount, conn)).divn(0.98);
      if (!swapOutAmount.cmpn(1)) {
        break;
      }
      const swapIx = await raydium.swap(sbrAmm, token.mint, sbrAmm.pcMintAddress, wallet.publicKey, token.amount, new BN(0), conn);
      const result = await utils.signAndSendAll(swapIx, conn, wallet);
      console.log(token.amount.toNumber() / 1000000, "SBR swapped. Tx:", result);
    }
  }

  // Add all USDC swapped out to USDC-UST pool
  console.log("Adding all USDC swapped out to USDC-UST pool...")
  for (const swap of swaps) {
    if (swap.infoPublicKey === USDC_UST_POOL) {
      const addLP = await saber.createDepositTx(swap, new BN(0), swapOutAmount, new BN(0), wallet.publicKey, conn)
      const result = await utils.signAndSendAll(addLP, conn, wallet)
      console.log("LP reinvested. Tx:", result);
    }
  }

  // Deposit all LP to farming
  console.log("Depositing all LP to farming...")
  tokenAccounts = await utils.getAllTokenAccount(wallet.publicKey, conn)
  for (const swap of swaps) {
    for (const token of tokenAccounts) {
      if (token.mint.toString() === swap.poolMint.toString() && token.amount.cmpn(0)) {
        // Create farmIx
        const farmIx = await saber.depositToFarm(swap.farmingInfo as saber.FarmInfo, wallet.publicKey, token.amount, conn)
        // Send Tx
        const result = await utils.signAndSendAll(farmIx, conn, wallet)
        console.log("Farm Deposited. Tx:", result);
      }
    }
  }
}

async function run() {
  try {
    main();
  }
  catch (e) {
    console.error(e);
  }
}

run();
