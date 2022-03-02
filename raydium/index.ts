import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
import { parseV4PoolInfo } from "./infos"

export async function getAmmPool(ammId: PublicKey, conn: Connection) {
  const account = (await conn.getAccountInfo(ammId)) as AccountInfo<Buffer>;
  const pool = parseV4PoolInfo(account.data, ammId);

  // Update amounts manually
  pool.updatePoolAmount(conn);
  return pool;
}
