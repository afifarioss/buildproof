"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectWallet, WalletDropdown } from "@coinbase/onchainkit/wallet";
import { Avatar, Name, Address } from "@coinbase/onchainkit/identity";
import { Transaction, TransactionButton, TransactionSponsor } from "@coinbase/onchainkit/transaction";
import { BUILDPROOF_CONTRACT, BUILDPROOF_ABI } from "@/lib/contract";
import { parseUnits } from "viem";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [category, setCategory] = useState("DeFi");
  const [activeTab, setActiveTab] = useState<"mint" | "feed" | "leaderboard">("mint");

  const { data: totalShips } = useReadContract({
    address: BUILDPROOF_CONTRACT,
    abi: BUILDPROOF_ABI,
    functionName: "totalShips",
  });

  const { data: leaderboard } = useReadContract({
    address: BUILDPROOF_CONTRACT,
    abi: BUILDPROOF_ABI,
    functionName: "getLeaderboard",
    args: [10n],
  });

  const { data: myReceipts } = useReadContract({
    address: BUILDPROOF_CONTRACT,
    abi: BUILDPROOF_ABI,
    functionName: "getBuilderReceipts",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const categories = ["DeFi", "NFT", "Gaming", "AI", "Infrastructure", "DAO", "Other"];

  const mintCalls = [
    {
      address: BUILDPROOF_CONTRACT,
      abi: BUILDPROOF_ABI,
      functionName: "mintShipReceipt",
      args: [projectName, description, githubUrl, category, "0x"],
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0d1b3e] to-[#0a0a1a]">
      <header className="border-b border-[#0052FF]/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0052FF] flex items-center justify-center shadow-lg shadow-[#0052FF]/30">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BuildProof</h1>
              <p className="text-xs text-[#0052FF]">Ship Onchain. Get Verified.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/30">
              <span className="w-2 h-2 rounded-full bg-[#00D26A] animate-pulse"></span>
              <span className="text-sm text-[#0052FF]">{totalShips?.toString() || "0"} Ships</span>
            </div>
            <ConnectWallet className="bg-[#0052FF] hover:bg-[#0052FF]/80 text-white rounded-xl px-4 py-2 font-medium transition-all">
              <Avatar className="h-6 w-6" />
              <Name className="text-sm" />
            </ConnectWallet>
            <WalletDropdown />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex gap-2 p-1 rounded-2xl bg-white/5 border border-white/10 w-fit">
          {(["mint", "feed", "leaderboard"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-[#0052FF] text-white shadow-lg shadow-[#0052FF]/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab === "mint" && "🚀 Ship"}
              {tab === "feed" && "📡 Feed"}
              {tab === "leaderboard" && "🏆 Rank"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "mint" && (
        <section className="max-w-2xl mx-auto px-4 py-8">
          <div className="rounded-3xl bg-white/5 border border-[#0052FF]/20 p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0052FF] to-[#00D26A] flex items-center justify-center">
                <span className="text-2xl">🚢</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Mint Ship Receipt</h2>
                <p className="text-sm text-gray-400">Create your onchain proof of work</p>
              </div>
            </div>

            {!isConnected ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#0052FF]/10 flex items-center justify-center">
                  <span className="text-4xl">🔐</span>
                </div>
                <p className="text-gray-400 mb-4">Connect your Coinbase Smart Wallet to start shipping</p>
                <ConnectWallet className="bg-[#0052FF] hover:bg-[#0052FF]/80 text-white rounded-xl px-6 py-3 font-medium">
                  Connect Wallet
                </ConnectWallet>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., BaseSwap Aggregator"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          category === cat
                            ? "bg-[#0052FF] text-white shadow-lg shadow-[#0052FF]/25"
                            : "bg-white/5 text-gray-400 border border-white/10 hover:border-[#0052FF]/50"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">GitHub URL</label>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/you/project"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description <span className="text-gray-500">({description.length}/20 min)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you built, the problem it solves, and key features..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] outline-none transition-all resize-none"
                  />
                </div>

                <Transaction
                  calls={mintCalls}
                  onSuccess={() => {
                    setProjectName("");
                    setDescription("");
                    setGithubUrl("");
                  }}
                >
                  <TransactionButton
                    className="w-full bg-gradient-to-r from-[#0052FF] to-[#00D26A] hover:opacity-90 text-white font-bold py-4 rounded-xl text-lg transition-all shadow-lg shadow-[#0052FF]/20"
                    text="🚀 Ship to Base"
                  />
                  <TransactionSponsor />
                </Transaction>
              </div>
            )}
          </div>

          {isConnected && myReceipts && myReceipts.length > 0 && (
            <div className="mt-8 rounded-3xl bg-white/5 border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">📋 My Ship Receipts</h3>
              <div className="space-y-3">
                {myReceipts.map((tokenId: bigint) => (
                  <ReceiptCard key={tokenId} tokenId={tokenId} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === "feed" && (
        <section className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0052FF]/10 flex items-center justify-center">
              <span className="text-3xl">📡</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Live Feed</h3>
            <p className="text-gray-400">Coming soon — real-time ship stream from all builders</p>
          </div>
        </section>
      )}

      {activeTab === "leaderboard" && (
        <section className="max-w-2xl mx-auto px-4 py-8">
          <div className="rounded-3xl bg-white/5 border border-[#0052FF]/20 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🏆</span>
              <div>
                <h2 className="text-2xl font-bold text-white">Top Builders</h2>
                <p className="text-sm text-gray-400">Ranked by ships delivered</p>
              </div>
            </div>

            {leaderboard && leaderboard[0] ? (
              <div className="space-y-3">
                {leaderboard[0].map((builder: string, i: number) => (
                  <div
                    key={builder}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#0052FF]/50 transition-all"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      i === 0 ? "bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black" :
                      i === 1 ? "bg-gradient-to-br from-[#C0C0C0] to-[#808080] text-black" :
                      i === 2 ? "bg-gradient-to-br from-[#CD7F32] to-[#8B4513] text-white" :
                      "bg-white/10 text-gray-400"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <Name address={builder as `0x${string}`} className="text-white font-medium" />
                      <Address address={builder as `0x${string}`} className="text-xs text-gray-500" />
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[#0052FF]">{leaderboard[1][i].toString()}</span>
                      <span className="text-xs text-gray-500 block">ships</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <span className="text-4xl mb-4 block">🌊</span>
                <p>No ships yet. Be the first to build on Base!</p>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 mt-20 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            Built with 🔵 on Base by{" "}
            <a href="https://basename.app/afifarioss" className="text-[#0052FF] hover:underline">
              afifarioss.base.eth
            </a>
          </p>
          <p className="text-xs text-gray-600 mt-2">2026 BuildProof Protocol</p>
        </div>
      </footer>
    </main>
  );
}

function ReceiptCard({ tokenId }: { tokenId: bigint }) {
  const { data: receipt } = useReadContract({
    address: BUILDPROOF_CONTRACT,
    abi: BUILDPROOF_ABI,
    functionName: "receipts",
    args: [tokenId],
  });

  if (!receipt) return null;

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#0052FF]/30 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-bold text-white">{receipt[1]}</h4>
          <span className="text-xs px-2 py-1 rounded-full bg-[#0052FF]/20 text-[#0052FF]">{receipt[4]}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          receipt[9] ? "bg-[#00D26A]/20 text-[#00D26A]" : "bg-yellow-500/20 text-yellow-500"
        }`}>
          {receipt[9] ? `✅ AI ${receipt[10]}/100` : "⏳ Pending"}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{receipt[2]}</p>
      <div className="flex items-center justify-between">
        <a href={receipt[3]} target="_blank" className="text-xs text-[#0052FF] hover:underline">
          View on GitHub →
        </a>
        <span className="text-xs text-gray-500">💰 {(Number(receipt[8]) / 1e6).toFixed(2)} USDC</span>
      </div>
    </div>
  );
}
