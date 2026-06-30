import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
export const runtime = "edge";
export async function GET(req: NextRequest) {
  const sp    = new URL(req.url).searchParams;
  const proj  = sp.get("project") || "BuildProof";
  const score = sp.get("score")   || "";
  const ships = sp.get("ships")   || "";
  const bg    = "linear-gradient(135deg,#0A0A0F 0%,#0D1B4B 50%,#0A0A0F 100%)";
  return new ImageResponse(
    ({
      type: "div",
      props: {
        style:{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:bg,padding:"60px",fontFamily:"monospace",justifyContent:"space-between"},
        children:[
          { type:"div", props:{ style:{display:"flex",alignItems:"center",gap:"16px"}, children:[
            { type:"div", props:{ style:{width:48,height:48,borderRadius:"50%",background:"#0052FF",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:"bold",fontSize:16}, children:"BP" }},
            { type:"span", props:{ style:{color:"white",fontSize:26,fontWeight:"bold"}, children:"BuildProof" }},
            { type:"span", props:{ style:{color:"#ffffff44",fontSize:14,border:"1px solid #ffffff22",padding:"2px 14px",borderRadius:20}, children:"Base Mainnet" }},
          ]}},
          { type:"div", props:{ style:{display:"flex",flexDirection:"column",gap:"10px"}, children:[
            { type:"div", props:{ style:{color:"#60A5FA",fontSize:16}, children:"SHIP RECEIPT" }},
            { type:"div", props:{ style:{color:"white",fontSize:56,fontWeight:900,lineHeight:1.1}, children:proj }},
          ]}},
          { type:"div", props:{ style:{display:"flex",gap:"14px"}, children:[
            ...(score ? [{ type:"div", props:{ style:{background:"#0052FF22",border:"1px solid #0052FF44",color:"#60A5FA",padding:"8px 18px",borderRadius:10,fontSize:18}, children:"AI "+score+"/100" }}] : []),
            ...(ships ? [{ type:"div", props:{ style:{background:"#ffffff11",border:"1px solid #ffffff22",color:"white",padding:"8px 18px",borderRadius:10,fontSize:18}, children:ships+" ships" }}] : []),
            { type:"div", props:{ style:{background:"#00C3FF22",border:"1px solid #00C3FF44",color:"#00C3FF",padding:"8px 18px",borderRadius:10,fontSize:13}, children:"Gasless on Base | afifarioss.base.eth" }},
          ]}},
        ],
      },
    }),
    { width:1200, height:630 }
  );
}