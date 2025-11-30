// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_SUPPLY = 1_000_000n; // 1M tokens

const StakingSystemModule = buildModule("StakingSystemModule", (m) => {
  // Deploy StakingToken
  const initialStakingSupply = m.getParameter("initialStakingSupply", INITIAL_SUPPLY);
  const stakingToken = m.contract("StakingToken", [initialStakingSupply]);

  // Deploy RewardToken
  const initialRewardSupply = m.getParameter("initialRewardSupply", INITIAL_SUPPLY);
  const rewardToken = m.contract("RewardToken", [initialRewardSupply]);

  // Deploy StakingContract
  const stakingContract = m.contract("StakingContract", [
    stakingToken,
    rewardToken,
  ]);

  // Set staking contract in reward token to allow minting
  m.call(rewardToken, "setStakingContract", [stakingContract]);

  return { stakingToken, rewardToken, stakingContract };
});

export default StakingSystemModule;

