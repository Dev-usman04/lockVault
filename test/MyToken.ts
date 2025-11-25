import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("MyToken", function () {
  // Fixture to deploy the contract with initial supply
  async function deployMyTokenFixture() {
    const [owner, account1, account2] = await hre.ethers.getSigners();
    const initialSupply = 1000; // 1000 tokens

    const MyToken = await hre.ethers.getContractFactory("MyToken");
    const myToken = await MyToken.deploy(initialSupply);

    return { myToken, owner, account1, account2, initialSupply };
  }

  describe("Deployment", function () {
    it("Should set the correct name", async function () {
      const { myToken } = await loadFixture(deployMyTokenFixture);
      expect(await myToken.name()).to.equal("MyToken");
    });

    it("Should set the correct symbol", async function () {
      const { myToken } = await loadFixture(deployMyTokenFixture);
      expect(await myToken.symbol()).to.equal("MTK");
    });

    it("Should set the correct decimals", async function () {
      const { myToken } = await loadFixture(deployMyTokenFixture);
      expect(await myToken.decimals()).to.equal(18);
    });

    it("Should set the correct total supply", async function () {
      const { myToken, initialSupply } = await loadFixture(deployMyTokenFixture);
      const expectedSupply = initialSupply * 10n ** 18n;
      expect(await myToken.totalSupply()).to.equal(expectedSupply);
    });

    it("Should assign the total supply to the owner", async function () {
      const { myToken, owner, initialSupply } = await loadFixture(deployMyTokenFixture);
      const expectedBalance = initialSupply * 10n ** 18n;
      expect(await myToken.balanceOf(owner.address)).to.equal(expectedBalance);
    });

    it("Should emit Transfer event on deployment", async function () {
      const [owner] = await hre.ethers.getSigners();
      const initialSupply = 1000;
      const MyToken = await hre.ethers.getContractFactory("MyToken");
      
      await expect(MyToken.deploy(initialSupply))
        .to.emit(MyToken, "Transfer")
        .withArgs(
          hre.ethers.ZeroAddress,
          owner.address,
          initialSupply * 10n ** 18n
        );
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      const { myToken, owner, account1 } = await loadFixture(deployMyTokenFixture);
      const transferAmount = 100n * 10n ** 18n;

      await expect(myToken.transfer(account1.address, transferAmount))
        .to.emit(myToken, "Transfer")
        .withArgs(owner.address, account1.address, transferAmount);

      expect(await myToken.balanceOf(account1.address)).to.equal(transferAmount);
    });

    it("Should update balances after transfer", async function () {
      const { myToken, owner, account1, initialSupply } = await loadFixture(deployMyTokenFixture);
      const transferAmount = 100n * 10n ** 18n;
      const expectedOwnerBalance = (initialSupply - 100n) * 10n ** 18n;

      await myToken.transfer(account1.address, transferAmount);

      expect(await myToken.balanceOf(owner.address)).to.equal(expectedOwnerBalance);
      expect(await myToken.balanceOf(account1.address)).to.equal(transferAmount);
    });

    it("Should return true on successful transfer", async function () {
      const { myToken, account1 } = await loadFixture(deployMyTokenFixture);
      const transferAmount = 100n * 10n ** 18n;

      expect(await myToken.transfer(account1.address, transferAmount)).to.be.true;
    });

    it("Should revert if insufficient balance", async function () {
      const { myToken, account1, account2 } = await loadFixture(deployMyTokenFixture);
      const transferAmount = 100n * 10n ** 18n;

      await expect(
        myToken.connect(account1).transfer(account2.address, transferAmount)
      ).to.be.revertedWith("Not enough tokens");
    });

    it("Should revert if transferring to zero address", async function () {
      const { myToken } = await loadFixture(deployMyTokenFixture);
      const transferAmount = 100n * 10n ** 18n;

      await expect(
        myToken.transfer(hre.ethers.ZeroAddress, transferAmount)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should handle multiple transfers correctly", async function () {
      const { myToken, owner, account1, account2, initialSupply } = await loadFixture(deployMyTokenFixture);
      const transferAmount1 = 100n * 10n ** 18n;
      const transferAmount2 = 50n * 10n ** 18n;

      await myToken.transfer(account1.address, transferAmount1);
      await myToken.connect(account1).transfer(account2.address, transferAmount2);

      expect(await myToken.balanceOf(account1.address)).to.equal(transferAmount1 - transferAmount2);
      expect(await myToken.balanceOf(account2.address)).to.equal(transferAmount2);
      expect(await myToken.balanceOf(owner.address)).to.equal(
        (initialSupply - 100n) * 10n ** 18n
      );
    });
  });

  describe("Approve", function () {
    it("Should approve tokens for spender", async function () {
      const { myToken, owner, account1 } = await loadFixture(deployMyTokenFixture);
      const approveAmount = 200n * 10n ** 18n;

      await expect(myToken.approve(account1.address, approveAmount))
        .to.emit(myToken, "Approval")
        .withArgs(owner.address, account1.address, approveAmount);

      expect(await myToken.allowance(owner.address, account1.address)).to.equal(approveAmount);
    });

    it("Should return true on successful approval", async function () {
      const { myToken, account1 } = await loadFixture(deployMyTokenFixture);
      const approveAmount = 200n * 10n ** 18n;

      expect(await myToken.approve(account1.address, approveAmount)).to.be.true;
    });

    it("Should allow updating allowance", async function () {
      const { myToken, account1 } = await loadFixture(deployMyTokenFixture);
      const approveAmount1 = 200n * 10n ** 18n;
      const approveAmount2 = 300n * 10n ** 18n;

      await myToken.approve(account1.address, approveAmount1);
      expect(await myToken.allowance(await myToken.signer.getAddress(), account1.address)).to.equal(approveAmount1);

      await myToken.approve(account1.address, approveAmount2);
      expect(await myToken.allowance(await myToken.signer.getAddress(), account1.address)).to.equal(approveAmount2);
    });
  });

  describe("TransferFrom", function () {
    it("Should transfer tokens using allowance", async function () {
      const { myToken, owner, account1, account2 } = await loadFixture(deployMyTokenFixture);
      const approveAmount = 200n * 10n ** 18n;
      const transferAmount = 150n * 10n ** 18n;

      await myToken.approve(account1.address, approveAmount);
      
      await expect(
        myToken.connect(account1).transferFrom(owner.address, account2.address, transferAmount)
      )
        .to.emit(myToken, "Transfer")
        .withArgs(owner.address, account2.address, transferAmount);

      expect(await myToken.balanceOf(account2.address)).to.equal(transferAmount);
      expect(await myToken.allowance(owner.address, account1.address)).to.equal(
        approveAmount - transferAmount
      );
    });

    it("Should update balances and allowance correctly", async function () {
      const { myToken, owner, account1, account2, initialSupply } = await loadFixture(deployMyTokenFixture);
      const approveAmount = 200n * 10n ** 18n;
      const transferAmount = 150n * 10n ** 18n;

      await myToken.approve(account1.address, approveAmount);
      await myToken.connect(account1).transferFrom(owner.address, account2.address, transferAmount);

      expect(await myToken.balanceOf(owner.address)).to.equal(
        (initialSupply * 10n ** 18n) - transferAmount
      );
      expect(await myToken.balanceOf(account2.address)).to.equal(transferAmount);
      expect(await myToken.allowance(owner.address, account1.address)).to.equal(
        approveAmount - transferAmount
      );
    });

    it("Should return true on successful transferFrom", async function () {
      const { myToken, owner, account1, account2 } = await loadFixture(deployMyTokenFixture);
      const approveAmount = 200n * 10n ** 18n;
      const transferAmount = 150n * 10n ** 18n;

      await myToken.approve(account1.address, approveAmount);
      
      expect(
        await myToken.connect(account1).transferFrom(owner.address, account2.address, transferAmount)
      ).to.be.true;
    });

    it("Should revert if insufficient balance", async function () {
      const { myToken, account1, account2 } = await loadFixture(deployMyTokenFixture);
      const approveAmount = 200n * 10n ** 18n;
      const transferAmount = 100n * 10n ** 18n;

      await myToken.connect(account1).approve(account2.address, approveAmount);
      
      await expect(
        myToken.connect(account2).transferFrom(account1.address, account2.address, transferAmount)
      ).to.be.revertedWith("Not enough tokens");
    });

    it("Should revert if insufficient allowance", async function () {
      const { myToken, owner, account1, account2 } = await loadFixture(deployMyTokenFixture);
      const approveAmount = 100n * 10n ** 18n;
      const transferAmount = 200n * 10n ** 18n;

      await myToken.approve(account1.address, approveAmount);
      
      await expect(
        myToken.connect(account1).transferFrom(owner.address, account2.address, transferAmount)
      ).to.be.revertedWith("Not allowed");
    });

    it("Should revert if transferring to zero address", async function () {
      const { myToken, owner, account1 } = await loadFixture(deployMyTokenFixture);
      const approveAmount = 200n * 10n ** 18n;
      const transferAmount = 150n * 10n ** 18n;

      await myToken.approve(account1.address, approveAmount);
      
      await expect(
        myToken.connect(account1).transferFrom(owner.address, hre.ethers.ZeroAddress, transferAmount)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should allow multiple transferFrom calls", async function () {
      const { myToken, owner, account1, account2 } = await loadFixture(deployMyTokenFixture);
      const approveAmount = 200n * 10n ** 18n;
      const transferAmount1 = 50n * 10n ** 18n;
      const transferAmount2 = 75n * 10n ** 18n;

      await myToken.approve(account1.address, approveAmount);
      
      await myToken.connect(account1).transferFrom(owner.address, account2.address, transferAmount1);
      await myToken.connect(account1).transferFrom(owner.address, account2.address, transferAmount2);

      expect(await myToken.balanceOf(account2.address)).to.equal(transferAmount1 + transferAmount2);
      expect(await myToken.allowance(owner.address, account1.address)).to.equal(
        approveAmount - transferAmount1 - transferAmount2
      );
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount transfers", async function () {
      const { myToken, account1 } = await loadFixture(deployMyTokenFixture);
      
      await expect(myToken.transfer(account1.address, 0))
        .to.emit(myToken, "Transfer")
        .withArgs(await myToken.signer.getAddress(), account1.address, 0);
    });

    it("Should handle zero amount approvals", async function () {
      const { myToken, account1 } = await loadFixture(deployMyTokenFixture);
      
      await expect(myToken.approve(account1.address, 0))
        .to.emit(myToken, "Approval")
        .withArgs(await myToken.signer.getAddress(), account1.address, 0);
    });

    it("Should handle transferring entire balance", async function () {
      const { myToken, owner, account1, initialSupply } = await loadFixture(deployMyTokenFixture);
      const totalBalance = initialSupply * 10n ** 18n;

      await myToken.transfer(account1.address, totalBalance);

      expect(await myToken.balanceOf(owner.address)).to.equal(0);
      expect(await myToken.balanceOf(account1.address)).to.equal(totalBalance);
    });
  });
});

