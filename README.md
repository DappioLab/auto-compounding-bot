# auto-compounding-bot

## prepare wallet
```bash
$ sh -c "$(curl -sSfL https://release.solana.com/v1.9.8/install)"
...

$ solana-keygen new
```

## restore wallet from private key
```bash
$ vim ~/.config/solana/id.json
# paste KeyPair as u8 array format inside and save
# save and quit vim: esc -> :wq
```

## connect to Mainnet-fork
```bash
$ solana config set --url https://rpc-mainnet-fork.dappio.xyz
$ solana config set --ws wss://rpc-mainnet-fork.dappio.xyz/ws
$ solana config set --commitment processed
$ solana airdrop 1
```

## testing the script
```bash
$ yarn
$ yarn start
```