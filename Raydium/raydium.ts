import {
    Connection,
    
    PublicKey,
    AccountInfo
} from "@solana/web3.js";

import { PoolInfo, parseV4PoolInfo, updateAllTokenAmount } from "./poolInfo"




export async function getAmmPool(ammId: PublicKey, connection: Connection) {

    let account = (await connection.getAccountInfo(ammId)) as AccountInfo<Buffer>;
    let pool = parseV4PoolInfo(account.data, ammId)
    return pool;


}
