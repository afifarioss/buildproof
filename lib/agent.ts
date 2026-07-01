import { Octokit } from "@octokit/rest";
import OpenAI from "openai";
import { AgentKit, CdpSmartWalletProvider } from "@coinbase/agentkit";

const CONFIG = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  githubToken: process.env.GITHUB_TOKEN!,
  cdpApiKeyId: process.env.CDP_API_KEY_ID!,
  cdpApiKeySecret: process.env.CDP_API_KEY_SECRET!,
  cdpWalletSecret: process.env.CDP_WALLET_SECRET!,
  baseAccountOwner: process.env.BASE_ACCOUNT_OWNER_ADDRESS!,
  networkId: (process.env.NETWORK_ID || "base-mainnet") as "base-mainnet" | "base-sepolia",
  buildProofContract: process.env.BUILDPROOF_CONTRACT!,
};

const octokit = new Octokit({ auth: CONFIG.githubToken });
const openai = new OpenAI({ apiKey: CONFIG.openaiApiKey });

let agentKit: AgentKit | null = null;
let walletProvider: CdpSmartWalletProvider | null = null;

export async function initAgentKit() {
  if (agentKit) return { agentKit, walletProvider };
  walletProvider = await CdpSmartWalletProvider.configureWithWallet({
    apiKeyId: CONFIG.cdpApiKeyId,
    apiKeySecret: CONFIG.cdpApiKeySecret,
    walletSecret: CONFIG.cdpWalletSecret,
    owner: CONFIG.baseAccountOwner,
    networkId: CONFIG.networkId,
  });
  agentKit = await AgentKit.from({ walletProvider });
  console.log("✅ AgentKit initialized");
  console.log(` Wallet: ${await walletProvider.getAddress()}`);
  return { agentKit, walletProvider };
}

export async function verifyRepo(owner: string, repo: string) {
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const { data: commits } = await octokit.repos.listCommits({ owner, repo, per_page: 50 });
  const { data: languages } = await octokit.repos.listLanguages({ owner, repo });
  const { data: readme } = await octokit.repos.getReadme({ owner, repo }).catch(() => ({ data: null }));
  const { data: issues } = await octokit.issues.listForRepo({ owner, repo, state: "all", per_page: 30 });

  const { data: contents } = await octokit.repos.getContent({ owner, repo, path: "" }).catch(() => ({ data: [] }));
  const files = Array.isArray(contents) ? contents : [];
  const hasTests = files.some((f: any) => f.name?.includes("test") || f.name?.includes("spec"));
  const hasCI = files.some((f: any) => f.name === ".github" || f.name?.includes(".yml"));

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
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: scoringPrompt }],
    temperature: 0.2,
    max_tokens: 800,
  });

  let aiResult: any = {};
  try {
    aiResult = JSON.parse(completion.choices[0].message.content || "{}");
  } catch {
    aiResult = {
      score: Math.min(100, Math.round(
        (repoData.stargazers_count > 100 ? 20 : repoData.stargazers_count / 5) +
        (hasTests ? 20 : 5) + (readme ? 15 : 0) + (hasCI ? 15 : 5) +
        (commits.length > 20 ? 15 : commits.length / 2) + 10
      )),
      breakdown: { code_quality: 0, documentation: 0, testing: 0, community: 0, innovation: 0 },
      summary: "Fallback scoring applied",
      strengths: [],
      weaknesses: [],
    };
  }

  return {
    repo: `${owner}/${repo}`,
    repoUrl: `https://github.com/${owner}/${repo}`,
    score: Math.min(100, Math.max(0, aiResult.score || 0)),
    breakdown: aiResult.breakdown || {},
    summary: aiResult.summary || "",
    strengths: aiResult.strengths || [],
    weaknesses: aiResult.weaknesses || [],
    metadata: {
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      languages: Object.keys(languages),
      commits: commits.length,
      issues: issues.length,
      hasTests, hasCI, hasReadme: !!readme,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
    },
  };
}

export async function writeScoreOnchain(tokenId: number, score: number) {
  const { walletProvider } = await initAgentKit();
  const BUILDPROOF_ABI = ["function setAIVerification(uint256 tokenId, uint8 aiScore, bool verified) external"];
  const { ethers } = await import("ethers");
  const iface = new ethers.Interface(BUILDPROOF_ABI);
  const verified = score >= 50;
  const data = iface.encodeFunctionData("setAIVerification", [
    tokenId,
    Math.min(100, Math.max(0, score)),
    verified,
  ]);
  const tx = await walletProvider!.sendTransaction({
    to: CONFIG.buildProofContract,
    data,
    value: "0",
  });
  return { success: true, transactionHash: tx, score, verified, message: "AI Verification written onchain!" };
}

export async function verifyBuild(body: { tokenId: number; projectName: string; description: string; githubUrl: string; category: string }) {
  const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  const [, owner, repo] = match;
  const verification = await verifyRepo(owner, repo);
  const onchain = await writeScoreOnchain(body.tokenId, verification.score);
  return { score: verification.score, verified: onchain.verified, summary: verification.summary, transactionHash: onchain.transactionHash };
}

export async function getTalentScore(walletAddress: string) {
  try {
    const response = await fetch(
      `https://api.talentprotocol.com/api/v2/passports/${walletAddress}`,
      { headers: { "X-API-KEY": process.env.TALENT_PROTOCOL_API_KEY! } }
    );
    const data = await response.json();
    return data.passport?.score || null;
  } catch { return null; }
}
