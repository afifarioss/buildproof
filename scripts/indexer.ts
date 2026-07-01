import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BUILDPROOF_CONTRACT, BUILDPROOF_ABI } from "../lib/contract";

const client = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

async function main() {
  if (BUILDPROOF_CONTRACT === "0x0000000000000000000000000000000000000000") {
    console.error("❌ ERROR: BUILDPROOF_CONTRACT not set. Update lib/contract.ts or .env");
    process.exit(1);
  }

  console.log(`🔵 BuildProof Indexer starting...`);
  console.log(`📡 Watching contract: ${BUILDPROOF_CONTRACT}`);

  client.watchContractEvent({
    address: BUILDPROOF_CONTRACT,
    abi: BUILDPROOF_ABI,
    eventName: "ShipReceiptMinted",
    onLogs: async (logs) => {
      for (const log of logs) {
        const { tokenId, builder, projectName } = log.args as any;
        console.log(`🚢 New Ship! #${tokenId} by ${builder} — ${projectName}`);

        const receipt = await client.readContract({
          address: BUILDPROOF_CONTRACT,
          abi: BUILDPROOF_ABI,
          functionName: "receipts",
          args: [tokenId],
        }) as any;

        try {
          const res = await fetch(`${process.env.APP_URL}/api/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-buildproof-secret": process.env.VERIFY_WEBHOOK_SECRET!,
            },
            body: JSON.stringify({
              tokenId: Number(tokenId),
              projectName: receipt[1],
              description: receipt[2],
              githubUrl: receipt[3],
              category: receipt[4],
            }),
          });
          const data = await res.json();
          console.log(`✅ Verified #${tokenId} | Score: ${data.score} | Verified: ${data.verified}`);
        } catch (err: any) {
          console.error(`❌ Failed to verify #${tokenId}:`, err.message);
        }
      }
    },
  });

  console.log("👀 Indexer is watching... Press Ctrl+C to stop");
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("💥 Indexer crashed:", err);
  process.exit(1);
});
