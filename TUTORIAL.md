# Build a Midnight Tip Jar — Step by Step

Build a React app that connects to the Lace wallet, reads on-chain balances, and sends NIGHT tokens on Midnight.

## What you'll learn

- How to detect and connect to a Midnight wallet using the DApp Connector API
- How to read on-chain token balances from a connected wallet
- How to build, prove, and submit a token transfer

## Prerequisites

- Node.js v18+
- [Lace wallet](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk) installed in Chrome, configured for **preprod**
- tNight tokens from the [preprod faucet](https://faucet.preprod.midnight.network)

---

## Step 1: Scaffold and install

```bash
npm create vite@latest midnight-tip-jar -- --template react-ts
cd midnight-tip-jar
npm install @midnight-ntwrk/dapp-connector-api
```

Verify the template works:

```bash
npm run dev
```

You should see the Vite welcome page at `http://localhost:5173`. Stop the server (`Ctrl+C`) and continue.

---

## Step 2: Set up project files

```bash
touch src/config.ts
```

Open `src/config.ts` and add your settings:

```ts
export const NETWORK_ID = 'preprod';
export const RECIPIENT = 'YOUR_UNSHIELDED_ADDRESS_HERE'; // mn_addr_preprod1...
export const SUGGESTED_AMOUNTS = [1, 5, 10, 25];
export const LACE_URL =
  'https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk';
```

Replace `RECIPIENT` with your Lace wallet's unshielded address (starts with `mn_addr_preprod1...`).

Open `src/main.tsx` and add this import at the top — it augments the global `Window` type so TypeScript knows about `window.midnight`:

```ts
import '@midnight-ntwrk/dapp-connector-api';
```

Also swap the template's `import './index.css'` for `import './App.css'`.

Clean up template files you won't need:

```bash
rm src/assets/hero.png src/assets/vite.svg
```

---

## Step 3: Build the component

Open `src/App.tsx` and **delete everything** — the Vite template has its own imports and JSX that will conflict. Start fresh:

```tsx
import { useState, useEffect, useCallback } from 'react';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { NETWORK_ID, RECIPIENT, SUGGESTED_AMOUNTS, LACE_URL } from './config';

// ── Wallet detection ─────────────────────────────────────────────────────
// Browser extensions inject asynchronously — window.midnight won't exist
// when React first renders. The DApp Connector API v4.x declares
// window.midnight as Record<string, InitialAPI>. We grab the first wallet.

function findWallet(): InitialAPI | undefined {
  const midnight = window.midnight;
  if (!midnight) return undefined;
  return Object.values(midnight)[0];
}

// ── Component ────────────────────────────────────────────────────────────

export default function App() {
  const [walletAPI, setWalletAPI] = useState<InitialAPI | undefined>();
  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState<ConnectedAPI | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [nativeTokenType, setNativeTokenType] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for the wallet extension every 100ms for up to 5 seconds.
  useEffect(() => {
    const found = findWallet();
    if (found) { setWalletAPI(found); return; }
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += 100;
      const w = findWallet();
      if (w) { setWalletAPI(w); clearInterval(timer); }
      else if (elapsed >= 5_000) { clearInterval(timer); }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // ── Connect and read on-chain balance ──────────────────────────────────
  // getUnshieldedBalances() returns Record<TokenType, bigint> where
  // TokenType is a hex string and the value is in atomic units
  // (1 NIGHT = 1,000,000 atomic units).

  const connect = useCallback(async () => {
    if (!walletAPI) return;
    setConnecting(true);
    setError(null);
    try {
      const connected = await walletAPI.connect(NETWORK_ID);
      setWallet(connected);

      const { unshieldedAddress } = await connected.getUnshieldedAddress();
      setAddress(unshieldedAddress);

      const balances = await connected.getUnshieldedBalances();
      const tokenType = Object.keys(balances)[0] ?? null;
      if (tokenType) {
        setNativeTokenType(tokenType);
        setBalance((balances[tokenType] / 1_000_000n).toString());
      } else {
        setBalance('0');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }, [walletAPI]);

  // ── Send a transfer ────────────────────────────────────────────────────
  // makeTransfer() builds and proves the tx — Lace shows the approval popup.
  // submitTransaction() broadcasts the proven tx to the network.

  const canSend =
    wallet && nativeTokenType && !sending &&
    RECIPIENT !== 'YOUR_UNSHIELDED_ADDRESS_HERE' && parseFloat(amount) >= 1;

  const sendTip = useCallback(async () => {
    if (!wallet || !nativeTokenType) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 1) return;

    setSending(true);
    setStatus('Approve the transaction in Lace…');
    setError(null);
    try {
      const atomicValue = BigInt(Math.floor(parsed)) * 1_000_000n;
      const { tx } = await wallet.makeTransfer([{
        kind: 'unshielded',
        type: nativeTokenType,
        value: atomicValue,
        recipient: RECIPIENT,
      }]);

      setStatus('Submitting to network…');
      await wallet.submitTransaction(tx);
      setStatus('Sent! Balance may take a minute to update.');
      setAmount('');
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }, [wallet, nativeTokenType, amount]);

  // ── Render ─────────────────────────────────────────────────────────────

  const truncate = (addr: string) =>
    addr.length <= 30 ? addr : `${addr.slice(0, 18)}…${addr.slice(-8)}`;

  return (
    <div className="app">
      <div className="card">
        <header className="header">
          <h1 className="title">Midnight Tip Jar</h1>
          <span className="badge">{NETWORK_ID}</span>
        </header>
        <p className="subtitle">Send NIGHT tokens on Midnight.</p>

        {RECIPIENT !== 'YOUR_UNSHIELDED_ADDRESS_HERE' && (
          <div className="wallet-info">
            <div className="row">
              <span className="label">Sending to</span>
              <span className="value mono">{truncate(RECIPIENT)}</span>
            </div>
          </div>
        )}

        <div className="amounts">
          {SUGGESTED_AMOUNTS.map((n) => (
            <button key={n}
              className={`btn btn-amount ${amount === String(n) ? 'active' : ''}`}
              onClick={() => setAmount(String(n))}>{n}</button>
          ))}
        </div>
        <div className="input-row">
          <input type="number" min="1" step="1" placeholder="Custom amount"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
          <span className="suffix">NIGHT</span>
        </div>

        {!walletAPI && (
          <div className="notice">
            <p>Lace wallet not detected.</p>
            <a href={LACE_URL} target="_blank" rel="noopener noreferrer">Install Lace →</a>
          </div>
        )}

        {walletAPI && !wallet && (
          <button className="btn btn-primary" onClick={connect} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}

        {wallet && address && (
          <>
            <div className="wallet-info">
              <div className="row">
                <span className="label">Your wallet</span>
                <span className="value mono">{truncate(address)}</span>
              </div>
              <div className="row">
                <span className="label">Balance</span>
                <span className="value mono">{balance ?? '—'} NIGHT</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={sendTip} disabled={!canSend}>
              {sending ? 'Sending…' : 'Send Tip'}
            </button>
          </>
        )}

        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
```

The three sections inside the component map directly to the three API concepts: **detect** (poll `window.midnight`), **read** (`getUnshieldedAddress` + `getUnshieldedBalances`), and **transfer** (`makeTransfer` + `submitTransaction`).

---

## Step 4: Add styles and test

Copy [App.css](src/App.css) from this repo into your `src/App.css`, or write your own.

Run the app:

```bash
npm run dev
```

1. Open `http://localhost:5173` in Chrome with Lace installed
2. Click **Connect Wallet** — Lace prompts to authorize (or auto-connects if previously authorized)
3. Your on-chain balance appears, read live via `getUnshieldedBalances()`
4. Pick an amount and click **Send Tip**
5. Approve in the Lace popup — the wallet handles proof generation internally
6. Wait about a minute for the transaction to confirm on preprod

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Lace wallet not detected" | Extension not installed or still loading | Install Lace, reload the page |
| "Expected type shield-addr, got addr" | Recipient address type doesn't match transfer `kind` | Use `mn_addr_preprod1...` with `kind: 'unshielded'` |
| Balance shows 0 after faucet | Tokens haven't synced yet | Wait a minute, reconnect |
| Wallet popup is blank/white | Cached wallet data is stale | Clear Lace extension data in Chrome settings |

---

## Recap

| Method | What it does |
|--------|-------------|
| `Object.values(window.midnight)[0]` | Find the wallet extension |
| `walletAPI.connect(networkId)` | Authorize and get a `ConnectedAPI` |
| `wallet.getUnshieldedAddress()` | Read the wallet's on-chain address |
| `wallet.getUnshieldedBalances()` | Read on-chain token balances |
| `wallet.makeTransfer([...])` | Build and prove a transaction |
| `wallet.submitTransaction(tx)` | Broadcast to the network |

No smart contract, no proof server, no indexer setup. The wallet handles proving and submission through the DApp Connector API.

## What's next

See the [README](README.md#whats-next) for extension ideas — from name-based tipping with MidNS to shielded transfers.
