import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { Contract } from "ethers";

describe("ERC20 Staking & Reward System", function () {
  let stakingToken: Contract;
  let rewardToken: Contract;
  let stakingContract: Contract;
  let owner: any;
  let user1: any;
  let user2: any;

  const INITIAL_SUPPLY = 1000000; // 1M tokens
  const STAKE_AMOUNT = 1000; // 1000 tokens

  beforeEach(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();

    // Deploy StakingToken
    const StakingToken = await hre.ethers.getContractFactory("StakingToken");
    stakingToken = await StakingToken.deploy(INITIAL_SUPPLY);

    // Deploy RewardToken
    const RewardToken = await hre.ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy(INITIAL_SUPPLY);

    // Deploy StakingContract
    const StakingContract = await hre.ethers.getContractFactory("StakingContract");
    stakingContract = await StakingContract.deploy(
      await stakingToken.getAddress(),
      await rewardToken.getAddress()
    );

    // Set staking contract in reward token to allow minting
    await rewardToken.setStakingContract(await stakingContract.getAddress());

    // Transfer some staking tokens to users
    const amount = hre.ethers.parseEther(STAKE_AMOUNT.toString());
    await stakingToken.transfer(user1.address, amount);
    await stakingToken.transfer(user2.address, amount);
  });

  describe("Token Deployment", function () {
    it("Should deploy StakingToken with correct initial supply", async function () {
      const totalSupply = await stakingToken.totalSupply();
      expect(totalSupply).to.equal(hre.ethers.parseEther(INITIAL_SUPPLY.toString()));
    });

    it("Should deploy RewardToken with correct initial supply", async function () {
      const totalSupply = await rewardToken.totalSupply();
      expect(totalSupply).to.equal(hre.ethers.parseEther(INITIAL_SUPPLY.toString()));
    });

    it("Should deploy StakingContract with correct token addresses", async function () {
      const stakingTokenAddr = await stakingContract.stakingToken();
      const rewardTokenAddr = await stakingContract.rewardToken();
      
      expect(stakingTokenAddr).to.equal(await stakingToken.getAddress());
      expect(rewardTokenAddr).to.equal(await rewardToken.getAddress());
    });
  });

  describe("ERC20 Token Functionality", function () {
    it("Should transfer tokens correctly", async function () {
      const amount = hre.ethers.parseEther("100");
      await stakingToken.connect(user1).transfer(user2.address, amount);
      
      const balance = await stakingToken.balanceOf(user2.address);
      expect(balance).to.equal(hre.ethers.parseEther((STAKE_AMOUNT + 100).toString()));
    });

    it("Should approve and transferFrom correctly", async function () {
      const amount = hre.ethers.parseEther("100");
      await stakingToken.connect(user1).approve(user2.address, amount);
      
      const allowance = await stakingToken.allowance(user1.address, user2.address);
      expect(allowance).to.equal(amount);

      await stakingToken.connect(user2).transferFrom(user1.address, user2.address, amount);
      const balance = await stakingToken.balanceOf(user2.address);
      expect(balance).to.equal(hre.ethers.parseEther((STAKE_AMOUNT + 100).toString()));
    });
  });

  describe("Staking Functionality", function () {
    it("Should allow users to stake tokens", async function () {
      const amount = hre.ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), amount);
      await stakingContract.connect(user1).stake(amount);

      const [stakedAmount] = await stakingContract.getUserStake(user1.address);
      expect(stakedAmount).to.equal(amount);
    });

    it("Should update totalStaked when users stake", async function () {
      const amount = hre.ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), amount);
      await stakingContract.connect(user1).stake(amount);

      const totalStaked = await stakingContract.totalStaked();
      expect(totalStaked).to.equal(amount);
    });

    it("Should not allow staking zero amount", async function () {
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      
      await expect(
        stakingContract.connect(user1).stake(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should not allow staking without approval", async function () {
      const amount = hre.ethers.parseEther("100");
      
      await expect(
        stakingContract.connect(user1).stake(amount)
      ).to.be.reverted;
    });

    it("Should allow multiple stakes from same user", async function () {
      const amount1 = hre.ethers.parseEther("100");
      const amount2 = hre.ethers.parseEther("50");
      
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      await stakingContract.connect(user1).stake(amount1);
      await stakingContract.connect(user1).stake(amount2);

      const [stakedAmount] = await stakingContract.getUserStake(user1.address);
      expect(stakedAmount).to.equal(amount1 + amount2);
    });

    it("Should allow multiple users to stake independently", async function () {
      const amount1 = hre.ethers.parseEther("100");
      const amount2 = hre.ethers.parseEther("200");
      
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      await stakingToken.connect(user2).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      
      await stakingContract.connect(user1).stake(amount1);
      await stakingContract.connect(user2).stake(amount2);

      const [user1Stake] = await stakingContract.getUserStake(user1.address);
      const [user2Stake] = await stakingContract.getUserStake(user2.address);
      
      expect(user1Stake).to.equal(amount1);
      expect(user2Stake).to.equal(amount2);
    });
  });

  describe("Unstaking Functionality", function () {
    beforeEach(async function () {
      const amount = hre.ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      await stakingContract.connect(user1).stake(amount);
    });

    it("Should allow users to unstake tokens", async function () {
      const unstakeAmount = hre.ethers.parseEther("50");
      const initialBalance = await stakingToken.balanceOf(user1.address);
      
      await stakingContract.connect(user1).unstake(unstakeAmount);

      const [stakedAmount] = await stakingContract.getUserStake(user1.address);
      const finalBalance = await stakingToken.balanceOf(user1.address);
      
      expect(stakedAmount).to.equal(hre.ethers.parseEther("50"));
      expect(finalBalance).to.equal(initialBalance + unstakeAmount);
    });

    it("Should not allow unstaking more than staked", async function () {
      const unstakeAmount = hre.ethers.parseEther("200");
      
      await expect(
        stakingContract.connect(user1).unstake(unstakeAmount)
      ).to.be.revertedWith("Insufficient staked amount");
    });

    it("Should not allow unstaking zero amount", async function () {
      await expect(
        stakingContract.connect(user1).unstake(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should allow partial unstaking", async function () {
      const stakeAmount = hre.ethers.parseEther("100");
      const unstakeAmount1 = hre.ethers.parseEther("30");
      const unstakeAmount2 = hre.ethers.parseEther("20");
      
      await stakingContract.connect(user1).unstake(unstakeAmount1);
      await stakingContract.connect(user1).unstake(unstakeAmount2);

      const [stakedAmount] = await stakingContract.getUserStake(user1.address);
      expect(stakedAmount).to.equal(stakeAmount - unstakeAmount1 - unstakeAmount2);
    });
  });

  describe("Reward Calculation", function () {
    beforeEach(async function () {
      const amount = hre.ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      await stakingContract.connect(user1).stake(amount);
    });

    it("Should calculate pending rewards correctly", async function () {
      // Wait 1 second
      await time.increase(1);
      
      const pendingReward = await stakingContract.getPendingReward(user1.address);
      expect(pendingReward).to.be.greaterThan(0);
    });

    it("Should accumulate rewards over time", async function () {
      await time.increase(10);
      const reward1 = await stakingContract.getPendingReward(user1.address);
      
      await time.increase(10);
      const reward2 = await stakingContract.getPendingReward(user1.address);
      
      expect(reward2).to.be.greaterThan(reward1);
    });

    it("Should reset pending reward after claiming", async function () {
      await time.increase(100);
      
      const pendingBefore = await stakingContract.getPendingReward(user1.address);
      expect(pendingBefore).to.be.greaterThan(0);
      
      await stakingContract.connect(user1).claimRewards();
      
      const pendingAfter = await stakingContract.getPendingReward(user1.address);
      expect(pendingAfter).to.be.lessThan(pendingBefore);
    });

    it("Should not allow claiming when no rewards", async function () {
      await expect(
        stakingContract.connect(user2).claimRewards()
      ).to.be.revertedWith("No rewards to claim");
    });
  });

  describe("Reward Claiming", function () {
    beforeEach(async function () {
      const amount = hre.ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      await stakingContract.connect(user1).stake(amount);
    });

    it("Should mint reward tokens when claiming", async function () {
      await time.increase(100);
      
      const initialRewardBalance = await rewardToken.balanceOf(user1.address);
      const pendingReward = await stakingContract.getPendingReward(user1.address);
      
      await stakingContract.connect(user1).claimRewards();
      
      const finalRewardBalance = await rewardToken.balanceOf(user1.address);
      expect(finalRewardBalance).to.equal(initialRewardBalance + pendingReward);
    });

    it("Should allow claiming rewards multiple times", async function () {
      await time.increase(100);
      await stakingContract.connect(user1).claimRewards();
      
      const reward1 = await rewardToken.balanceOf(user1.address);
      
      await time.increase(100);
      await stakingContract.connect(user1).claimRewards();
      
      const reward2 = await rewardToken.balanceOf(user1.address);
      expect(reward2).to.be.greaterThan(reward1);
    });

    it("Should continue accruing rewards after claiming", async function () {
      await time.increase(100);
      await stakingContract.connect(user1).claimRewards();
      
      await time.increase(100);
      const newRewards = await stakingContract.getPendingReward(user1.address);
      expect(newRewards).to.be.greaterThan(0);
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete staking cycle", async function () {
      const stakeAmount = hre.ethers.parseEther("100");
      
      // Stake
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      await stakingContract.connect(user1).stake(stakeAmount);
      
      // Wait and claim rewards
      await time.increase(100);
      await stakingContract.connect(user1).claimRewards();
      
      // Unstake
      await stakingContract.connect(user1).unstake(stakeAmount);
      
      const [finalStake] = await stakingContract.getUserStake(user1.address);
      const finalBalance = await stakingToken.balanceOf(user1.address);
      const rewardBalance = await rewardToken.balanceOf(user1.address);
      
      expect(finalStake).to.equal(0);
      expect(finalBalance).to.equal(hre.ethers.parseEther(STAKE_AMOUNT.toString()));
      expect(rewardBalance).to.be.greaterThan(0);
    });

    it("Should handle multiple users staking and claiming", async function () {
      const amount1 = hre.ethers.parseEther("100");
      const amount2 = hre.ethers.parseEther("200");
      
      await stakingToken.connect(user1).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      await stakingToken.connect(user2).approve(await stakingContract.getAddress(), hre.ethers.MaxUint256);
      
      await stakingContract.connect(user1).stake(amount1);
      await stakingContract.connect(user2).stake(amount2);
      
      await time.increase(100);
      
      await stakingContract.connect(user1).claimRewards();
      await stakingContract.connect(user2).claimRewards();
      
      const reward1 = await rewardToken.balanceOf(user1.address);
      const reward2 = await rewardToken.balanceOf(user2.address);
      
      expect(reward1).to.be.greaterThan(0);
      expect(reward2).to.be.greaterThan(reward1); // User2 staked more, should get more rewards
    });
  });
});

