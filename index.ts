import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import * as saber from "./Saber";
import * as ray from "./Raydium";
import BN from "bn.js";
import * as util from "./util";

const keyPairPath = os.homedir() + "/.config/solana/id.json";
const PrivateKey = JSON.parse(fs.readFileSync(keyPairPath, "utf-8"));
let privateKey = Uint8Array.from(PrivateKey);
const wallet = Keypair.fromSecretKey(privateKey);
const walletPublicKey = wallet.publicKey;
async function main() {
  const connection = new Connection("https://rpc-mainnet-fork.dappio.xyz", { wsEndpoint: "wss://rpc-mainnet-fork.dappio.xyz/ws", commitment: "processed", });
  //const connection = new Connection("https://solana-api.tt-prod.net", { commitment: "processed", });
  let ammId = new PublicKey("5cmAS6Mj4pG2Vp9hhyu3kpK9yvC7P6ejh9HiobpTE6Jc");
  let swaps = await saber.getAllSwap(connection)
  let miners = await saber.getAllMiner(connection, walletPublicKey)
  let sbrAmm = (await ray.getAmmPool(ammId, connection));
  sbrAmm = await sbrAmm.updatePoolAmount(connection);
  //Claim All mining rewards
  for (let miner of miners) {
    for (let swap of swaps) {
      if (miner.farmKey.toString() == swap.farmingInfo?.infoPubkey.toString()) {
        if (miner.balance.toNumber() > 0) {
          let claimRewardTx = await saber.claimRewardTx(swap.farmingInfo as saber.FarmInfo, walletPublicKey, connection)
          let result = await util.signAndSendAll(claimRewardTx, connection, wallet)
          console.log(miner.getUnclaimedRewards(swap), "SBR Reward Claimed\nTX:", result);
        }
      }
    }
  }


  let tokenAccounts = await util.getAllTokenAccount(walletPublicKey, connection)
  let swapOutAmount = new BN(0);

  //Swap all SBR to USDC
  for (let token of tokenAccounts) {
    if (token.mint.toString() == "Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1" && token.amount.cmpn(0)) {
      swapOutAmount = await (await sbrAmm.calculateSwapOutAmount("coin", token.amount, connection)).divn(0.98);
      if (!swapOutAmount.cmpn(1)) {
        break;
      }
      let swapIx = await ray.swap(sbrAmm, token.mint, sbrAmm.pcMintAddress, walletPublicKey, token.amount, new BN(0), connection)
      let result = await util.signAndSendAll(swapIx, connection, wallet)
      
      console.log(token.amount.toNumber() / 1000000, "SBR swapped\nTX:", result);
    }
  }

  //Add all USDC swapped out to USDC-UST pool
  for (let swap of swaps) {
    if (swap.infoPublicKey.toString() == "KwnjUuZhTMTSGAaavkLEmSyfobY16JNH4poL9oeeEvE") {
      let addLP = await saber.createDepositTx(swap, new BN(0), swapOutAmount, new BN(0), walletPublicKey, connection)
      let result = await util.signAndSendAll(addLP, connection, wallet)
      console.log("LP reinvested\nTX:", result);
    }
  }

  //Deposit all LP to farming
  tokenAccounts = await util.getAllTokenAccount(walletPublicKey, connection)
  for (let swap of swaps) {
    for (let token of tokenAccounts) {
      if (token.mint.toString() == swap.poolMint.toString() && token.amount.cmpn(0)) {
        let farmIx = await saber.depositToFarm(swap.farmingInfo as saber.FarmInfo, walletPublicKey, token.amount, connection)
        let result = await util.signAndSendAll(farmIx, connection, wallet)
        console.log("Farm Deposited\nTX:", result);
      }
    }
  }

}


async function tryCatch() {
  try {
    main();
  }
  catch {
    console.log("Error");
  }
}
tryCatch();
//setInterval(tryCatch, 1000 * 60 * 10);
