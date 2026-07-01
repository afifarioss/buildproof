<p align="center">
  <img src="https://raw.githubusercontent.com/afifarioss/buildproof/main/public/logo.png" width="120" alt="BuildProof Logo">
</p>

<h1 align="center">BuildProof</h1>
<p align="center"><strong>Onchain Proof-of-Work for Builders on Base</strong></p>

<p align="center">
  <a href="https://base.org"><img src="https://img.shields.io/badge/Built%20on-Base-0052FF?style=for-the-badge&logo=ethereum" alt="Built on Base"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://buildproof.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-Visit-00D26A?style=for-the-badge" alt="Live Demo"></a>
</p>

---

## 🎯 Problem Statement

Builders ship code every day — but there's **no verifiable, onchain record of their work**. Resumes can be faked. GitHub stars can be bought. Hiring managers have no way to trust a builder's track record.

**BuildProof solves this** by letting builders mint a **Ship Receipt NFT** every time they ship — creating an immutable, AI-verified, onchain proof-of-work on Base.

---

## 🚀 What is BuildProof?

BuildProof is a **"Proof of Ship"** protocol. Every merged PR, launched product, or shipped contract becomes a **verifiable credential** on Base:

| Feature | Description |
|---------|-------------|
| 🚢 **Ship Receipt NFT** | Mint an NFT for every project you ship |
| 🤖 **AI Verification** | GPT-4o-mini scores your GitHub repo 0-100 |
| 🏷️ **EAS Attestation** | Onchain attestation via Ethereum Attestation Service |
| 💰 **USDC Tips** | Peer-to-peer tipping between builders |
| 🏆 **Leaderboard** | Global ranking of top builders by ship count |
| 🎮 **Farcaster Frame v2** | Share ships directly in Warpcast feed |

---

## 🏗️ Architecture

┌─────────────────────────────────────────────────────────────┐ │ USER (Smart Wallet) │ │ Coinbase Smart Wallet — Passkey Login │ └──────────────────────┬────────────────────────────────────────┘  │  ▼ ┌─────────────────────────────────────────────────────────────┐ │ BUILPROOF FRONTEND (Next.js 15) │ │ • OnchainKit UI Components • Wagmi + Viem • Tailwind CSS │ └──────────────────────┬────────────────────────────────────────┘  │  ┌──────────────┼──────────────┐  ▼ ▼ ▼ ┌──────────────┐ ┌──────────┐ ┌──────────────┐ │ CDP │ │ EAS │ │ Talent │ │ Paymaster │ │ Schema │ │ Protocol │ │ (Gasless) │ │ Registry│ │ API │ └──────┬───────┘ └────┬─────┘ └──────┬───────┘  │ │ │  └──────────────┼──────────────┘  ▼ ┌─────────────────────────────────────────────────────────────┐ │ BUILPROOFNFT.SOL (Base Mainnet) │ │ • ERC-721 Ship Receipts • On-chain SVG Metadata │ │ • USDC Tipping (2.5% fee) • Anti-spam Cooldown │ │ • Pausable • Leaderboard (Top 100) • Admin Controls │ └──────────────────────┬────────────────────────────────────────┘  │  ▼ ┌─────────────────────────────────────────────────────────────┐ │ AI INDEXER (Node.js) │ │ • Watches ShipReceiptMinted events │ │ • Octokit → GitHub repo analysis │ │ • GPT-4o-mini → Quality scoring (0-100) │ │ • AgentKit (CDP Smart Wallet) → setAIVerification() │ └─────────────────────────────────────────────────────────────┘

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.3 | App Router, React 19, Server Components |
| **TypeScript** | 5.7 | Type-safe fullstack |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Wagmi** | 2.13 | React hooks for Ethereum |
| **Viem** | 2.21 | TypeScript Ethereum interface |
| **OnchainKit** | 0.38 | Coinbase identity, transaction, wallet UI |
| **Coinbase Smart Wallet** | Latest | Passkey login, no seed phrase |
| **CDP Paymaster** | Latest | Gasless transactions for all users |
| **EAS (Ethereum Attestation Service)** | v1 | Verifiable onchain attestations |
| **AgentKit** | 0.5 | AI agent wallet for onchain verification |
| **OpenAI GPT-4o-mini** | Latest | Repository quality scoring |
| **Octokit** | 21.0 | GitHub API integration |
| **Hardhat** | 2.22 | Smart contract development |
| **OpenZeppelin** | 5.1 | Secure contract standards |
| **Farcaster Frame v2** | vNext | In-feed MiniApp on Warpcast |
| **Talent Protocol** | v2 | Builder Score enrichment |
| **Basenames** | Latest | Onchain identity resolution |

---

## 📦 Smart Contract

**`BuildProofNFT.sol`** — Deployed on Base Mainnet

### Key Features
- **ERC-721** with on-chain SVG metadata (no IPFS dependency)
- **EAS Integration** — Attests every ship onchain
- **USDC Tipping** — 2.5% protocol fee, rest to builder
- **Anti-Spam** — 1-hour cooldown between mints per address
- **Leaderboard** — Fixed-size sorted array (Top 100)
- **Pausable** — Emergency stop via OpenZeppelin
- **Admin Controls** — Upgradable AI verifier, schema, cooldown

### Security
- ✅ `SafeERC20` for all token transfers
- ✅ Checks-Effects-Interactions pattern
- ✅ Reentrancy-safe tip flow
- ✅ OpenZeppelin `Ownable` + `Pausable`
- ✅ Input validation on all state-changing functions

---

## 🎮 User Flow

1. Connect Coinbase Smart Wallet (Passkey — no seed phrase)  

2. Fill project details + GitHub URL + Category  ↓

3. Click "🚀 Ship to Base" → Gasless mint via CDP Paymaster  

4. NFT minted with on-chain SVG metadata + EAS Attestation  

5. AI Indexer detects event → Analyzes GitHub repo  ↓

6. GPT-4o-mini scores build quality (0-100)  ↓

7. AgentKit writes AI score onchain via setAIVerification()  

8. Builder can receive USDC tips from other builders  ↓

9. Share on Farcaster Frame v2 → Viral growth loop


---

## 🏆 Base Grant Alignment

| Criteria | How BuildProof Delivers |
|----------|------------------------|
| **1. Full Base Tech Stack** | OnchainKit, Smart Wallet, CDP Paymaster, EAS, AgentKit, Basenames — all integrated |
| **2. Solves a Real Problem** | Builders have no verifiable onchain track record. BuildProof creates immutable proof-of-work. |
| **3. Drives Base Activity** | Every ship = gasless tx + EAS attestation + Talent Protocol hook + USDC flow |
| **4. Viral Growth Loop** | Farcaster Frame v2 surfaces every ship in Warpcast feed. Social proof = organic growth. |
| **5. Real USDC Utility** | Peer-to-peer builder tipping creates genuine economic activity on Base |
| **6. AI-Native** | AgentKit is the financial rail for AI-verified work. GPT-4o-mini scores every build. |

---

## 📊 Metrics & Impact

| Metric | Target |
|--------|--------|
| **Gasless Mints** | Every ship is free for users (CDP Paymaster) |
| **Onchain Attestations** | 1 EAS attestation per ship |
| **AI Verifications** | 100% of ships scored by GPT-4o-mini |
| **USDC Volume** | Tips flow between builders (2.5% protocol fee) |
| **Social Distribution** | Every ship shareable via Farcaster Frame v2 |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/afifarioss/buildproof.git
cd buildproof

# Install
npm install

# Environment
cp .env.example .env.local
# Fill in your keys (CDP, OpenAI, GitHub, etc.)

# Dev
npm run dev

# Deploy Contract (Testnet first)
npm run deploy:testnet

# Update contract address in lib/contract.ts
# Then deploy to mainnet
npm run deploy:mainnet

# Start AI Indexer
npm run indexer

🔐 Environment Variables
# Coinbase Developer Platform
NEXT_PUBLIC_CDP_API_KEY=
NEXT_PUBLIC_PAYMASTER_URL=

# AgentKit AI Verifier
CDP_API_KEY_ID=
CDP_API_KEY_SECRET=
CDP_WALLET_SECRET=
BASE_ACCOUNT_OWNER_ADDRESS=

# Contracts
BUILDPROOF_CONTRACT=
AI_VERIFIER_ADDRESS=

# APIs
OPENAI_API_KEY=
GITHUB_TOKEN=
TALENT_PROTOCOL_API_KEY=

# App
NEXT_PUBLIC_URL=https://buildproof.vercel.app
APP_URL=https://buildproof.vercel.app

# Deploy
DEPLOYER_PRIVATE_KEY=
BASESCAN_API_KEY=

# Security
VERIFY_WEBHOOK_SECRET=

🗺️ Roadmap
 
Ship Receipt NFT + EAS Attestation
 
AgentKit AI Verification
 
CDP Paymaster (Gasless)
 
Talent Protocol Integration
 
USDC Tipping
 
Farcaster Frame v2
 
Base MCP Natural Language Interface
 
DAO Governance for Top Builders
 
BuildProof Season (Weekly Leaderboard + USDC Prize Pool)
 
GitHub Action to Auto-Ship on Push to Main


🧪 Testing
# Run Hardhat tests
npm run test

# Run linter
npm run lint

# Compile contracts
npm run compile


📄 License
MIT © 2026 afifarioss.base.eth


<p align="center">
  <sub>Built with 🔵 on Base</sub>
</p>
```