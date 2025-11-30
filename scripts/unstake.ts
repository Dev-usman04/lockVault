import hre from "hardhat";

async function main() {
  const stakingContractAddress = process.argv[2];
  const amount = process.argv[3] || "50"; // Default 50 tokens

  if (!stakingContractAddress) {
    console.error("Usage: npx hardhat run scripts/unstake.ts --network <network> <stakingContractAddress> [amount]");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();
  console.log("Unstaking with account:", signer.address);

  // Get contract
  const StakingContract = await hre.ethers.getContractFactory("StakingContract");
  const stakingContract = StakingContract.attach(stakingContractAddress);

  // Parse amount
  const unstakeAmount = hre.ethers.parseEther(amount);
  console.log(`Unstaking ${amount} tokens (${unstakeAmount.toString()} wei)`);

  // Get current stake info
  const [stakedAmount, pendingReward] = await stakingContract.getUserStake(signer.address);
  console.log("Current staked amount:", hre.ethers.formatEther(stakedAmount));
  console.log("Pending reward:", hre.ethers.formatEther(pendingReward));

  if (stakedAmount < unstakeAmount) {
    console.error("Insufficient staked amount!");
    process.exit(1);
  }

  // Unstake
  console.log("Unstaking tokens...");
  const unstakeTx = await stakingContract.unstake(unstakeAmount);
  await unstakeTx.wait();
  console.log("Unstaking confirmed!");

  // Get updated stake info
  const [newStakedAmount, newPendingReward] = await stakingContract.getUserStake(signer.address);
  console.log("\n=== Updated Stake Info ===");
  console.log("Staked amount:", hre.ethers.formatEther(newStakedAmount));
  console.log("Pending reward:", hre.ethers.formatEther(newPendingReward));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

