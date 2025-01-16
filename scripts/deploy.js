// scripts/deploy.js

const { ethers } = require("hardhat");

async function main() {
  const confirmations = 2; // Wait for 2 confirmations

  // Get the deployment account
  const [deployer] = await ethers.getSigners();

  const deployerAddress = await deployer.getAddress();
  console.log("Deploying contracts with the account:", deployerAddress);

  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log("Account balance:", ethers.formatEther(balance));

  // Get the contract factory
  const FlashArb = await ethers.getContractFactory("KeeganSwap");
  console.log("Deploying KeeganSwap...");

  // Deploy the contract
  const flashArb = await FlashArb.deploy();

  // Get the deployment transaction
  const deploymentTx = flashArb.deploymentTransaction();
  if (deploymentTx) {
    // Wait for deployment to finish
    await deploymentTx.wait(confirmations);
  }

  const flashArbAddress = await flashArb.getAddress();
  console.log("KeeganSwap deployed to:", flashArbAddress);
}

// Run the script and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  });
