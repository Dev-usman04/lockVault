import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";

describe("TimeLockedVault", function () {
  it("should deposit and lock funds", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const TimeLockedVault = await hre.ethers.getContractFactory("TimeLockedVault");
    const vault = await TimeLockedVault.deploy();

    const amount = hre.ethers.parseEther("1.0");
    const lockDuration = 60 * 60 * 24; // 1 day in seconds

    await vault.connect(user1).deposit(lockDuration, { value: amount });

    const [lockedAmount, unlockTime] = await vault.getUserLock(user1.address);
    expect(lockedAmount).to.equal(amount);
    expect(unlockTime).to.be.greaterThan(await time.latest());
  });

  it("should not allow zero deposit", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const TimeLockedVault = await hre.ethers.getContractFactory("TimeLockedVault");
    const vault = await TimeLockedVault.deploy();

    const lockDuration = 60 * 60 * 24;

    await expect(
      vault.connect(user1).deposit(lockDuration, { value: 0 })
    ).to.be.revertedWith("Invalid amount");
  });

  it("should not allow zero lock duration", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const TimeLockedVault = await hre.ethers.getContractFactory("TimeLockedVault");
    const vault = await TimeLockedVault.deploy();

    const amount = hre.ethers.parseEther("1.0");

    await expect(
      vault.connect(user1).deposit(0, { value: amount })
    ).to.be.revertedWith("Invalid lock duration");
  });

  it("should not allow withdrawal before lock expires", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const TimeLockedVault = await hre.ethers.getContractFactory("TimeLockedVault");
    const vault = await TimeLockedVault.deploy();

    const amount = hre.ethers.parseEther("1.0");
    const lockDuration = 60 * 60 * 24; // 1 day

    await vault.connect(user1).deposit(lockDuration, { value: amount });

    await expect(
      vault.connect(user1).withdraw()
    ).to.be.revertedWith("Lock time has not expired");
  });

  it("should allow withdrawal after lock expires", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const TimeLockedVault = await hre.ethers.getContractFactory("TimeLockedVault");
    const vault = await TimeLockedVault.deploy();

    const amount = hre.ethers.parseEther("1.0");
    const lockDuration = 60 * 60; // 1 hour

    await vault.connect(user1).deposit(lockDuration, { value: amount });

    // Fast forward time
    await time.increase(lockDuration + 1);

    await vault.connect(user1).withdraw();

    const [lockedAmount] = await vault.getUserLock(user1.address);
    expect(lockedAmount).to.equal(0);
  });

  it("should allow multiple deposits", async function () {
    const [owner, user1] = await hre.ethers.getSigners();
    const TimeLockedVault = await hre.ethers.getContractFactory("TimeLockedVault");
    const vault = await TimeLockedVault.deploy();

    const amount1 = hre.ethers.parseEther("1.0");
    const amount2 = hre.ethers.parseEther("2.0");
    const lockDuration = 60 * 60 * 24;

    await vault.connect(user1).deposit(lockDuration, { value: amount1 });
    await vault.connect(user1).deposit(lockDuration, { value: amount2 });

    const [lockedAmount] = await vault.getUserLock(user1.address);
    expect(lockedAmount).to.equal(amount1 + amount2);
  });

  it("should allow multiple users to deposit independently", async function () {
    const [owner, user1, user2] = await hre.ethers.getSigners();
    const TimeLockedVault = await hre.ethers.getContractFactory("TimeLockedVault");
    const vault = await TimeLockedVault.deploy();

    const amount1 = hre.ethers.parseEther("1.0");
    const amount2 = hre.ethers.parseEther("2.0");
    const lockDuration = 60 * 60 * 24;

    await vault.connect(user1).deposit(lockDuration, { value: amount1 });
    await vault.connect(user2).deposit(lockDuration, { value: amount2 });

    const [user1Amount] = await vault.getUserLock(user1.address);
    const [user2Amount] = await vault.getUserLock(user2.address);

    expect(user1Amount).to.equal(amount1);
    expect(user2Amount).to.equal(amount2);
  });
});

