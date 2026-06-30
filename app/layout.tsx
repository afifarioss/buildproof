import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
export const metadata: Metadata = {
  title: "BuildProof - Ship Onchain. Get Verified.",
  description: "Mint verifiable Ship Receipts on Base. AI-verified builds, Talent Protocol scores, USDC tips.",
  openGraph: { title:"BuildProof", description:"Ship onchain. Get verified.", images:["/og-image.png"] },
  other: {
    "fc:frame":"vNext",
    "fc:frame:image":"https://buildproof.vercel.app/api/og",
    "fc:frame:button:1":"Ship a Build",
    "fc:frame:button:2":"Leaderboard",
    "fc:frame:post_url":"https://buildproof.vercel.app/api/frame",
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}