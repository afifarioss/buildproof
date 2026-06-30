"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import {
  Transaction, TransactionButton, TransactionStatus,
  TransactionStatusLabel, TransactionStatusAction,
  TransactionToast, TransactionToastIcon, TransactionToastLabel, TransactionToastAction,
} from "@coinbase/onchainkit/transaction";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { encodeFunctionData, encodeAbiParameters, parseAbiParameters } from "viem";
import { base } from "viem/chains";
import { BUILDPROOF_CONTRACT, BUILDPROOF_ABI } from "@/lib/contract";

const CATS = ["dapp","tool","contract","content","design"];

export default function ShipForm() {
  const { isConnected } = useAccount();
  const [f, setF] = useState({ projectName:"", description:"", githubUrl:"", category:"dapp" });
  const [done, setDone] = useState(false);
  const [txHash, setTxHash] = useState("");
  const s = (k: string, v: string) => setF(p => ({ ...p, [k]:v }));

  const easData = encodeAbiParameters(
    parseAbiParameters("string,string,string,string"),
    [f.projectName, f.description, f.githubUrl, f.category]
  );
  const calls = [{
    to: BUILDPROOF_CONTRACT as `0x${string}`,
    data: encodeFunctionData({ abi:BUILDPROOF_ABI, functionName:"mintShipReceipt",
      args:[f.projectName, f.description, f.githubUrl, f.category, easData] }),
    value: BigInt(0),
  }];
  const isValid = f.projectName.length > 2 && f.description.length >= 20;

  if (!isConnected) return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
      <p className="text-white/50 mb-4 text-sm">Connect your wallet to ship a build</p>
      <ConnectWallet className="bg-[#0052FF] hover:bg-[#0039B3] px-6 py-3 rounded-xl font-bold text-sm" />
      <p className="text-xs text-white/25 mt-2">No seed phrase — Coinbase Smart Wallet</p>
    </div>
  );

  if (done) return (
    <div className="bg-gradient-to-br from-[#0052FF]/20 to-[#00C3FF]/10 border border-[#0052FF]/30 rounded-2xl p-8 text-center">
      <h3 className="text-2xl font-black mb-2">Shipped and Attested!</h3>
      <p className="text-white/50 text-sm mb-5">Ship Receipt NFT minted. AI agent verifying build shortly.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <a href={"https://basescan.org/tx/"+txHash} target="_blank"
           className="text-xs border border-white/20 px-4 py-2 rounded-xl hover:bg-white/10">Basescan</a>
        <button onClick={()=>{setF({projectName:"",description:"",githubUrl:"",category:"dapp"});setDone(false);}}
                className="text-xs bg-[#0052FF] px-4 py-2 rounded-xl">Ship Another</button>
      </div>
    </div>
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-lg font-black">Ship a Build</h2>
        <span className="ml-auto text-xs text-[#00C3FF] border border-[#00C3FF]/30 px-2 py-0.5 rounded-full">Gasless</span>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/40 mb-1 block">PROJECT NAME *</label>
          <input value={f.projectName} onChange={e=>s("projectName",e.target.value)} placeholder="e.g. BuildProof v2"
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#0052FF] focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-2 block">CATEGORY *</label>
          <div className="grid grid-cols-5 gap-2">
            {CATS.map(c => (
              <button key={c} onClick={()=>s("category",c)}
                      className={"p-2 rounded-xl border text-center text-xs capitalize transition-all " +
                        (f.category===c?"border-[#0052FF] bg-[#0052FF]/20":"border-white/10 text-white/40 hover:border-white/30")}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block">DESCRIPTION * (min 20 chars)</label>
          <textarea value={f.description} onChange={e=>s("description",e.target.value)} rows={3}
                    placeholder="What did you build? What problem does it solve?"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#0052FF] focus:outline-none resize-none" />
          <div className="text-right text-xs text-white/20 mt-1">{f.description.length} chars</div>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block">GITHUB / DEMO URL (for AI verification)</label>
          <input value={f.githubUrl} onChange={e=>s("githubUrl",e.target.value)} placeholder="https://github.com/you/project"
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#0052FF] focus:outline-none" />
          <p className="text-xs text-white/25 mt-1">AgentKit AI analyzes your repo and assigns a score</p>
        </div>
        <div className="bg-black/30 rounded-xl p-3 flex flex-wrap gap-3 text-xs text-white/30">
          <span>Mints on Base</span><span>EAS Attestation</span><span>Talent Score</span><span>Gas sponsored</span>
        </div>
        {isValid ? (
          <Transaction chainId={base.id} calls={calls}
            onSuccess={(res:any)=>{setTxHash(res.transactionReceipts?.[0]?.transactionHash||"");setDone(true);}}>
            <TransactionButton className="w-full bg-[#0052FF] hover:bg-[#0039B3] py-4 rounded-xl font-black transition-all" text="Mint Ship Receipt" />
            <TransactionStatus><TransactionStatusLabel /><TransactionStatusAction /></TransactionStatus>
            <TransactionToast><TransactionToastIcon /><TransactionToastLabel /><TransactionToastAction /></TransactionToast>
          </Transaction>
        ) : (
          <button disabled className="w-full bg-white/10 py-4 rounded-xl font-black opacity-40 cursor-not-allowed">Mint Ship Receipt</button>
        )}
      </div>
    </div>
  );
}