import { NextRequest, NextResponse } from "next/server";
const APP = process.env.NEXT_PUBLIC_URL || "https://buildproof.vercel.app";
export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({}));
  const btn  = body.untrustedData?.buttonIndex ?? 0;
  const img  = btn===1 ? APP+"/api/og?view=leaderboard" : btn===2 ? APP+"/api/og?view=latest" : APP+"/api/og";
  return new NextResponse([
    "<!DOCTYPE html><html><head>",
    '<meta property="fc:frame" content="vNext"/>',
    '<meta property="fc:frame:image" content="'+img+'"/>',
    '<meta property="fc:frame:image:aspect_ratio" content="1.91:1"/>',
    '<meta property="fc:frame:button:1" content="Leaderboard"/>',
    '<meta property="fc:frame:button:1:action" content="post"/>',
    '<meta property="fc:frame:button:2" content="Latest Ship"/>',
    '<meta property="fc:frame:button:2:action" content="post"/>',
    '<meta property="fc:frame:button:3" content="Ship Now"/>',
    '<meta property="fc:frame:button:3:action" content="link"/>',
    '<meta property="fc:frame:button:3:target" content="'+APP+'"/>',
    '<meta property="fc:frame:post_url" content="'+APP+'/api/frame"/>',
    "</head><body></body></html>",
  ].join(""), { headers:{"Content-Type":"text/html"} });
}