import hre from "hardhat";

async function main() {
  const stakingContractAddress = process.argv[2];
  const rewardTokenAddress = process.argv[3];

  if (!stakingContractAddress || !rewardTokenAddress) {
    console.error("Usage: npx hardhat run scripts/claimRewards.ts --network <network> <stakingContractAddress> <rewardTokenAddress>");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();
  console.log("Claiming rewards with account:", signer.address);

  // Get contracts
  const StakingContract = await hre.ethers.getContractFactory("StakingContract");
  const stakingContract = StakingContract.attach(stakingContractAddress);

  const RewardToken = await hre.ethers.getContractFactory("RewardToken");
  const rewardToken = RewardToken.attach(rewardTokenAddress);

  // Get pending reward
  const pendingReward = await stakingContract.getPendingReward(signer.address);
  console.log("Pending reward:", hre.ethers.formatEther(pendingReward));

  if (pendingReward === 0n) {
    console.log("No rewards to claim!");
    process.exit(0);
  }

  // Get current reward token balance
  const balanceBefore = await rewardToken.balanceOf(signer.address);
  console.log("Reward token balance before:", hre.ethers.formatEther(balanceBefore));

  // Claim rewards
  console.log("Claiming rewards...");
  const claimTx = await stakingContract.claimRewards();
  await claimTx.wait();
  console.log("Rewards claimed!");

  // Get updated balances
  const balanceAfter = await rewardToken.balanceOf(signer.address);
  const newPendingReward = await stakingContract.getPendingReward(signer.address);

  console.log("\n=== Claim Summary ===");
  console.log("Reward token balance after:", hre.ethers.formatEther(balanceAfter));
  console.log("Rewards claimed:", hre.ethers.formatEther(balanceAfter - balanceBefore));
  console.log("New pending reward:", hre.ethers.formatEther(newPendingReward));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

