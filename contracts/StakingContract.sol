// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";
import "./RewardToken.sol";

contract StakingContract {
    IERC20 public stakingToken;
    IERC20 public rewardToken;

    // Reward rate: 10% APY = 10e18 / 365 / 24 / 3600 = ~317097919 tokens per second per token staked
    // For simplicity, we'll use 1e15 per second per token (approximately 3.15% APY)
    uint256 public constant REWARD_RATE = 1e15; // tokens per second per token staked
    uint256 public constant REWARD_PRECISION = 1e18;

    struct StakeInfo {
        uint256 amount;
        uint256 lastUpdateTime;
        uint256 rewardDebt;
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor(address _stakingToken, address _rewardToken) {
        require(_stakingToken != address(0), "Invalid staking token address");
        require(_rewardToken != address(0), "Invalid reward token address");
        
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    function stake(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Update rewards before staking
        _updateReward(msg.sender);
        
        // Transfer staking tokens from user to contract
        require(
            stakingToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        stakes[msg.sender].amount += _amount;
        totalStaked += _amount;

        emit Staked(msg.sender, _amount);
    }

    function unstake(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(stakes[msg.sender].amount >= _amount, "Insufficient staked amount");

        // Update rewards before unstaking
        _updateReward(msg.sender);

        stakes[msg.sender].amount -= _amount;
        totalStaked -= _amount;

        // Transfer staking tokens back to user
        require(
            stakingToken.transfer(msg.sender, _amount),
            "Transfer failed"
        );

        emit Unstaked(msg.sender, _amount);
    }

    function claimRewards() external {
        _updateReward(msg.sender);
        
        uint256 pendingReward = stakes[msg.sender].rewardDebt;
        require(pendingReward > 0, "No rewards to claim");

        stakes[msg.sender].rewardDebt = 0;

        // Mint reward tokens to user
        // RewardToken must have setStakingContract called to allow this contract to mint
        RewardToken(address(rewardToken)).mint(msg.sender, pendingReward);

        emit RewardClaimed(msg.sender, pendingReward);
    }

    function _updateReward(address _user) internal {
        StakeInfo storage userStake = stakes[_user];
        
        if (userStake.amount == 0) {
            userStake.lastUpdateTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - userStake.lastUpdateTime;
        if (timeElapsed > 0) {
            // Calculate reward: amount * time * rate / precision
            uint256 reward = (userStake.amount * timeElapsed * REWARD_RATE) / REWARD_PRECISION;
            userStake.rewardDebt += reward;
        }

        userStake.lastUpdateTime = block.timestamp;
    }

    function getPendingReward(address _user) external view returns (uint256) {
        StakeInfo memory userStake = stakes[_user];
        
        if (userStake.amount == 0) {
            return userStake.rewardDebt;
        }

        uint256 timeElapsed = block.timestamp - userStake.lastUpdateTime;
        uint256 newReward = (userStake.amount * timeElapsed * REWARD_RATE) / REWARD_PRECISION;
        
        return userStake.rewardDebt + newReward;
    }

    function getUserStake(address _user) external view returns (uint256 amount, uint256 pendingReward) {
        StakeInfo memory userStake = stakes[_user];
        amount = userStake.amount;
        pendingReward = this.getPendingReward(_user);
    }
}

