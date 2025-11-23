// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract TimeLockedVault {
    struct UserLock {
        uint256 amount;
        uint256 unlockTime;
    }

    mapping(address => UserLock) public userLocks;

    function deposit(uint256 _lockDuration) external payable {
        require(msg.sender != address(0), "Invalid address");
        require(msg.value > 0, "Invalid amount");
        require(_lockDuration > 0, "Invalid lock duration");

        uint256 unlockTime = block.timestamp + _lockDuration;
        userLocks[msg.sender].amount += msg.value;
        userLocks[msg.sender].unlockTime = unlockTime;
    }

    function withdraw() external {
        require(msg.sender != address(0), "Invalid address");
        require(userLocks[msg.sender].amount > 0, "No funds to withdraw");
        require(
            block.timestamp >= userLocks[msg.sender].unlockTime,
            "Lock time has not expired"
        );

        uint256 amount = userLocks[msg.sender].amount;
        userLocks[msg.sender].amount = 0;
        userLocks[msg.sender].unlockTime = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Failed to send ether");
    }

    function getUserLock(address _user) external view returns (uint256 amount, uint256 unlockTime) {
        return (userLocks[_user].amount, userLocks[_user].unlockTime);
    }
}

