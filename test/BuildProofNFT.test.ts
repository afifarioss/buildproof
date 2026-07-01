import { expect } from "chai";
import { ethers, network } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { BuildProofNFT, MockUSDC } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

describe("BuildProofNFT", function () {
  let contract: BuildProofNFT;
  let usdc: MockUSDC;
  let owner: SignerWithAddress;
  let verifier: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let tipper: SignerWithAddress;

  // Helper: mints a receipt with valid default args
  async function mintAs(signer: SignerWithAddress, projectName = "Test Project") {
    return contract
      .connect(signer)
      .mintShipReceipt(projectName, "A description that is long enough", "https://github.com/x/y", "defi", "0x");
  }

  beforeEach(async function () {
    [owner, verifier, alice, bob, tipper] = await ethers.getSigners();

    // Deploy the contract under test
    const Factory = await ethers.getContractFactory("BuildProofNFT");
    contract = (await Factory.deploy(verifier.address)) as BuildProofNFT;
    await contract.waitForDeployment();

    // Deploy MockUSDC normally, then transplant its bytecode onto the
    // hardcoded USDC address so tipBuilder's IERC20(USDC) calls resolve.
    const MockFactory = await ethers.getContractFactory("MockUSDC");
    const mockDeployed = await MockFactory.deploy();
    await mockDeployed.waitForDeployment();

    const mockBytecode = await ethers.provider.getCode(await mockDeployed.getAddress());
    await network.provider.send("hardhat_setCode", [USDC_ADDRESS, mockBytecode]);

    usdc = (await ethers.getContractAt("MockUSDC", USDC_ADDRESS)) as MockUSDC;
  });

  describe("mintShipReceipt", function () {
    it("mints successfully with valid input", async function () {
      await expect(mintAs(alice))
        .to.emit(contract, "ShipReceiptMinted")
        .withArgs(1, alice.address, "Test Project", ethers.ZeroHash, anyValue);

      expect(await contract.totalShips()).to.equal(1);
      expect(await contract.ownerOf(1)).to.equal(alice.address);
    });

    it("rejects empty project name", async function () {
      await expect(
        contract.connect(alice).mintShipReceipt("", "A description that is long enough", "url", "cat", "0x")
      ).to.be.revertedWith("BP: name required");
    });

    it("rejects description under 20 chars", async function () {
      await expect(
        contract.connect(alice).mintShipReceipt("Name", "too short", "url", "cat", "0x")
      ).to.be.revertedWith("BP: desc too short");
    });

    it("enforces the mint cooldown", async function () {
      await mintAs(alice);
      await expect(mintAs(alice, "Second Project")).to.be.revertedWith("BP: cooldown active");
    });

    it("allows minting again after cooldown elapses", async function () {
      await mintAs(alice);
      await network.provider.send("evm_increaseTime", [3600]); // 1 hour
      await network.provider.send("evm_mine");
      await expect(mintAs(alice, "Second Project")).to.not.be.reverted;
      expect(await contract.builderShipCount(alice.address)).to.equal(2);
    });

    it("owner can adjust the cooldown", async function () {
      await contract.connect(owner).setMintCooldown(10); // 10 seconds
      await mintAs(alice);
      await network.provider.send("evm_increaseTime", [11]);
      await network.provider.send("evm_mine");
      await expect(mintAs(alice, "Second Project")).to.not.be.reverted;
    });
  });

  describe("setAIVerification", function () {
    it("allows the verifier to set verification", async function () {
      await mintAs(alice);
      await expect(contract.connect(verifier).setAIVerification(1, 85, true))
        .to.emit(contract, "BuildAIVerified")
        .withArgs(1, 85, true);

      const receipt = await contract.receipts(1);
      expect(receipt.aiVerified).to.equal(true);
      expect(receipt.aiScore).to.equal(85);
    });

    it("rejects calls from non-verifier addresses", async function () {
      await mintAs(alice);
      await expect(contract.connect(alice).setAIVerification(1, 85, true)).to.be.revertedWith("BP: not verifier");
    });

    it("rejects verification of a nonexistent token", async function () {
      await expect(contract.connect(verifier).setAIVerification(999, 85, true)).to.be.revertedWith("BP: nonexistent");
    });
  });

  describe("tipBuilder", function () {
    beforeEach(async function () {
      await mintAs(alice); // tokenId 1
      await usdc.mint(tipper.address, ethers.parseUnits("100", 6));
      await usdc.connect(tipper).approve(await contract.getAddress(), ethers.parseUnits("100", 6));
    });

    it("splits the tip correctly: 97.5% to builder, 2.5% protocol fee", async function () {
      const tipAmount = ethers.parseUnits("10", 6); // 10 USDC
      const expectedFee = (tipAmount * 250n) / 10_000n; // 0.25 USDC
      const expectedNet = tipAmount - expectedFee;

      await expect(contract.connect(tipper).tipBuilder(1, tipAmount))
        .to.emit(contract, "TipSent")
        .withArgs(1, tipper.address, alice.address, expectedNet);

      expect(await usdc.balanceOf(alice.address)).to.equal(expectedNet);
      expect(await contract.totalProtocolFees()).to.equal(expectedFee);

      const receipt = await contract.receipts(1);
      expect(receipt.tips).to.equal(expectedNet);
    });

    it("rejects tips below 1 USDC", async function () {
      await expect(contract.connect(tipper).tipBuilder(1, ethers.parseUnits("0.5", 6))).to.be.revertedWith(
        "BP: min 1 USDC"
      );
    });

    it("rejects self-tipping", async function () {
      await usdc.mint(alice.address, ethers.parseUnits("10", 6));
      await usdc.connect(alice).approve(await contract.getAddress(), ethers.parseUnits("10", 6));
      await expect(contract.connect(alice).tipBuilder(1, ethers.parseUnits("5", 6))).to.be.revertedWith(
        "BP: no self-tip"
      );
    });

    it("rejects tipping a nonexistent receipt", async function () {
      await expect(contract.connect(tipper).tipBuilder(999, ethers.parseUnits("5", 6))).to.be.revertedWith(
        "BP: not found"
      );
    });
  });

  describe("getLeaderboard", function () {
    it("returns builders sorted by ship count, descending", async function () {
      // alice ships once, bob ships twice
      await mintAs(alice);
      await mintAs(bob);
      await network.provider.send("evm_increaseTime", [3600]);
      await network.provider.send("evm_mine");
      await mintAs(bob, "Bob's second project");

      const [builders, counts] = await contract.getLeaderboard(10);

      expect(builders[0]).to.equal(bob.address);
      expect(counts[0]).to.equal(2);
      expect(builders[1]).to.equal(alice.address);
      expect(counts[1]).to.equal(1);
    });

    it("respects the limit parameter", async function () {
      await mintAs(alice);
      await network.provider.send("evm_increaseTime", [3600]);
      await network.provider.send("evm_mine");
      await mintAs(bob);

      const [builders] = await contract.getLeaderboard(1);
      expect(builders.length).to.equal(1);
    });

    it("re-sorts correctly when a lower-ranked builder overtakes", async function () {
      await mintAs(alice); // alice: 1 ship
      await network.provider.send("evm_increaseTime", [3600]);
      await network.provider.send("evm_mine");
      await mintAs(bob); // bob: 1 ship

      let [builders] = await contract.getLeaderboard(10);
      expect(builders[0]).to.equal(alice.address); // alice inserted first, ties go to earlier insert

      // bob ships twice more to take the lead
      await network.provider.send("evm_increaseTime", [3600]);
      await network.provider.send("evm_mine");
      await mintAs(bob, "Bob 2");
      await network.provider.send("evm_increaseTime", [3600]);
      await network.provider.send("evm_mine");
      await mintAs(bob, "Bob 3");

      [builders] = await contract.getLeaderboard(10);
      expect(builders[0]).to.equal(bob.address);
    });
  });

  describe("getAllBuilders", function () {
    it("returns every builder in insertion order, unranked", async function () {
      await mintAs(alice);
      await mintAs(bob);
      const all = await contract.getAllBuilders();
      expect(all).to.deep.equal([alice.address, bob.address]);
    });
  });

  describe("admin functions", function () {
    it("only owner can set the AI verifier", async function () {
      await expect(contract.connect(alice).setAIVerifier(alice.address)).to.be.revertedWithCustomError(
        contract,
        "OwnableUnauthorizedAccount"
      );
      await contract.connect(owner).setAIVerifier(alice.address);
      expect(await contract.aiVerifier()).to.equal(alice.address);
    });

    it("only owner can set the schema UID", async function () {
      const fakeSchema = ethers.id("fake-schema");
      await expect(contract.connect(alice).setSchemaUID(fakeSchema)).to.be.revertedWithCustomError(
        contract,
        "OwnableUnauthorizedAccount"
      );
      await contract.connect(owner).setSchemaUID(fakeSchema);
      expect(await contract.schemaUID()).to.equal(fakeSchema);
    });
  });
});