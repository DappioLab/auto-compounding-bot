import { checkTokenAccount, createATAWithoutCheckIx, findAssociatedTokenAddress, wrapNative } from "../util";
import { TOKEN_PROGRAM_ID, NATIVE_MINT, ASSOCIATED_TOKEN_PROGRAM_ID, } from '@solana/spl-token';
import * as Token from "@solana/spl-token"
import BN from "bn.js";
import {
    AccountMeta,
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
    GetProgramAccountsConfig,
    MemcmpFilter,
    DataSizeFilter
} from "@solana/web3.js";
import * as ins from "./instructions"
import { SwapInfo } from "./swapInfoLayout";
import { wrapInfo } from "./wrapInfo";
import { FarmInfo, getMinerKey, minerCreated } from "./farmInfoLayout";
import { IOU_TOKEN_MINT, SABER_TOKEN_MINT } from "./saberInfo";
export async function createDepositTx(swapInfo: SwapInfo, AtokenAmount: BN, BtokenAmount: BN, minimalRecieve: BN, wallet: PublicKey, connection: Connection) {
    let tx: Transaction = new Transaction;
    let cleanupTx = new Transaction;
    // check if Token A source account is created
    let AtokenSourceAccount = await findAssociatedTokenAddress(wallet, swapInfo.mintA);



    let createAtokenAccount = await createATAWithoutCheckIx(wallet, swapInfo.mintA);
    tx.add(createAtokenAccount);

    // check if Token B source account is created
    let BtokenSourceAccount = await findAssociatedTokenAddress(wallet, swapInfo.mintB);
    let createBtokenAccount = await createATAWithoutCheckIx(wallet, swapInfo.mintB);
    tx.add(createBtokenAccount);

    // check if LP Token account is created
    let LPtokenAccount = await findAssociatedTokenAddress(wallet, swapInfo.poolMint);

    //if false add a create IX
    let createLPtokenAccount = await await createATAWithoutCheckIx(wallet, swapInfo.poolMint);
    tx.add(createLPtokenAccount);

    // check Token A is wSol
    if (swapInfo.mintA.toString() == NATIVE_MINT.toString()) {
        // if true add a wrapNative IX
        let wrapNativeIns = await wrapNative(AtokenAmount, wallet, connection, false);
        cleanupTx.add(Token.createCloseAccountInstruction(AtokenSourceAccount, wallet, wallet, []))
        tx.add(wrapNativeIns);
    }
    // check Token A is wSol
    if (swapInfo.mintB.toString() == NATIVE_MINT.toString()) {
        // if true add a wrapNative IX
        let wrapNativeIns = await wrapNative(BtokenAmount, wallet, connection, false);
        cleanupTx.add(Token.createCloseAccountInstruction(BtokenSourceAccount, wallet, wallet, []))
        tx.add(wrapNativeIns);
    }
    // if Token A is wrapped
    if (swapInfo.mintAWrapped) {
        // check underlying tokan account is created
        let wrapMintAtokenAddress = await findAssociatedTokenAddress(wallet, swapInfo.mintAWrapInfo?.underlyingWrappedTokenMint as PublicKey);
        let createAtokenAccount = await createATAWithoutCheckIx(wallet, swapInfo.mintAWrapInfo?.underlyingWrappedTokenMint as PublicKey);
        tx.add(createAtokenAccount);

        let multiplyer = (new BN(swapInfo.mintAWrapInfo?.multiplyer as BN));
        let wrapAIns = ins.wrapToken(swapInfo.mintAWrapInfo as wrapInfo, wallet, AtokenAmount.div(multiplyer), wrapMintAtokenAddress, AtokenSourceAccount);

        tx.add(wrapAIns);
    }
    // if Token B is wrapped
    if (swapInfo.mintBWrapped == true) {
        // check underlying tokan account is created
        let wrapMintBtokenAddress = await findAssociatedTokenAddress(wallet, swapInfo.mintBWrapInfo?.underlyingWrappedTokenMint as PublicKey);

        let createBtokenAccount = await createATAWithoutCheckIx(wallet, swapInfo.mintBWrapInfo?.underlyingWrappedTokenMint as PublicKey);
        tx.add(createBtokenAccount);

        let multiplyer = (new BN(swapInfo.mintBWrapInfo?.multiplyer as BN))
        let wrapBIns = ins.wrapToken(swapInfo.mintBWrapInfo as wrapInfo, wallet, BtokenAmount.div(multiplyer), wrapMintBtokenAddress, BtokenSourceAccount);

        tx.add(wrapBIns);
    }
    //console.log(BtokenAmount);
    let depositIns = ins.deposit(swapInfo, AtokenAmount, BtokenAmount, minimalRecieve, wallet, AtokenSourceAccount, BtokenSourceAccount, LPtokenAccount)
    tx.add(depositIns);
    if (swapInfo.isFarming) {
        let farm = swapInfo.farmingInfo as FarmInfo;
        let depositToFarmIns = await depositToFarm(farm, wallet, minimalRecieve, connection);
        tx.add(depositToFarmIns);
    }

    tx.add(cleanupTx);
    return tx;
}


export async function depositToFarm(farm: FarmInfo, wallet: PublicKey, amount: BN, connection: Connection,) {
    let tx = new Transaction;
    let createMinerIx = await createMiner(farm, wallet, connection);
    tx.add(createMinerIx)
    let depositToFarm = await ins.depositToFarmIx(farm, wallet, amount);
    tx.add(depositToFarm);
    return tx;
}
export async function createMiner(farm: FarmInfo, wallet: PublicKey, connection: Connection) {
    let tx = new Transaction;
    let miner = await getMinerKey(wallet, farm.infoPubkey)
    let minerVault = await findAssociatedTokenAddress(miner[0], farm.tokenMintKey);
    if (!(await minerCreated(wallet, farm, connection))) {

        let createAtaIx = await createATAWithoutCheckIx(wallet, farm.tokenMintKey);
        tx.add(createAtaIx)
        let createMinerIx = await ins.createMinerAccountIx(farm as FarmInfo, wallet);
        tx.add(createMinerIx);
    }
    return tx
}
export async function createWithdrawTx(swapInfo: SwapInfo, tokenType: String, farmTokenAmount: BN, LPtokenAmount: BN, minimalRecieve: BN, wallet: PublicKey, connection: Connection) {
    let tx: Transaction = new Transaction;
    let cleanupTx = new Transaction;
    let LPtokenSourceAccount = await findAssociatedTokenAddress(wallet, swapInfo.poolMint);
    let recieveTokenAccountMint = new PublicKey(0);
    if (tokenType == "A") {
        recieveTokenAccountMint = swapInfo.mintA;
    }
    else if (tokenType == "B") {
        recieveTokenAccountMint = swapInfo.mintB;
    }
    let createLPtokenAccount = await createATAWithoutCheckIx(wallet, swapInfo.poolMint);
    tx.add(createLPtokenAccount);
    let recieveTokenAccount = await findAssociatedTokenAddress(wallet, recieveTokenAccountMint);
    let createrecieveTokenAccount = await createATAWithoutCheckIx(wallet, recieveTokenAccountMint);
    tx.add(createrecieveTokenAccount);

    if (swapInfo.isFarming) {
        let farm = swapInfo.farmingInfo as FarmInfo;
        let withdrawFromfram = await withdrawFromMiner(farm, wallet, farmTokenAmount, connection, false);
        tx.add(withdrawFromfram);
        LPtokenAmount = farmTokenAmount.add(LPtokenAmount);
    }
    if (!LPtokenAmount.eq(new BN(0))) {
        tx.add(ins.withdrawOne(swapInfo, tokenType, LPtokenAmount, minimalRecieve, wallet, LPtokenSourceAccount, recieveTokenAccount));
    }

    if (tokenType == "A" && swapInfo.mintAWrapped) {
        let wrappedmint = swapInfo.mintAWrapInfo?.underlyingWrappedTokenMint as PublicKey;
        let mintAUnderlyingTokenAccount = await findAssociatedTokenAddress(wallet, wrappedmint);

        //if false add a create IX
        let createmMintAUnderlyingTokenIx = await await createATAWithoutCheckIx(wallet, wrappedmint);
        tx.add(createmMintAUnderlyingTokenIx);

        tx.add(ins.unwrapToken(swapInfo.mintAWrapInfo as wrapInfo, wallet, recieveTokenAccount, mintAUnderlyingTokenAccount))
    } else if (tokenType == "B" && swapInfo.mintBWrapped) {
        let wrappedmint = swapInfo.mintBWrapInfo?.underlyingWrappedTokenMint as PublicKey;
        let mintBUnderlyingTokenAccount = await findAssociatedTokenAddress(wallet, wrappedmint);
        let mintBUnderlyingTokenAccountCreated = await checkTokenAccount(mintBUnderlyingTokenAccount, connection)

        if (!mintBUnderlyingTokenAccountCreated) {
            //if false add a create IX
            let createMintBUnderlyingTokenAccount = await createATAWithoutCheckIx(wallet, wrappedmint);
            tx.add(createMintBUnderlyingTokenAccount);
        }
        tx.add(ins.unwrapToken(swapInfo.mintBWrapInfo as wrapInfo, wallet, recieveTokenAccount, mintBUnderlyingTokenAccount))
    }
    if (recieveTokenAccountMint.toString() == NATIVE_MINT.toString()) {
        cleanupTx.add(Token.createCloseAccountInstruction(recieveTokenAccount, wallet, wallet, []));
    }
    tx.add(cleanupTx);
    return tx;
}


export async function withdrawFromMiner(farm: FarmInfo, wallet: PublicKey, amount: BN, connection: Connection, createLPaccount: boolean = true) {
    let tx = new Transaction
    let withdrawTokenAccount = await findAssociatedTokenAddress(wallet, farm.tokenMintKey);

    if (!amount.eq(new BN(0))) {
        tx.add(await createATAWithoutCheckIx(wallet, farm.tokenMintKey));

        let withdrawFromFarmIns = await ins.withdrawFromFarmIx(farm, wallet, amount);
        tx.add(withdrawFromFarmIns)
    }

    return tx;
}
export async function claimRewardTx(farm: FarmInfo, wallet: PublicKey, connection: Connection) {
    let tx = new Transaction;
    let createMinerIx = await createMiner(farm, wallet, connection);
    tx.add(createMinerIx);
    let iouTokenAccount = await findAssociatedTokenAddress(wallet, IOU_TOKEN_MINT);
    tx.add(await createATAWithoutCheckIx(wallet, IOU_TOKEN_MINT))

    let sbrTokenAccount = await findAssociatedTokenAddress(wallet, SABER_TOKEN_MINT);
    tx.add(await createATAWithoutCheckIx(wallet, SABER_TOKEN_MINT))

    tx.add(await ins.claimReward(farm, wallet))
    tx.add(Token.createCloseAccountInstruction(iouTokenAccount, wallet, wallet, []))
    return tx;
}
