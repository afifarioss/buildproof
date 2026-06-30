import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
export default {
  solidity:{ version:"0.8.25", settings:{ optimizer:{enabled:true,runs:200}, viaIR:true } },
  networks:{
    base:{ url:"https://mainnet.base.org", accounts:[process.env.DEPLOYER_PRIVATE_KEY!], chainId:8453 },
    "base-sepolia":{ url:"https://sepolia.base.org", accounts:[process.env.DEPLOYER_PRIVATE_KEY!], chainId:84532 },
  },
  etherscan:{
    apiKey:{ base:process.env.BASESCAN_API_KEY! },
    customChains:[{ network:"base", chainId:8453, urls:{ apiURL:"https://api.basescan.org/api", browserURL:"https://basescan.org" } }],
  },
};