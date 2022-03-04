import BN from "bn.js";
import { NATIVE_MINT } from "@solana/spl-token";
import * as Token from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import * as ins from "./instructions";
import {
  SwapInfo,
  WrapInfo,
  FarmInfo,
  getMinerKey,
  minerCreated,
} from "./infos";
import { IOU_TOKEN_MINT, SABER_TOKEN_MINT } from "./ids";
import {
  checkTokenAccount,
  createATAWithoutCheckIx,
  findAssociatedTokenAddress,
  wrapNative,
} from "../utils";

export async function createDepositTx(
  swapInfo: SwapInfo,
  AtokenAmount: BN,
  BtokenAmount: BN,
  minimalRecieve: BN,
  wallet: PublicKey,
  connection: Connection
) {
  const tx: Transaction = new Transaction();
  const cleanupTx = new Transaction();
  // check if Token A source account is created
  const AtokenSourceAccount = await findAssociatedTokenAddress(
    wallet,
    swapInfo.mintA
  );
  const createAtokenAccount = await createATAWithoutCheckIx(
    wallet,
    swapInfo.mintA
  );
  tx.add(createAtokenAccount);

  // check if Token B source account is created
  const BtokenSourceAccount = await findAssociatedTokenAddress(
    wallet,
    swapInfo.mintB
  );
  const createBtokenAccount = await createATAWithoutCheckIx(
    wallet,
    swapInfo.mintB
  );
  tx.add(createBtokenAccount);

  // check if LP Token account is created
  const LPtokenAccount = await findAssociatedTokenAddress(
    wallet,
    swapInfo.poolMint
  );

  // if false add a create IX
  const createLPtokenAccount = await await createATAWithoutCheckIx(
    wallet,
    swapInfo.poolMint
  );
  tx.add(createLPtokenAccount);

  // check Token A is wSol
  if (swapInfo.mintA.toString() === NATIVE_MINT.toString()) {
    // if true add a wrapNative IX
    const wrapNativeIns = await wrapNative(AtokenAmount, wallet);
    cleanupTx.add(
      Token.createCloseAccountInstruction(
        AtokenSourceAccount,
        wallet,
        wallet,
        []
      )
    );
    tx.add(wrapNativeIns);
  }

  // check Token A is wSol
  if (swapInfo.mintB.toString() === NATIVE_MINT.toString()) {
    // if true add a wrapNative IX
    const wrapNativeIns = await wrapNative(BtokenAmount, wallet);
    cleanupTx.add(
      Token.createCloseAccountInstruction(
        BtokenSourceAccount,
        wallet,
        wallet,
        []
      )
    );
    tx.add(wrapNativeIns);
  }

  // if Token A is wrapped
  if (swapInfo.mintAWrapped) {
    // check underlying tokan account is created
    const wrapMintAtokenAddress = await findAssociatedTokenAddress(
      wallet,
      swapInfo.mintAWrapInfo?.underlyingWrappedTokenMint as PublicKey
    );
    const createAtokenAccount = await createATAWithoutCheckIx(
      wallet,
      swapInfo.mintAWrapInfo?.underlyingWrappedTokenMint as PublicKey
    );
    tx.add(createAtokenAccount);

    const multiplyer = new BN(swapInfo.mintAWrapInfo?.multiplyer as BN);
    const wrapAIns = ins.wrapToken(
      swapInfo.mintAWrapInfo as WrapInfo,
      wallet,
      AtokenAmount.div(multiplyer),
      wrapMintAtokenAddress,
      AtokenSourceAccount
    );

    tx.add(wrapAIns);
  }

  // if Token B is wrapped
  if (swapInfo.mintBWrapped === true) {
    // check underlying tokan account is created
    const wrapMintBtokenAddress = await findAssociatedTokenAddress(
      wallet,
      swapInfo.mintBWrapInfo?.underlyingWrappedTokenMint as PublicKey
    );

    const createBtokenAccount = await createATAWithoutCheckIx(
      wallet,
      swapInfo.mintBWrapInfo?.underlyingWrappedTokenMint as PublicKey
    );
    tx.add(createBtokenAccount);

    const multiplyer = new BN(swapInfo.mintBWrapInfo?.multiplyer as BN);
    const wrapBIns = ins.wrapToken(
      swapInfo.mintBWrapInfo as WrapInfo,
      wallet,
      BtokenAmount.div(multiplyer),
      wrapMintBtokenAddress,
      BtokenSourceAccount
    );

    tx.add(wrapBIns);
  }

  const depositIns = ins.deposit(
    swapInfo,
    AtokenAmount,
    BtokenAmount,
    minimalRecieve,
    wallet,
    AtokenSourceAccount,
    BtokenSourceAccount,
    LPtokenAccount
  );
  tx.add(depositIns);

  if (swapInfo.isFarming) {
    const farm = swapInfo.farmingInfo as FarmInfo;
    const depositToFarmIns = await depositToFarm(
      farm,
      wallet,
      minimalRecieve,
      connection
    );
    tx.add(depositToFarmIns);
  }

  tx.add(cleanupTx);

  return tx;
}

export async function depositToFarm(
  farm: FarmInfo,
  wallet: PublicKey,
  amount: BN,
  connection: Connection
) {
  const tx = new Transaction();
  const createMinerIx = await createMiner(farm, wallet, connection);
  tx.add(createMinerIx);
  const depositToFarm = await ins.depositToFarmIx(farm, wallet, amount);
  tx.add(depositToFarm);

  return tx;
}

export async function createMiner(
  farm: FarmInfo,
  wallet: PublicKey,
  connection: Connection
) {
  const tx = new Transaction();
  const miner = await getMinerKey(wallet, farm.infoPubkey);
  const minerVault = await findAssociatedTokenAddress(
    miner[0],
    farm.tokenMintKey
  );
  if (!(await minerCreated(wallet, farm, connection))) {
    const createAtaIx = await createATAWithoutCheckIx(
      miner[0],
      farm.tokenMintKey,
      wallet
    );
    tx.add(createAtaIx);
    const createMinerIx = await ins.createMinerAccountIx(
      farm as FarmInfo,
      wallet
    );
    tx.add(createMinerIx);
  }

  return tx;
}

export async function createWithdrawTx(
  swapInfo: SwapInfo,
  tokenType: string,
  farmTokenAmount: BN,
  LPtokenAmount: BN,
  minimalRecieve: BN,
  wallet: PublicKey,
  connection: Connection
) {
  const tx: Transaction = new Transaction();
  const cleanupTx = new Transaction();
  const LPtokenSourceAccount = await findAssociatedTokenAddress(
    wallet,
    swapInfo.poolMint
  );
  let recieveTokenAccountMint = new PublicKey(0);

  if (tokenType === "A") {
    recieveTokenAccountMint = swapInfo.mintA;
  } else if (tokenType === "B") {
    recieveTokenAccountMint = swapInfo.mintB;
  }
  const createLPtokenAccount = await createATAWithoutCheckIx(
    wallet,
    swapInfo.poolMint
  );
  tx.add(createLPtokenAccount);
  const recieveTokenAccount = await findAssociatedTokenAddress(
    wallet,
    recieveTokenAccountMint
  );
  const createrecieveTokenAccount = await createATAWithoutCheckIx(
    wallet,
    recieveTokenAccountMint
  );
  tx.add(createrecieveTokenAccount);

  if (swapInfo.isFarming) {
    const farm = swapInfo.farmingInfo as FarmInfo;
    const withdrawFromfram = await withdrawFromMiner(
      farm,
      wallet,
      farmTokenAmount
    );
    tx.add(withdrawFromfram);
    LPtokenAmount = farmTokenAmount.add(LPtokenAmount);
  }

  if (!LPtokenAmount.eq(new BN(0))) {
    tx.add(
      ins.withdrawOne(
        swapInfo,
        tokenType,
        LPtokenAmount,
        minimalRecieve,
        wallet,
        LPtokenSourceAccount,
        recieveTokenAccount
      )
    );
  }

  if (tokenType === "A" && swapInfo.mintAWrapped) {
    const wrappedmint = swapInfo.mintAWrapInfo
      ?.underlyingWrappedTokenMint as PublicKey;
    const mintAUnderlyingTokenAccount = await findAssociatedTokenAddress(
      wallet,
      wrappedmint
    );

    // if false add a create IX
    const createmMintAUnderlyingTokenIx = await await createATAWithoutCheckIx(
      wallet,
      wrappedmint
    );
    tx.add(createmMintAUnderlyingTokenIx);

    tx.add(
      ins.unwrapToken(
        swapInfo.mintAWrapInfo as WrapInfo,
        wallet,
        recieveTokenAccount,
        mintAUnderlyingTokenAccount
      )
    );
  } else if (tokenType === "B" && swapInfo.mintBWrapped) {
    const wrappedmint = swapInfo.mintBWrapInfo
      ?.underlyingWrappedTokenMint as PublicKey;
    const mintBUnderlyingTokenAccount = await findAssociatedTokenAddress(
      wallet,
      wrappedmint
    );
    const mintBUnderlyingTokenAccountCreated = await checkTokenAccount(
      mintBUnderlyingTokenAccount,
      connection
    );

    if (!mintBUnderlyingTokenAccountCreated) {
      // if false add a create IX
      const createMintBUnderlyingTokenAccount = await createATAWithoutCheckIx(
        wallet,
        wrappedmint
      );
      tx.add(createMintBUnderlyingTokenAccount);
    }
    tx.add(
      ins.unwrapToken(
        swapInfo.mintBWrapInfo as WrapInfo,
        wallet,
        recieveTokenAccount,
        mintBUnderlyingTokenAccount
      )
    );
  }

  if (recieveTokenAccountMint.toString() === NATIVE_MINT.toString()) {
    cleanupTx.add(
      Token.createCloseAccountInstruction(
        recieveTokenAccount,
        wallet,
        wallet,
        []
      )
    );
  }
  tx.add(cleanupTx);

  return tx;
}

export async function withdrawFromMiner(
  farm: FarmInfo,
  wallet: PublicKey,
  amount: BN
): Promise<Transaction> {
  const tx = new Transaction();

  if (!amount.eq(new BN(0))) {
    tx.add(await createATAWithoutCheckIx(wallet, farm.tokenMintKey));

    const withdrawFromFarmIns = await ins.withdrawFromFarmIx(
      farm,
      wallet,
      amount
    );
    tx.add(withdrawFromFarmIns);
  }

  return tx;
}

export async function claimRewardTx(
  farm: FarmInfo,
  wallet: PublicKey,
  conn: Connection
): Promise<Transaction> {
  const tx = new Transaction();
  const createMinerIx = await createMiner(farm, wallet, conn);
  tx.add(createMinerIx);
  const iouTokenAccount = await findAssociatedTokenAddress(
    wallet,
    IOU_TOKEN_MINT
  );
  tx.add(await createATAWithoutCheckIx(wallet, IOU_TOKEN_MINT));

  const sbrTokenAccount = await findAssociatedTokenAddress(
    wallet,
    SABER_TOKEN_MINT
  );
  tx.add(await createATAWithoutCheckIx(wallet, SABER_TOKEN_MINT));

  tx.add(await ins.claimReward(farm, wallet));
  tx.add(
    Token.createCloseAccountInstruction(iouTokenAccount, wallet, wallet, [])
  );
  return tx;
}
