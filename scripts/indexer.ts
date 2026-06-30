import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BUILDPROOF_CONTRACT, BUILDPROOF_ABI } from "../lib/contract";
const client = createPublicClient({ chain:base, transport:http("https://mainnet.base.org") });
async function main() {
  console.log("Indexer watching ShipReceiptMinted...");
  client.watchContractEvent({
    address: BUILDPROOF_CONTRACT as `0x${string}`,
    abi:BUILDPROOF_ABI, eventName:"ShipReceiptMinted",
    onLogs: async logs => {
      for (const log of logs) {
        const { tokenId,builder,projectName } = log.args as any;
        console.log("#"+tokenId+" "+builder+" "+projectName);
        const r = await client.readContract({ address:BUILDPROOF_CONTRACT as `0x${string}`, abi:BUILDPROOF_ABI, functionName:"receipts", args:[tokenId] }) as any;
        const res = await fetch(process.env.APP_URL+"/api/verify",{
          method:"POST",
          headers:{"Content-Type":"application/json","x-buildproof-secret":process.env.VERIFY_WEBHOOK_SECRET!},
          body:JSON.stringify({tokenId:Number(tokenId),projectName:r[1],description:r[2],githubUrl:r[3],category:r[4]}),
        });
        const d = await res.json();
        console.log("Verified #"+tokenId+" score="+d.score+" verified="+d.verified);
      }
    },
  });
  await new Promise(()=>{});
}
main().catch(console.error);