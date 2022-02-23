import {
    Connection,
    Keypair,
    Transaction,
    sendAndConfirmTransaction,
    PublicKey,
} from "@solana/web3.js";
import * as Token from "@solana/spl-token";
async function main() {
    let vault = new PublicKey("8dENNXaNmuEFNkHRwzAyqMtzqe8TmbnrCMtoJdRAp3oh");
    let id = new PublicKey("1349iiGjWC7ZTbu6otFmJwztms122jEEnShKgpVnNewy");
    let prefix = "option"
    let minerBytes = new Uint8Array(Buffer.from(prefix, 'utf-8'))
    let pda = await PublicKey.findProgramAddress([minerBytes, vault.toBuffer()], id);
    let ix = await Token.createCloseAccountInstruction(pda[0], vault, id, );
    console.log(pda[0].toString(),"\n B4mmuTW8kW2hZU9tugbnfjsTB9xpHxoGKoqA7gaXKzY2")
}


main()