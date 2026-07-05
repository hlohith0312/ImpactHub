const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying ImpactForge to Sepolia...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const ImpactForge = await ethers.getContractFactory("ImpactForge");
  const contract    = await ImpactForge.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ImpactForge deployed to:", address);
  console.log("View on Etherscan: https://sepolia.etherscan.io/address/" + address);

  // Save address and ABI to a JSON file the backend can read
  const artifact = require(path.join(
    __dirname, "..", "artifacts", "contracts", "ImpactForge.sol", "ImpactForge.json"
  ));

  const deployment = {
    address:  address,
    network:  "sepolia",
    deployer: deployer.address,
    abi:      artifact.abi,
    deployedAt: new Date().toISOString()
  };

  const outPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log("Deployment info saved to BLOCKCHAIN/deployment.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
