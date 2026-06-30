import { Octokit } from "@octokit/rest";
import { createWalletClient, http, encodeFunctionData } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { BUILDPROOF_CONTRACT, BUILDPROOF_ABI } from "./contract";
import OpenAI from "openai";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeRepo(url: string) {
  const m = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (!m) return null;
  const [,owner,repo] = m;
  try {
    const [rd,commits,langs] = await Promise.all([
      octokit.repos.get({owner,repo}),
      octokit.repos.listCommits({owner,repo,per_page:100}),
      octokit.repos.listLanguages({owner,repo}),
    ]);
    const r = rd.data;
    const last = commits.data[0]?.commit?.author?.date;
    const days = last ? Math.floor((Date.now()-new Date(last).getTime())/86400000) : 999;
    let hasReadme=false, hasTests=false;
    try { await octokit.repos.getReadme({owner,repo}); hasReadme=true; } catch {}
    try {
      const tree = await octokit.git.getTree({owner,repo,tree_sha:"HEAD",recursive:"1"});
      hasTests = tree.data.tree.some(f=>f.path?.match(/test|spec|__tests__/i));
    } catch {}
    return { stars:r.stargazers_count||0, forks:r.forks_count||0, commits:commits.data.length,
             languages:Object.keys(langs.data), hasReadme, hasTests, days, topics:r.topics||[] };
  } catch { return null; }
}

async function scoreAI(a:any, name:string, desc:string, cat:string) {
  const prompt = a
    ? "Score 0-100 and verify Base ecosystem build. Name:\""+name+"\" cat:"+cat+" desc:"+desc+
      " stats:stars="+a.stars+",commits="+a.commits+",langs="+a.languages+",readme="+a.hasReadme+",tests="+a.hasTests+",days="+a.days+
      " Rubric:quality30,relevance25,docs15,recency15,tests15. JSON:{score:n,verified:b,reasoning:s}"
    : "Score 0-100 desc-only: \""+name+"\" "+cat+" "+desc+". JSON:{score:n,verified:false,reasoning:s}";
  const res = await openai.chat.completions.create({
    model:"gpt-4o-mini", messages:[{role:"user",content:prompt}],
    response_format:{type:"json_object"}, max_tokens:120,
  });
  try { return JSON.parse(res.choices[0].message.content||"{}"); }
  catch { return {score:50,verified:false,reasoning:"error"}; }
}

export async function verifyBuild(p:{tokenId:number;projectName:string;description:string;githubUrl:string;category:string}) {
  const a = p.githubUrl ? await analyzeRepo(p.githubUrl) : null;
  const { score, verified, reasoning } = await scoreAI(a, p.projectName, p.description, p.category);
  const clamped = Math.max(0,Math.min(100,Math.round(score||50)));
  console.log("[Agent] #"+p.tokenId+" "+p.projectName+" -> "+clamped+" verified="+verified+" "+reasoning);
  const account = privateKeyToAccount(process.env.AI_VERIFIER_PRIVATE_KEY as `0x${string}`);
  const client  = createWalletClient({ account, chain:base, transport:http() });
  const hash    = await client.sendTransaction({
    to:   BUILDPROOF_CONTRACT as `0x${string}`,
    data: encodeFunctionData({ abi:BUILDPROOF_ABI, functionName:"setAIVerification", args:[BigInt(p.tokenId),clamped,verified] }),
  });
  return { score:clamped, verified, txHash:hash };
}