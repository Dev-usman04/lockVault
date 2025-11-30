import hre from "hardhat";

async function main() {
  // Get contract addresses from command line arguments or use defaults
  const stakingTokenAddress = process.argv[2];
  const stakingContractAddress = process.argv[3];
  const amount = process.argv[4] || "100"; // Default 100 tokens

  if (!stakingTokenAddress || !stakingContractAddress) {
    console.error("Usage: npx hardhat run scripts/stake.ts --network <network> <stakingTokenAddress> <stakingContractAddress> [amount]");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();
  console.log("Staking with account:", signer.address);

  // Get contracts
  const StakingToken = await hre.ethers.getContractFactory("StakingToken");
  const stakingToken = StakingToken.attach(stakingTokenAddress);

  const StakingContract = await hre.ethers.getContractFactory("StakingContract");
  const stakingContract = StakingContract.attach(stakingContractAddress);

  // Parse amount
  const stakeAmount = hre.ethers.parseEther(amount);
  console.log(`Staking ${amount} tokens (${stakeAmount.toString()} wei)`);

  // Check balance
  const balance = await stakingToken.balanceOf(signer.address);
  console.log("Current balance:", hre.ethers.formatEther(balance));
  
  if (balance < stakeAmount) {
    console.error("Insufficient balance!");
    process.exit(1);
  }

  // Approve and stake
  console.log("Approving staking contract...");
  const approveTx = await stakingToken.approve(stakingContractAddress, stakeAmount);
  await approveTx.wait();
  console.log("Approval confirmed!");

  console.log("Staking tokens...");
  const stakeTx = await stakingContract.stake(stakeAmount);
  await stakeTx.wait();
  console.log("Staking confirmed!");

  // Get updated stake info
  const [stakedAmount, pendingReward] = await stakingContract.getUserStake(signer.address);
  console.log("\n=== Stake Info ===");
  console.log("Staked amount:", hre.ethers.formatEther(stakedAmount));
  console.log("Pending reward:", hre.ethers.formatEther(pendingReward));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

