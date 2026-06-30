import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  experimental:{ serverComponentsExternalPackages:["@coinbase/agentkit"] },
  images:{ domains:["api.talentprotocol.com","avatar.vercel.sh"] },
  async headers() { return [{ source:"/api/frame", headers:[{key:"Access-Control-Allow-Origin",value:"*"}] }]; },
};
export default nextConfig;