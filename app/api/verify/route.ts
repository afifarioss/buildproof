import { NextRequest, NextResponse } from "next/server";
import { verifyBuild } from "@/lib/agent";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  if (req.headers.get("x-buildproof-secret") !== process.env.VERIFY_WEBHOOK_SECRET)
    return NextResponse.json({error:"Unauthorized"},{status:401});
  const body = await req.json();
  if (!body.tokenId || !body.projectName) return NextResponse.json({error:"Missing fields"},{status:400});
  try { return NextResponse.json({success:true,...(await verifyBuild(body))}); }
  catch(e:any){ return NextResponse.json({error:e.message},{status:500}); }
}