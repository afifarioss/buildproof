# BuildProof 🚢

> **Onchain Proof-of-Work for Builders on Base**
> Owner: `afifarioss.base.eth` / `0x7845D45d9E53268EBFf3C4a9daBb994cE5b93918`

[![Built on Base](https://img.shields.io/badge/Built%20on-Base-0052FF?style=flat&logo=ethereum)](https://base.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is BuildProof?

BuildProof lets builders **mint a Ship Receipt NFT** every time they ship something — creating an immutable, AI-verified, onchain track record of work.

Think of it as **"Proof of Ship"** — every merged PR, launched product, or shipped contract becomes a verifiable credential on Base.

---

## Tech Stack

| Technology              | Usage                                        |
|-------------------------|----------------------------------------------|
| **Coinbase Smart Wallet** | Passkey login — no seed phrase             |
| **CDP Paymaster**       | Gasless minting for all users                |
| **OnchainKit**          | Identity, Transaction, Wallet UI components  |
| **EAS**                 | Verifiable onchain attestation per ship      |
| **AgentKit**            | AI agent wallet verifies GitHub repos        |
| **GPT-4o-mini**         | Scores build quality 0-100                   |
| **Talent Protocol**     | Builder Score displayed on each receipt      |
| **Basenames**           | Identity resolution throughout               |
| **Farcaster Frame v2**  | MiniApp for Warpcast in-feed interaction     |
| **USDC on Base**        | Peer-to-peer builder tipping                 |

---

## Architecture

```
User (Smart Wallet)
  |
  +- Gasless mint via CDP Paymaster
  +- mintShipReceipt() -> BuildProofNFT.sol
  |       +- Fetches Talent Protocol Builder Score
  |       +- Issues EAS Attestation (onchain)
  |       +- Mints NFT with fully onchain SVG metadata
  |
  +- Indexer watches ShipReceiptMinted event
          |
          +- POST /api/verify
                  +- Octokit -> analyzes GitHub repo
                  +- GPT-4o-mini -> scores build 0-100
                  +- AgentKit wallet -> setAIVerification() onchain
```

---

## Quick Start

```bash
git clone https://github.com/afifarioss/buildproof
cd buildproof
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

## Deploy Contract

```bash
# Testnet first
npm run deploy:testnet

# Mainnet
npm run deploy:mainnet
# Then update BUILDPROOF_CONTRACT in lib/contract.ts
```

## Run AI Indexer

```bash
npm run indexer
```

---

## Base Grant Criteria

1. **Full Base tech stack** — OnchainKit, Smart Wallet, CDP Paymaster, EAS, AgentKit
2. **Solves a real problem** — builders have no verifiable onchain track record
3. **Drives Base activity** — every ship = gasless tx + EAS attestation + Talent Protocol hook
4. **Viral growth loop** — Farcaster Frame v2 surfaces every ship in the Warpcast feed
5. **Real USDC utility** — economic flow between builders
6. **AI-native** — AgentKit as the financial rail for AI-verified work

---

## Roadmap

- [x] Ship Receipt NFT + EAS Attestation
- [x] AgentKit AI verification
- [x] CDP Paymaster (gasless)
- [x] Talent Protocol integration
- [x] USDC tipping
- [x] Farcaster Frame v2
- [ ] Base MCP natural language interface
- [ ] DAO governance for top builders
- [ ] BuildProof Season (weekly leaderboard + USDC prize pool)
- [ ] GitHub Action to auto-ship on push to main

---

*Built with 🔵 by [afifarioss.base.eth](https://basename.app/afifarioss) on Base · 2026*