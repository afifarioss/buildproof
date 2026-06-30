import { ethers, run } from "hardhat";
async function main() {
  const [dep] = await ethers.getSigners();
  const AI    = process.env.AI_VERIFIER_ADDRESS!;
  if (!AI) throw new Error("Set AI_VERIFIER_ADDRESS");
  const C  = await ethers.getContractFactory("BuildProofNFT");
  const bp = await C.deploy(AI);
  await bp.waitForDeployment();
  const addr = await bp.getAddress();
  console.log("Deployed:", addr);
  const sr = await ethers.getContractAt(
    ["function register(string,address,bool) returns (bytes32)"],
    "0x4200000000000000000000000000000000000020"
  );
  await (await sr.register("string projectName,string description,string githubUrl,string category,uint8 aiScore",ethers.ZeroAddress,false)).wait();
  console.log("EAS schema registered");
  await new Promise(r=>setTimeout(r,30000));
  try { await run("verify:verify",{address:addr,constructorArguments:[AI]}); } catch {}
  console.log("Done — update BUILDPROOF_CONTRACT in lib/contract.ts:", addr);
}
main().catch(console.error);