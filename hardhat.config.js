require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.26",
  networks: {
    // Local Hardhat Network for Testing
    hardhat: {
      chainId: 1337, // Default Hardhat chainId
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337, // Should match Hardhat's chainId if using Hardhat node
    },
    // re.al Network
    real: {
      url: "https://tangible-real.gateway.tenderly.co/", // Primary RPC URL
      // Alternatively, use the secondary RPC URL if needed
      // url: "https://real.drpc.org",
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      chainId: 111188, // re.al chainId
    },
  },
  etherscan: {
    apiKey: {
      'real': 'empty'
    },
    customChains: [
      {
        network: "real",
        chainId: 111188,
        urls: {
          apiURL: "https://explorer.re.al/api",
          browserURL: "https://explorer.re.al"
        }
      }
    ]
  },
  // Other Hardhat configurations like paths, mocha settings, etc., can be added here
};
