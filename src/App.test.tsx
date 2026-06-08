import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

// Smoke test: renders with no wallet injected (window.midnight is undefined
// in jsdom), so it depends on no network, timers, or extension — fully
// deterministic. Asserts the shell renders and the no-wallet path is shown.
describe('App', () => {
  it('renders the tip jar shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Midnight Tip Jar' })).toBeInTheDocument();
    expect(screen.getByText('preprod')).toBeInTheDocument();
  });

  it('shows the wallet-not-detected notice when no wallet is present', () => {
    render(<App />);
    expect(screen.getByText('Lace wallet not detected.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Install Lace/ })).toBeInTheDocument();
  });
});
