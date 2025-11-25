// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

contract Vault{

    mapping(address owner => uint256 amount) private balances;
     

    function deposit() external payable {
       require(msg.sender != address(0), "Invalid address");
       require(msg.value > 0, "Invalid amount");

       balances[msg.sender] += msg.value;

    }

    function withdraw(uint256 _amount) external{
        require(msg.sender != address(0), "Invalid address");
        require(_amount > 0, "Invalid amount");
        require(balances[msg.sender] >= _amount, "Not enough");

        balances[msg.sender] = balances[msg.sender] - _amount;

        (bool sent,) = payable(msg.sender).call{value: _amount}("");
        require(sent, "Failed to send ether");

    }

    function checkBalance() external view returns (uint256 _userBalance, uint256 _contractBalance){
        _contractBalance = address(this).balance;
        _userBalance= balances[msg.sender];
    }

    

}



