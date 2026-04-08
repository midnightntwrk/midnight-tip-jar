# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-28

### Added

- Wallet detection using DApp Connector API v4.x with polling pattern.
- Wallet connection via `walletAPI.connect(networkId)` with auto-reconnect support.
- On-chain balance reading via `getUnshieldedBalances()`.
- Unshielded NIGHT transfers via `makeTransfer()` and `submitTransaction()`.
- Quick-select amount buttons and custom amount input.
- Step-by-step build tutorial (TUTORIAL.md).
- Configurable recipient address and network ID (`src/config.ts`).

[Unreleased]: https://github.com/midnightntwrk/midnight-tip-jar/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/midnightntwrk/midnight-tip-jar/releases/tag/v1.0.0
