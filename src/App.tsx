import { useState, useEffect, useCallback } from 'react';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { NETWORK_ID, RECIPIENT, SUGGESTED_AMOUNTS, LACE_URL } from './config';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Find a wallet in window.midnight.
 *
 * The DApp Connector API v4.x types declare window.midnight as
 * Record<string, InitialAPI>. Wallets register under a key when
 * they inject — we grab the first one available.
 */
function findWallet(): InitialAPI | undefined {
  const midnight = window.midnight;
  if (!midnight) return undefined;
  return Object.values(midnight)[0];
}

function truncate(addr: string): string {
  if (addr.length <= 30) return addr;
  return `${addr.slice(0, 18)}…${addr.slice(-8)}`;
}

function formatBalance(atomic: bigint): string {
  const whole = atomic / 1_000_000n;
  const frac = atomic % 1_000_000n;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(6, '0').replace(/0+$/, '')}`;
}

// ── Component ────────────────────────────────────────────────────────────

export default function App() {
  const [walletAPI, setWalletAPI] = useState<InitialAPI | undefined>();
  const [wallet, setWallet] = useState<ConnectedAPI | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [nativeTokenType, setNativeTokenType] = useState<string | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recipientConfigured = RECIPIENT !== 'YOUR_UNSHIELDED_ADDRESS_HERE';

  // ── Step 1: Detect the wallet extension ──────────────────────────────
  // Poll every 100ms for up to 5s — extensions inject asynchronously.
  useEffect(() => {
    const found = findWallet();
    if (found) {
      setWalletAPI(found);
      return;
    }
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += 100;
      const w = findWallet();
      if (w) {
        setWalletAPI(w);
        clearInterval(timer);
      } else if (elapsed >= 5_000) {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  /** Refresh balance from the wallet. */
  const refreshBalance = useCallback(async (w: ConnectedAPI, tokenType: string) => {
    try {
      const balances = await w.getUnshieldedBalances();
      if (tokenType in balances) {
        setBalance(formatBalance(balances[tokenType]));
      }
    } catch {
      // Balance refresh is best-effort
    }
  }, []);

  // ── Step 2: Connect and read on-chain balance ────────────────────────
  // If the user previously authorized this dApp, Lace reconnects instantly.
  const connect = useCallback(async () => {
    if (!walletAPI) return;
    setConnecting(true);
    setError(null);
    try {
      const connected = await walletAPI.connect(NETWORK_ID);
      setWallet(connected);

      // Read the sender's on-chain address
      const { unshieldedAddress } = await connected.getUnshieldedAddress();
      setAddress(unshieldedAddress);

      // Read the on-chain balance — returns Record<TokenType, bigint>
      // TokenType is a hex string identifying the token (e.g. native NIGHT).
      // The value is in atomic units: 1 NIGHT = 1,000,000 atomic units.
      const balances = await connected.getUnshieldedBalances();
      const tokenType = Object.keys(balances)[0] ?? null;
      if (tokenType) {
        setNativeTokenType(tokenType);
        setBalance(formatBalance(balances[tokenType]));
      } else {
        setBalance('0');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }, [walletAPI]);

  // ── Step 3: Send a tip ───────────────────────────────────────────────
  const sendTip = useCallback(async () => {
    if (!wallet || !nativeTokenType) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 1) return;

    setSending(true);
    setStatus(null);
    setError(null);
    try {
      const atomicValue = BigInt(Math.floor(parsed)) * 1_000_000n;

      setStatus('Approve the transaction in Lace…');
      const { tx } = await wallet.makeTransfer([
        {
          kind: 'unshielded',
          type: nativeTokenType,
          value: atomicValue,
          recipient: RECIPIENT,
        },
      ]);

      setStatus('Submitting to network…');
      await wallet.submitTransaction(tx);

      setStatus(`Sent ${parsed} NIGHT — balance may take a minute to update.`);
      setAmount('');
      setTimeout(() => refreshBalance(wallet, nativeTokenType), 10_000);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }, [wallet, nativeTokenType, amount, refreshBalance]);

  const canSend = wallet && nativeTokenType && !sending && recipientConfigured && parseFloat(amount) >= 1;

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="app">
      <div className="card">
        <header className="header">
          <h1 className="title">Midnight Tip Jar</h1>
          <span className="badge">{NETWORK_ID}</span>
        </header>
        <p className="subtitle">Send NIGHT tokens on Midnight.</p>

        {recipientConfigured ? (
          <div className="wallet-info">
            <div className="row">
              <span className="label">Sending to</span>
              <span className="value mono">{truncate(RECIPIENT)}</span>
            </div>
          </div>
        ) : (
          <p className="warning">
            ⚠ Set <code>RECIPIENT</code> in <code>src/config.ts</code> before sending.
          </p>
        )}

        <div className="amounts">
          {SUGGESTED_AMOUNTS.map((n) => (
            <button
              key={n}
              className={`btn btn-amount ${amount === String(n) ? 'active' : ''}`}
              onClick={() => setAmount(String(n))}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="input-row">
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Custom amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="suffix">NIGHT</span>
        </div>

        {!walletAPI && (
          <div className="notice">
            <p>Lace wallet not detected.</p>
            <a href={LACE_URL} target="_blank" rel="noopener noreferrer">
              Install Lace →
            </a>
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

            {!nativeTokenType && (
              <p className="warning">
                No NIGHT balance found. Get test tokens from the{' '}
                <a href="https://faucet.preprod.midnight.network" target="_blank" rel="noopener noreferrer">
                  preprod faucet
                </a>
                .
              </p>
            )}

            <button className="btn btn-primary" onClick={sendTip} disabled={!canSend}>
              {sending ? 'Sending…' : 'Send Tip'}
            </button>
          </>
        )}

        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}

        <footer className="footer">
          Powered by{' '}
          <a href="https://midnight.network" target="_blank" rel="noopener noreferrer">
            Midnight
          </a>
        </footer>
      </div>
    </div>
  );
}
