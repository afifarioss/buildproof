"use client";
import { ReactNode } from "react";
import { base } from "viem/chains";
import { createConfig, http, WagmiProvider } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";

const config = createConfig({
  chains: [base],
  connectors: [coinbaseWallet({ appName:"BuildProof", appLogoUrl:"/logo.png", preference:"smartWalletOnly" })],
  transports: { [base.id]: http() },
});
const qc = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_CDP_API_KEY!}
          chain={base}
          config={{ paymaster:process.env.NEXT_PUBLIC_PAYMASTER_URL, appearance:{name:"BuildProof",logo:"/logo.png",mode:"auto",theme:"base"} }}
        >{children}</OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}