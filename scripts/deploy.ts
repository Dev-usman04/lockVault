import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const INITIAL_SUPPLY = 1000000; // 1M tokens

  // Deploy StakingToken
  console.log("\nDeploying StakingToken...");
  const StakingToken = await hre.ethers.getContractFactory("StakingToken");
  const stakingToken = await StakingToken.deploy(INITIAL_SUPPLY);
  await stakingToken.waitForDeployment();
  const stakingTokenAddress = await stakingToken.getAddress();
  console.log("StakingToken deployed to:", stakingTokenAddress);

  // Deploy RewardToken
  console.log("\nDeploying RewardToken...");
  const RewardToken = await hre.ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy(INITIAL_SUPPLY);
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("RewardToken deployed to:", rewardTokenAddress);

  // Deploy StakingContract
  console.log("\nDeploying StakingContract...");
  const StakingContract = await hre.ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(stakingTokenAddress, rewardTokenAddress);
  await stakingContract.waitForDeployment();
  const stakingContractAddress = await stakingContract.getAddress();
  console.log("StakingContract deployed to:", stakingContractAddress);

  // Set staking contract in reward token
  console.log("\nSetting staking contract in RewardToken...");
  await rewardToken.setStakingContract(stakingContractAddress);
  console.log("Staking contract set successfully!");

  console.log("\n=== Deployment Summary ===");
  console.log("StakingToken:", stakingTokenAddress);
  console.log("RewardToken:", rewardTokenAddress);
  console.log("StakingContract:", stakingContractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

