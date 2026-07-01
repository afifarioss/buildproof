import { ethers, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`🔵 Deploying BuildProof with account: ${deployer.address}`);

  const AI_VERIFIER = process.env.AI_VERIFIER_ADDRESS;
  if (!AI_VERIFIER) throw new Error("❌ Set AI_VERIFIER_ADDRESS in .env");

  console.log(`🤖 AI Verifier: ${AI_VERIFIER}`);

  const BuildProof = await ethers.getContractFactory("BuildProofNFT");
  const bp = await BuildProof.deploy(AI_VERIFIER);
  await bp.waitForDeployment();

  const address = await bp.getAddress();
  console.log(`✅ BuildProofNFT deployed to: ${address}`);

  const schemaRegistry = await ethers.getContractAt(
    ["function register(string,address,bool) returns (bytes32)"],
    "0x4200000000000000000000000000000000000020"
  );
  const schemaTx = await schemaRegistry.register(
    "string projectName,string description,string githubUrl,string category,uint8 aiScore",
    ethers.ZeroAddress,
    false
  );
  await schemaTx.wait();
  console.log(`📜 EAS Schema registered`);

  console.log(`⏳ Waiting 30s for Basescan indexing...`);
  await new Promise((r) => setTimeout(r, 30000));

  try {
    await run("verify:verify", { address, constructorArguments: [AI_VERIFIER] });
    console.log(`✅ Contract verified on Basescan`);
  } catch (err) {
    console.log(`⚠️ Verification skipped or failed`);
  }

  console.log(`\n🎉 Deployment complete!`);
  console.log(`📊 Contract: ${address}`);
  console.log(`🔍 Basescan: https://basescan.org/address/${address}`);
}

main().catch((error) => {
  console.error("💥 Deployment failed:", error);
  process.exit(1);
});
