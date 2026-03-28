# Midnight Tip Jar

A minimal tip jar on [Midnight Network](https://midnight.network) — connect a Lace wallet, read balances, and send NIGHT transfers using the DApp Connector API.

## Prerequisites

- **Node.js** v18+
- **[Lace wallet](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk)** installed in Chrome
- Lace configured for **preprod** with tNight from the [faucet](https://faucet.preprod.midnight.network)

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, connect your wallet, and send a tip.

## Configuration

Edit `src/config.ts` and set the recipient address:

```ts
export const RECIPIENT = 'mn_addr_preprod1...'; // your unshielded address
```

## Tutorial

Want to build this from scratch? See [TUTORIAL.md](TUTORIAL.md) for a step-by-step guide covering wallet detection, balance reading, and token transfers.

## Project Structure

```
src/
├── config.ts     # Network, recipient, UI settings
├── main.tsx      # Entry point
├── App.tsx       # Wallet logic and UI
└── App.css       # Styles
```

## What's Next

This repo covers the basics — connecting a wallet and transferring tokens. Here are some ideas to extend it:

- **Name-based tipping with MidNS** — Integrate [Midnames](https://midnames.com) to resolve human-readable names to wallet addresses. A blog or video site embeds `?name=jay.midnight` in the tip button, the app resolves it through MidNS, and the transfer just works. Creators register once — every site can resolve them without hardcoding addresses.
- **Dynamic recipient via URL** — Read the recipient from a query parameter (`?to=mn_addr_preprod1...`) so a single deployment serves multiple creators without a name service dependency.
- **Shielded transfers** — Switch from unshielded to shielded transfers for sender privacy. Use `kind: 'shielded'` with a `shield-addr` recipient and `getShieldedBalances()`.
- **Tip history** — Use `getTxHistory()` from the DApp Connector API to show recent transactions in the UI.
- **Multi-recipient splitting** — Pass multiple entries in the `makeTransfer` array to split a tip across several addresses in one transaction.
- **On-chain tip counter** — Deploy a Compact contract that increments a counter each time a tip is sent, giving creators a verifiable on-chain tip count without revealing amounts.

## Related Resources

- [React wallet connect how-to](https://docs.midnight.network/how-to/react-wallet-connect) — covers wallet connection (this repo extends it with transfers)
- [DApp Connector API reference](https://docs.midnight.network/develop/reference/midnight-api/dapp-connector/)
- [Preprod faucet](https://faucet.preprod.midnight.network)
- [Midnames](https://midnames.com) — decentralized name service for Midnight

## License

Apache-2.0
