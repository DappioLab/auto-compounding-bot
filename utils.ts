import BN from "bn.js";
import * as sha256 from "js-sha256";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Connection,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { publicKey, struct, u64, u32, u8 } from "@project-serum/borsh";

const ATA_INIT_PROGRAM_ID = new PublicKey(
  "9tiP8yZcekzfGzSBmp7n9LaDHRjxP2w7wJj8tpPJtfG"
);

const TOKEN_LAYOUT = struct([
  publicKey("mint"),
  publicKey("owner"),
  u64("amount"),
  u32("delegateOption"),
  publicKey("delegate"),
  u8("state"),
  u32("isNativeOption"),
  u64("isNative"),
  u64("delegatedAmount"),
  u32("closeAuthorityOption"),
  publicKey("closeAuthority"),
]);

const MINT_LAYOUT = struct([
  u32("option"),
  publicKey("authority"),
  u64("amount"),
  u8("decimals"),
]);

class TokenAccount {
  infoPubkey: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  amount: BN;
  constructor(
    infoPubkey: PublicKey,
    mint: PublicKey,
    owner: PublicKey,
    amount: BN
  ) {
    this.infoPubkey = infoPubkey;
    this.mint = mint;
    this.owner = owner;
    this.amount = new BN(amount);
  }
}

export async function checkTokenAccount(
  publickey: PublicKey,
  connection: Connection
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(publickey);
  return accountInfo?.owner.toString() === TOKEN_PROGRAM_ID.toString();
}

export function parseTokenAccount(
  data: any,
  infoPubkey: PublicKey
): TokenAccount {
  const tokenAccountInfo = TOKEN_LAYOUT.decode(data);
  const { mint, owner, amount } = tokenAccountInfo;
  return new TokenAccount(infoPubkey, mint, owner, amount);
}

export async function getTokenAccount(
  connection: Connection,
  tokenAccountPubkey: PublicKey
): Promise<TokenAccount> {
  const accountInfo = await connection.getAccountInfo(tokenAccountPubkey);
  return parseTokenAccount(accountInfo?.data, tokenAccountPubkey);
}

export async function getAllTokenAccount(
  wallet: PublicKey,
  connection: Connection
): Promise<TokenAccount[]> {
  const tokenAccountInfos = await (
    await connection.getTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;
  const tokenAccounts = [];
  for (const info of tokenAccountInfos) {
    const tokenAccount = parseTokenAccount(info.account.data, info.pubkey);
    tokenAccounts.push(tokenAccount);
  }
  return tokenAccounts;
}

export async function getTokenAccountAmount(
  connection: Connection,
  tokenAccountPubkey: PublicKey
): Promise<BN> {
  const accountInfo = await connection.getAccountInfo(tokenAccountPubkey);
  const tokenAccountInfo = TOKEN_LAYOUT.decode(accountInfo?.data);
  return new BN(tokenAccountInfo.amount);
}

export async function getTokenSupply(
  connection: Connection,
  tokenMintPubkey: PublicKey
): Promise<BN> {
  const accountInfo = await connection.getAccountInfo(tokenMintPubkey);
  const mintAccountInfo = MINT_LAYOUT.decode(accountInfo?.data);
  return new BN(mintAccountInfo.amount);
}

export async function wrapNative(
  amount: BN,
  walletPublicKey: PublicKey
): Promise<Transaction> {
  const tx = new Transaction();
  const destinationAta = await findAssociatedTokenAddress(
    walletPublicKey,
    NATIVE_MINT
  );
  const createATA = await createATAWithoutCheckIx(walletPublicKey, NATIVE_MINT);
  tx.add(createATA);
  const transferPram = {
    fromPubkey: walletPublicKey,
    lamports: amount.toNumber(),
    toPubkey: destinationAta,
  };
  const transferLamportIx = SystemProgram.transfer(transferPram);
  tx.add(transferLamportIx);
  const key = [{ pubkey: destinationAta, isSigner: false, isWritable: true }];
  const dataString = "11";
  const data = Buffer.from(dataString, "hex");
  const syncNativeIx = new TransactionInstruction({
    keys: key,
    programId: TOKEN_PROGRAM_ID,
    data,
  });
  tx.add(syncNativeIx);
  return tx;
}

export async function findAssociatedTokenAddress(
  walletAddress: PublicKey,
  tokenMintAddress: PublicKey
): Promise<PublicKey> {
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  )[0];
}

export async function createATAWithoutCheckIx(
  wallet: PublicKey,
  mint: PublicKey,
  payer?: PublicKey
): Promise<TransactionInstruction> {
  if (payer === undefined) {
    payer = wallet as PublicKey;
  }
  payer = payer as PublicKey;
  const ATA = await findAssociatedTokenAddress(wallet, mint);
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: ATA, isSigner: false, isWritable: true },
    { pubkey: wallet, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    programId: ATA_INIT_PROGRAM_ID,
  });
}

export function getAnchorInsByIdl(name: string): Buffer {
  const SIGHASH_GLOBAL_NAMESPACE = "global";
  const preimage = `${SIGHASH_GLOBAL_NAMESPACE}:${name}`;
  const hash = sha256.sha256.digest(preimage);
  const data = Buffer.from(hash).slice(0, 8);
  return data;
}

export async function signAndSendAll(
  allTx: Transaction,
  connection: Connection,
  wallet: Keypair
): Promise<string> {
  const walletPublicKey = wallet.publicKey;
  const tx = new Transaction();
  tx.add(allTx);
  const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = walletPublicKey;
  const result = sendAndConfirmTransaction(connection, tx, [wallet]);
  return result;
}
