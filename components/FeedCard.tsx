"use client";
import { useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { Identity, Name, Avatar, Address } from "@coinbase/onchainkit/identity";
import { Transaction, TransactionButton } from "@coinbase/onchainkit/transaction";
import { base } from "viem/chains";
import { encodeFunctionData, parseUnits } from "viem";
import { BUILDPROOF_CONTRACT, BUILDPROOF_ABI, USDC_ADDRESS, ERC20_ABI } from "@/lib/contract";

export default function FeedCard() {
  const { data: total } = useReadContract({ address:BUILDPROOF_CONTRACT as `0x${string}`, abi:BUILDPROOF_ABI, functionName:"totalShips", chainId:base.id });
  const n   = Number(total ?? 0);
  const ids = Array.from({length:Math.min(n,6)},(_,i)=>n-i).filter(x=>x>0);
  const { data: rows } = useReadContracts({ contracts: ids.map(id=>({
    address:BUILDPROOF_CONTRACT as `0x${string}`, abi:BUILDPROOF_ABI, functionName:"receipts", args:[BigInt(id)], chainId:base.id,
  }))});
  if (!n) return <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/25 text-sm">No ships yet — be first!</div>;
  return (
    <div className="space-y-4">
      {ids.map((id,i) => { const r=(rows?.[i]?.result) as any; return r ? <Card key={id} tokenId={id} r={r}/> : null; })}
    </div>
  );
}

function Card({ tokenId, r }: { tokenId:number; r:any }) {
  const [tip,setTip] = useState("5");
  const [show,setShow] = useState(false);
  const amt = parseUnits(tip||"1",6);
  const tipCalls = [
    { to:USDC_ADDRESS as `0x${string}`, data:encodeFunctionData({abi:ERC20_ABI,functionName:"approve",args:[BUILDPROOF_CONTRACT,amt]}) },
    { to:BUILDPROOF_CONTRACT as `0x${string}`, data:encodeFunctionData({abi:BUILDPROOF_ABI,functionName:"tipBuilder",args:[BigInt(tokenId),amt]}) },
  ];
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <Identity address={r.builder as `0x${string}`} chain={base}>
          <Avatar className="w-10 h-10 rounded-full flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Name className="text-sm font-bold text-white"/>
              {r.aiVerified && <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full">AI Verified</span>}
            </div>
            <Address className="text-xs text-white/30"/>
          </div>
        </Identity>
        <span className="text-xs text-white/40 border border-white/10 px-2 py-0.5 rounded-full capitalize">{r.category}</span>
      </div>
      <h4 className="font-black text-base mb-1">{r.projectName}</h4>
      <p className="text-sm text-white/50 mb-3 line-clamp-2">{r.description}</p>
      <div className="flex flex-wrap gap-2 text-xs mb-4">
        {r.aiScore>0 && <span className="bg-[#0052FF]/10 text-[#60A5FA] px-2 py-0.5 rounded-full">AI {r.aiScore}/100</span>}
        {Number(r.builderScore)>0 && <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">Score {r.builderScore.toString()}</span>}
        {Number(r.tips)>0 && <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">${(Number(r.tips)/1e6).toFixed(2)} USDC</span>}
        {r.githubUrl && <a href={r.githubUrl} target="_blank" className="text-white/30 hover:text-white">GitHub</a>}
      </div>
      {!show
        ? <button onClick={()=>setShow(true)} className="w-full border border-white/10 hover:border-[#0052FF]/40 py-2 rounded-xl text-xs text-white/40 hover:text-white transition-all">Send USDC Tip</button>
        : <div className="space-y-2">
            <div className="flex gap-2">
              {["1","5","10","25"].map(a=>(
                <button key={a} onClick={()=>setTip(a)} className={"flex-1 py-1.5 rounded-lg text-xs border "+(tip===a?"border-[#0052FF] bg-[#0052FF]/20":"border-white/10 text-white/35")}>${a}</button>
              ))}
            </div>
            <Transaction chainId={base.id} calls={tipCalls}>
              <TransactionButton className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-xl text-xs font-bold" text={"Tip $"+tip+" USDC"}/>
            </Transaction>
            <button onClick={()=>setShow(false)} className="w-full text-xs text-white/25">cancel</button>
          </div>
      }
    </div>
  );
}