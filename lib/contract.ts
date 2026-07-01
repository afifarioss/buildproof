export const BUILDPROOF_CONTRACT = (process.env.NEXT_PUBLIC_BUILDPROOF_CONTRACT || "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const PROTOCOL_OWNER = "0x7845D45d9E53268EBFf3C4a9daBb994cE5b93918" as const;

export const BUILDPROOF_ABI = [
  {
    name: "mintShipReceipt",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectName", type: "string" },
      { name: "description", type: "string" },
      { name: "githubUrl", type: "string" },
      { name: "category", type: "string" },
      { name: "easData", type: "bytes" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "tipBuilder",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "usdcAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "setAIVerification",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "aiScore", type: "uint8" },
      { name: "verified", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "receipts",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "builder", type: "address" },
      { name: "projectName", type: "string" },
      { name: "description", type: "string" },
      { name: "githubUrl", type: "string" },
      { name: "category", type: "string" },
      { name: "timestamp", type: "uint256" },
      { name: "builderScore", type: "uint256" },
      { name: "easUID", type: "bytes32" },
      { name: "tips", type: "uint256" },
      { name: "aiVerified", type: "bool" },
      { name: "aiScore", type: "uint8" },
    ],
  },
  {
    name: "getLeaderboard",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "limit", type: "uint256" }],
    outputs: [
      { name: "builders", type: "address[]" },
      { name: "shipCounts", type: "uint256[]" },
    ],
  },
  {
    name: "getBuilderReceipts",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "builder", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "totalShips",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ShipReceiptMinted",
    type: "event",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "builder", type: "address", indexed: true },
      { name: "projectName", type: "string" },
      { name: "easUID", type: "bytes32" },
      { name: "timestamp", type: "uint256" },
    ],
  },
  {
    name: "TipSent",
    type: "event",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "tipper", type: "address", indexed: true },
      { name: "builder", type: "address", indexed: true },
      { name: "amount", type: "uint256" },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
