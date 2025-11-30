import hre from "hardhat";

async function main() {
  const stakingContractAddress = process.argv[2];
  const userAddress = process.argv[3];

  if (!stakingContractAddress) {
    console.error("Usage: npx hardhat run scripts/getStakeInfo.ts --network <network> <stakingContractAddress> [userAddress]");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();
  const addressToCheck = userAddress || signer.address;
  console.log("Checking stake info for:", addressToCheck);

  // Get contract
  const StakingContract = await hre.ethers.getContractFactory("StakingContract");
  const stakingContract = StakingContract.attach(stakingContractAddress);

  // Get stake info
  const [stakedAmount, pendingReward] = await stakingContract.getUserStake(addressToCheck);
  const totalStaked = await stakingContract.totalStaked();

  console.log("\n=== Stake Info ===");
  console.log("Staked amount:", hre.ethers.formatEther(stakedAmount));
  console.log("Pending reward:", hre.ethers.formatEther(pendingReward));
  console.log("Total staked (all users):", hre.ethers.formatEther(totalStaked));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

