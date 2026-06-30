"use client";
import { useReadContract } from "wagmi";
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { base } from "viem/chains";
import { BUILDPROOF_CONTRACT, BUILDPROOF_ABI } from "@/lib/contract";

export default function Leaderboard() {
  const { data } = useReadContract({
    address: BUILDPROOF_CONTRACT as `0x${string}`,
    abi:BUILDPROOF_ABI, functionName:"getLeaderboard", args:[BigInt(10)], chainId:base.id,
  });
  const builders: string[] = (data as any)?.[0] ?? [];
  const counts:   bigint[] = (data as any)?.[1] ?? [];
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-xs font-bold text-white/50 mb-4">TOP BUILDERS</h3>
      {!builders.length
        ? <p className="text-center py-4 text-white/25 text-sm">No ships yet — be first!</p>
        : <div className="space-y-3">
            {builders.map((addr,i) => (
              <div key={addr} className="flex items-center gap-3">
                <span className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-black "+(i===0?"bg-yellow-500 text-black":i===1?"bg-gray-400 text-black":i===2?"bg-amber-700 text-white":"bg-white/10 text-white/40")}>{i+1}</span>
                <Identity address={addr as `0x${string}`} chain={base}>
                  <Avatar className="w-7 h-7 rounded-full" />
                  <Name className="text-sm text-white flex-1 truncate" />
                </Identity>
                <span className="text-xs text-[#0052FF] font-bold">{counts[i]?.toString()||0}</span>
              </div>
            ))}
          </div>
      }
    </div>
  );
}