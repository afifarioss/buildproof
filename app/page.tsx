"use client";
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { Identity, Name, Avatar, Address, Badge } from "@coinbase/onchainkit/identity";
import { base } from "viem/chains";
import { useAccount } from "wagmi";
import dynamic from "next/dynamic";
const ShipForm    = dynamic(() => import("@/components/ShipForm"),    { ssr:false });
const FeedCard    = dynamic(() => import("@/components/FeedCard"),    { ssr:false });
const Leaderboard = dynamic(() => import("@/components/Leaderboard"), { ssr:false });
const Stats       = dynamic(() => import("@/components/Stats"),       { ssr:false });

export default function Home() {
  const { address, isConnected } = useAccount();
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-mono">
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0052FF] flex items-center justify-center text-xs font-bold text-white">BP</div>
            <span className="text-lg font-black">BuildProof</span>
            <span className="text-xs text-white/40 border border-white/10 px-2 py-0.5 rounded-full">Base</span>
          </div>
          <Wallet>
            <ConnectWallet className="bg-[#0052FF] hover:bg-[#0039B3] px-4 py-2 rounded-xl text-sm font-bold transition-all">
              <Avatar className="h-5 w-5" /><Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity hasCopyAddressOnClick><Avatar /><Name /><Address /><Badge /></Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </nav>
      <section className="pt-28 pb-12 px-4 max-w-6xl mx-auto text-center">
        <div className="inline-block mb-4 px-3 py-1 rounded-full bg-[#0052FF]/20 border border-[#0052FF]/40 text-[#60A5FA] text-xs">
          Built on Base · AI-Powered · Gasless · EAS Attested
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-5 bg-gradient-to-r from-white via-[#60A5FA] to-[#0052FF] bg-clip-text text-transparent leading-tight">
          Ship Onchain.<br />Get Verified.
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-6">
          Mint a verifiable <strong className="text-white">Ship Receipt NFT</strong> every time you build.
          AI scores your repo, Talent Protocol badge, earn USDC tips from your community.
        </p>
        <div className="flex flex-wrap gap-2 justify-center text-xs text-white/40">
          {["Smart Wallet","Gasless Paymaster","EAS Attestation","AgentKit AI","Farcaster Frame v2","USDC Tips","Basenames","Talent Protocol"].map(t => (
            <span key={t} className="border border-white/10 px-3 py-1 rounded-full">{t}</span>
          ))}
        </div>
      </section>
      <Stats />
      <main className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ShipForm />
          <div>
            <h2 className="text-lg font-bold mb-3 text-white/80">Live Feed</h2>
            <FeedCard />
          </div>
        </div>
        <div className="space-y-5">
          {isConnected && address && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-white/40 mb-3 font-bold">YOUR IDENTITY</p>
              <Identity address={address as `0x${string}`} chain={base}>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="w-11 h-11 rounded-full" />
                  <div><Name className="text-white font-bold" /><Address className="text-white/30 text-xs" /></div>
                </div>
                <Badge className="text-xs mt-1" />
              </Identity>
            </div>
          )}
          <Leaderboard />
        </div>
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-white/30 text-xs">
        BuildProof · afifarioss.base.eth · Base 2026
      </footer>
    </div>
  );
}