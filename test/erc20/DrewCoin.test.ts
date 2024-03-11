import { expect } from 'chai';
import { Contract, Wallet } from "zksync-ethers";
import { getWallet, deployContract, LOCAL_RICH_WALLETS } from '../../deploy/utils';

// Fix can't serialize bigint
(BigInt.prototype as any).toJSON = function() { return this.toString() }

describe("DrewCoin", function () {
  
  let tokenContract: Contract;
  let ownerWallet: Wallet;
  let userWallet: Wallet;

  before(async function () {
    ownerWallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
    userWallet = getWallet(LOCAL_RICH_WALLETS[1].privateKey);

    const { contract } = await deployContract("DrewCoin", [1000000000000000000n], { wallet: ownerWallet, silent: true });

    tokenContract = contract;
  });

  it("Should have correct initial supply", async function () {
    const initialSupply = await tokenContract.totalSupply();
    expect(initialSupply).to.equal(1000000000000000000n);
  });

  it("Should allow owner to burn tokens", async function () {
    
    const tx = await tokenContract.burn(10n);
    await tx.wait();
    const afterBurnSupply = await tokenContract.totalSupply();
    expect(afterBurnSupply).to.equal(999999999999999990n); // 999,990 tokens remaining
  });

  it("Should allow user to transfer tokens", async function () {

    const tx = await tokenContract.transfer(userWallet.address, 50n);
    await tx.wait();
    const userBalance = await tokenContract.balanceOf(userWallet.address);
    expect(userBalance).to.equal(50n);
  });

  it("Should fail when user tries to burn more tokens than they have", async function () {
    const userTokenContract = new Contract(await tokenContract.getAddress(), tokenContract.interface, userWallet);
    
    try {
      await userTokenContract.burn(2000000000000000000n);
      expect.fail("Expected burn to revert, but it didn't");
    } catch (error) {
      expect(error.message).to.include("burn amount exceeds balance");
    }
  });
});

