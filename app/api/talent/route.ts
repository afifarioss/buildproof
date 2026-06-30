import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get("address");
  if (!address) return NextResponse.json({score:0});
  try {
    const res = await fetch("https://api.talentprotocol.com/api/v2/passports/"+address,{
      headers:{"X-API-KEY":process.env.TALENT_PROTOCOL_API_KEY!}, next:{revalidate:300},
    });
    if (!res.ok) return NextResponse.json({score:0});
    const d = await res.json();
    return NextResponse.json({score:d.passport?.score||0,humanMark:d.passport?.human_checkmark||false});
  } catch { return NextResponse.json({score:0}); }
}