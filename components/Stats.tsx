"use client";
import { useReadContract } from "wagmi";
import { base } from "viem/chains";
import { BUILDPROOF_CONTRACT, BUILDPROOF_ABI } from "@/lib/contract";
export default function Stats() {
  const { data } = useReadContract({ address:BUILDPROOF_CONTRACT as `0x${string}`, abi:BUILDPROOF_ABI, functionName:"totalShips", chainId:base.id });
  const items = [
    { label:"Ships Minted", value:data?.toString()||"0" },
    { label:"AI Verified",  value:"-" },
    { label:"USDC Tipped",  value:"$-" },
    { label:"Network",      value:"Base" },
  ];
  return (
    <div className="border-y border-white/10 py-4">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {items.map(s=>(
          <div key={s.label}>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs text-white/35 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}