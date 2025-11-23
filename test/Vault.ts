import { expect } from "chai";
import hre from "hardhat";

describe("Vault", function () {
  it("should deposit ether", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const Vault = await hre.ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();

    const amount = hre.ethers.parseEther("1.0");
    await vault.connect(user1).deposit({ value: amount });

    const [balance] = await vault.connect(user1).checkBalance();
    expect(balance).to.equal(amount);
  });

  it("should not allow zero deposit", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const Vault = await hre.ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();

    await expect(
      vault.connect(user1).deposit({ value: 0 })
    ).to.be.revertedWith("Invalid amount");
  });

  it("should withdraw ether", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const Vault = await hre.ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();

    const depositAmount = hre.ethers.parseEther("1.0");
    const withdrawAmount = hre.ethers.parseEther("0.5");

    await vault.connect(user1).deposit({ value: depositAmount });
    await vault.connect(user1).withdraw(withdrawAmount);

    const [balance] = await vault.connect(user1).checkBalance();
    expect(balance).to.equal(depositAmount - withdrawAmount);
  });

  it("should not allow withdrawing more than balance", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const Vault = await hre.ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();

    const depositAmount = hre.ethers.parseEther("1.0");
    const withdrawAmount = hre.ethers.parseEther("2.0");

    await vault.connect(user1).deposit({ value: depositAmount });

    await expect(
      vault.connect(user1).withdraw(withdrawAmount)
    ).to.be.revertedWith("Not enough");
  });

  it("should check balance", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const Vault = await hre.ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();

    const amount = hre.ethers.parseEther("1.0");
    await vault.connect(user1).deposit({ value: amount });

    const [userBalance, contractBalance] = await vault.connect(user1).checkBalance();
    expect(userBalance).to.equal(amount);
    expect(contractBalance).to.equal(amount);
  });
});
