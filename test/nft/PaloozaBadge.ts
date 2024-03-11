import { expect } from 'chai';
import { Contract } from "zksync-ethers";
import { getWallet, deployContract, LOCAL_RICH_WALLETS } from '../../deploy/utils';

const deploy = async () => {
  const ownerWallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
  const recipientWallet = getWallet(LOCAL_RICH_WALLETS[1].privateKey);

  const { contract } = await deployContract(
    "PaloozaBadge",
    ["Proof of Palooza", "POP", "The year of the barbeque flambé", 20n, 2],
    { wallet: ownerWallet, silent: true }
  );

  const nftContract = contract;

  return { ownerWallet, recipientWallet, nftContract};

};

describe("PaloozaBadge", function () {
  
  it("Should mint a new NFT to the recipient", async function () {
    const { nftContract, recipientWallet } = await deploy();
    const tx = await nftContract.mint(recipientWallet.address);
    await tx.wait();
    const balance = await nftContract.balanceOf(recipientWallet.address);
    expect(balance).to.equal(1n);
  });
  
  it("Should have correct token URI after minting", async function () {
    const { nftContract } = await deploy();
    const tokenId = 0;
    const tokenURI = await nftContract.tokenURI(tokenId);
    const length = new String('data:application/json;base64,').length;
    const sub = tokenURI.substring(length);
    const json = Buffer.from(sub, 'base64').toString('utf-8');
    const data = JSON.parse(json);
    expect(data.name).to.equal("Proof of Palooza #0");
    expect(data.attributes[0].generation).to.equal("20");
    expect(data.attributes[0].value).to.equal("0");
  });
  
  it("Should allow owner to mint multiple NFTs", async function () {
    const { nftContract, recipientWallet } = await deploy();
    const tx1 = await nftContract.mint(recipientWallet.address);
    await tx1.wait();
    const tx2 = await nftContract.mint(recipientWallet.address);
    await tx2.wait();
    const balance = await nftContract.balanceOf(recipientWallet.address);
    expect(balance).to.equal(2n); 
  });
  
  it("Should not allow owner to mint more than specified number of NFTs", async function () {
    const { nftContract, recipientWallet } = await deploy();
    const tx1 = await nftContract.mint(recipientWallet.address);
    await tx1.wait();
    const tx2 = await nftContract.mint(recipientWallet.address);
    await tx2.wait();
    try {
      await nftContract.mint(recipientWallet.address);
      expect.fail('Expected mint to revert, but it didn\'t');
      
    } catch (error) {
      expect(error.message).to.include("No more tokens available");
    }
    
    const balance = await nftContract.balanceOf(recipientWallet.address);
    expect(balance).to.equal(2n); // 1 initial nft + 2 minted
  });
  
  it("Should not allow non-owner to mint NFTs", async function () {
    const { nftContract, recipientWallet } = await deploy();
    try {
      const tx3 = await (nftContract.connect(recipientWallet) as Contract).mint(recipientWallet.address);
      await tx3.wait();
      expect.fail("Expected mint to revert, but it didn't");
    } catch (error) {
      expect(error.message).to.include("Ownable: caller is not the owner");
    }
  });
});
