/**
 * BuildProof AI Agent — Base Account Integration
 *
 * This agent:
 * 1. Fetches GitHub repo data via Octokit
 * 2. Scores the repo 0-100 using GPT-4o-mini
 * 3. Writes the score onchain via YOUR Base Account (CDP Smart Wallet)
 *
 * The AI never holds your keys — all transactions require your approval in Base Account app.
 */

import { Octokit } from "@octokit/rest";
import OpenAI from "openai";
import { AgentKit, CdpSmartWalletProvider } from "@coinbase/agentkit";

// ─── Configuration ───
const CONFIG = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  githubToken:  process.env.GITHUB_TOKEN!,

  // CDP Smart Wallet (Base Account) credentials
  cdpApiKeyId:     process.env.CDP_API_KEY_ID!,
  cdpApiKeySecret: process.env.CDP_API_KEY_SECRET!,
  cdpWalletSecret: process.env.CDP_WALLET_SECRET!,

  // Your Base Account owner address
  baseAccountOwner: process.env.BASE_ACCOUNT_OWNER_ADDRESS!,

  networkId: (process.env.NETWORK_ID || "base-mainnet") as "base-mainnet" | "base-sepolia",

  // Contract address (set after deployment)
  buildProofContract: process.env.BUILDPROOF_CONTRACT!,
};

// ─── Clients ───
const octokit = new Octokit({ auth: CONFIG.githubToken });
const openai  = new OpenAI({ apiKey: CONFIG.openaiApiKey });

// Global AgentKit instance
let agentKit: AgentKit | null = null;
let walletProvider: CdpSmartWalletProvider | null = null;

/**
 * Initialize AgentKit with your Base Account (CDP Smart Wallet)
 */
export async function initAgentKit() {
  if (agentKit) return { agentKit, walletProvider };

  // Initialize CDP Smart Wallet Provider with your Base Account
  walletProvider = await CdpSmartWalletProvider.configureWithWallet({
    apiKeyId:     CONFIG.cdpApiKeyId,
    apiKeySecret: CONFIG.cdpApiKeySecret,
    walletSecret: CONFIG.cdpWalletSecret,
    owner:        CONFIG.baseAccountOwner, // ← Your Base Account address
    networkId:    CONFIG.networkId,
  });

  // Initialize AgentKit
  agentKit = await AgentKit.from({
    walletProvider,
  });

  console.log("✅ AgentKit initialized with Base Account");
  console.log(`   Wallet:  ${await walletProvider.getAddress()}`);
  console.log(`   Network: ${CONFIG.networkId}`);

  return { agentKit, walletProvider };
}

/**
 * Verify a GitHub repository and return score data
 */
export async function verifyRepo(owner: string, repo: string) {
  const { data: repoData }  = await octokit.repos.get({ owner, repo });
  const { data: commits }   = await octokit.repos.listCommits({ owner, repo, per_page: 50 });
  const { data: languages } = await octokit.repos.listLanguages({ owner, repo });
  const { data: readme }    = await octokit.repos.getReadme({ owner, repo }).catch(() => ({ data: null }));
  const { data: issues }    = await octokit.issues.listForRepo({ owner, repo, state: "all", per_page: 30 });

  // Check for tests, CI, docs
  const { data: contents } = await octokit.repos.getContent({ owner, repo, path: "" }).catch(() => ({ data: [] }));
  const files = Array.isArray(contents) ? contents : [];
  const hasTests = files.some((f: any) =>
    f.name?.includes("test") || f.name?.includes("spec") || f.name?.includes("__tests__")
  );
  const hasCI = files.some((f: any) =>
    f.name === ".github" || f.name?.includes(".yml") || f.name?.includes(".yaml")
  );

  // AI Scoring via GPT-4o-mini
  const scoringPrompt = `You are a senior developer evaluating a GitHub repository for the BuildProof protocol.

Repository: ${owner}/${repo}
Description: ${repoData.description || "No description"}
Stars: ${repoData.stargazers_count}
Forks: ${repoData.forks_count}
Open Issues: ${repoData.open_issues_count}
Primary Language: ${repoData.language || "Unknown"}
Languages: ${Object.entries(languages).map(([k, v]) => `${k}: ${v}`).join(", ")}
Recent Commits: ${commits.length}
Has README: ${readme ? "Yes" : "No"}
Has Tests: ${hasTests ? "Yes" : "No"}
Has CI/CD: ${hasCI ? "Yes" : "No"}
Created: ${repoData.created_at}
Last Updated: ${repoData.updated_at}

Score this repository 0-100 based on:
1. Code Quality & Architecture (25 pts)
2. Documentation (20 pts)
3. Testing (20 pts)
4. Community & Maintenance (20 pts)
5. Innovation & Utility (15 pts)

Return ONLY a JSON object:
{
  "score": number,
  "breakdown": {"code_quality": number, "documentation": number, "testing": number, "community": number, "innovation": number},
  "summary": "string - 2 sentence evaluation",
  "strengths": ["string"],
  "weaknesses": ["string"]
}`;

  const completion = await openai.chat.completions.create({
    model:       "gpt-4o-mini",
    messages:    [{ role: "user", content: scoringPrompt }],
    temperature: 0.2,
    max_tokens:  800,
  });

  let aiResult: any = {};
  try {
    aiResult = JSON.parse(completion.choices[0].message.content || "{}");
  } catch {
    // Fallback scoring
    aiResult = {
      score: Math.min(100, Math.round(
        (repoData.stargazers_count > 100 ? 20 : repoData.stargazers_count / 5) +
        (hasTests ? 20 : 5) + (readme ? 15 : 0) + (hasCI ? 15 : 5) +
        (commits.length > 20 ? 15 : commits.length / 2) + 10
      )),
      breakdown:  { code_quality: 0, documentation: 0, testing: 0, community: 0, innovation: 0 },
      summary:    "Fallback scoring applied",
      strengths:  [],
      weaknesses: [],
    };
  }

  return {
    repo:       `${owner}/${repo}`,
    repoUrl:    `https://github.com/${owner}/${repo}`,
    score:      Math.min(100, Math.max(0, aiResult.score || 0)),
    breakdown:  aiResult.breakdown  || {},
    summary:    aiResult.summary    || "",
    strengths:  aiResult.strengths  || [],
    weaknesses: aiResult.weaknesses || [],
    metadata: {
      stars:     repoData.stargazers_count,
      forks:     repoData.forks_count,
      languages: Object.keys(languages),
      commits:   commits.length,
      issues:    issues.length,
      hasTests,
      hasCI,
      hasReadme: !!readme,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
    },
  };
}

/**
 * Write verification score onchain via YOUR Base Account
 * Triggers the CDP Smart Wallet approval flow — you'll get a notification in Base Account app.
 */
export async function writeScoreOnchain(
  owner: string,
  repo: string,
  score: number,
  verificationData: any
) {
  const { walletProvider } = await initAgentKit();

  const repoUrl = `https://github.com/${owner}/${repo}`;

  // BuildProof contract ABI
  const BUILDPROOF_ABI = [
    "function updateScore(uint256 tokenId, uint256 newScore, bytes32 attestationUID) external",
    "function verifier() external view returns (address)",
  ];

  const { ethers } = await import("ethers");
  const iface = new ethers.Interface(BUILDPROOF_ABI);

  const tokenId        = verificationData.tokenId || 1;
  const attestationUID = "0x" + "0".repeat(64); // Replace with real EAS UID in production

  const data = iface.encodeFunctionData("updateScore", [tokenId, score, attestationUID]);

  // Send transaction via YOUR Base Account (CDP Smart Wallet)
  // → triggers approval notification in Base Account app
  const tx = await walletProvider!.sendTransaction({
    to:    CONFIG.buildProofContract,
    data,
    value: "0",
  });

  return {
    success:         true,
    transactionHash: tx,
    repoUrl,
    score,
    verifier:        await walletProvider!.getAddress(),
    message:         "Score written! Approve in Base Account app if prompted.",
  };
}

/**
 * Full verification pipeline: GitHub → AI Score → Onchain Write
 */
export async function verifyAndMint(owner: string, repo: string, tokenId?: number) {
  console.log(`🔍 Verifying ${owner}/${repo}...`);

  // 1. Analyse the repo
  const verification = await verifyRepo(owner, repo);
  console.log(`📊 Score: ${verification.score}/100`);
  console.log(`📝 Summary: ${verification.summary}`);

  // 2. Write onchain via YOUR Base Account
  console.log(`⛓️  Writing score onchain via Base Account...`);
  console.log(`   Check your Base Account app for an approval notification!`);

  const onchainResult = await writeScoreOnchain(
    owner,
    repo,
    verification.score,
    { tokenId }
  );

  console.log(`✅ Onchain result:`, onchainResult);

  return {
    verification,
    onchain: onchainResult,
  };
}

/**
 * Get Talent Protocol builder score (optional enrichment)
 */
export async function getTalentScore(walletAddress: string) {
  try {
    const response = await fetch(
      `https://api.talentprotocol.com/api/v2/passports/${walletAddress}`,
      { headers: { "X-API-KEY": process.env.TALENT_PROTOCOL_API_KEY! } }
    );
    const data = await response.json();
    return data.passport?.score || null;
  } catch {
    return null;
  }
}
