import { expect } from 'chai';
import { getWallet, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
import { Contract, Wallet } from 'zksync-ethers';
import  "@nomicfoundation/hardhat-chai-matchers";

const deploy = async (initialGeneration = 19, initialIssuance = 1000000000000000000000000n, badgeName = 'Proof of Palooza', badgeSymbol = 'POP') => {
  
  let wallet: Wallet;
  
  wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
  
  const { deployer, contract } = await deployContract("ProofOfPalooza", [initialGeneration, initialIssuance, badgeName, badgeSymbol], { wallet, silent: true });
  
  await contract.waitForDeployment();

  const drewCoinAddr = await contract.token();

  const drewCoinArtifact = await deployer.loadArtifact("DrewCoin");

  const drewCoin = new Contract(drewCoinAddr, drewCoinArtifact.abi, wallet);

  const getNft = async (generation: BigInt) => {
    const nftArtifact = await deployer.loadArtifact("PaloozaBadge");
    return new Contract(await contract.badges(generation), nftArtifact.abi, wallet);
  }

  return { pop: contract, drewCoin, wallet, getNft };

}

describe('Proof Of Palooza', function () {
  
  it("Should begin at generation 19 with supply of 1m", async function () {
    
    const { pop } = await deploy();
    expect(await pop.generation()).to.eq(19n);
    expect( await pop.issuance()).to.eq(1000000000000000000000000n);
    
  });
  
  it("Should begin at generation 25 with supply of 5m", async function () {
    
    const { pop } = await deploy(25, 5000000000000000000000000n);
    expect(await pop.generation()).to.eq(25n);
    expect( await pop.issuance()).to.eq(5000000000000000000000000n);
    
  });

  it("Should allow incrementing generation", async function () {

    const { pop } = await deploy();
    await pop.closeGeneration('Year of the impotent tennis ball');
    expect(await pop.generation()).to.eq(20n);

  });
  
  it("Should allow marking attendance of paloozateer for current generation", async function() {
    
    const { pop } = await deploy();

    const tx = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
    
    await tx.wait();
    
    await expect(tx).to.emit(pop, 'AttendanceMarked').withArgs(19n, LOCAL_RICH_WALLETS[1].address).and.to.emit(pop, 'PaloozateerAdded').withArgs(LOCAL_RICH_WALLETS[1].address);
    expect(await pop.paloozateers(0)).to.eq(LOCAL_RICH_WALLETS[1].address);


  });
  
  it("Should not allow marking attendance of paloozateer for next generation", async function() {
    
    const { pop } = await deploy();
    try {
      const tx = await pop.markAttendance(20n, LOCAL_RICH_WALLETS[1].address);
      await tx.wait();
      expect.fail('Expected to revert');;

    } catch (error) {
      expect(error.message).to.include('Generation is not open');
    }

  });
  
  it("Should not allow marking paloozateer as present twice in the same generation", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    
    try {
      const tx1 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
      await tx1.wait();
      expect.fail('Expected to revert');
    } catch (error) {
      expect(error.message).to.include('Paloozateer already marked as present');
    }
    
  });
  
  it("Should allow adding two different paloozateers in the same generation", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    const tx1 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[2].address);
    await tx1.wait();
    
    const numPaloozateers = await pop.paloozateerIndex();
    const numAttendees = await pop.numAttendees(19n);
    expect(numPaloozateers).to.eq(2n);
    expect( numAttendees).to.eq(2n);
    
  });

  it("Should allow adding the same paloozateers in different generations", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    const tx1 = await pop.closeGeneration('Year of the impotent tennis ball');
    await tx1.wait();
    const tx2 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
    await tx2.wait();
    
    const numPaloozateers = await pop.paloozateerIndex();
    const numAttendees19 = await pop.numAttendees(19n);
    const numAttendees20 = await pop.numAttendees(19n);
    expect(numAttendees19).to.eq(1n);
    expect(numAttendees20).to.eq(1n);
    expect(numPaloozateers).to.eq(1n);
    
  });

  it("Should allow adding three paloozateers over 2 generations", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    const tx1 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[2].address);
    await tx1.wait();
    const tx2 = await pop.closeGeneration('Year of the impotent tennis ball');
    await tx2.wait();
    const tx3 = await pop.markAttendance(20n, LOCAL_RICH_WALLETS[3].address);
    await tx3.wait();

    const numPaloozateers = await pop.paloozateerIndex();
    const numAttendees19 = await pop.numAttendees(19n);
    const numAttendees20 = await pop.numAttendees(20n);

    expect(numAttendees19).to.eq(2n);
    expect(numAttendees20).to.eq(1n);
    expect(numPaloozateers).to.eq(3n);
    
  });

  it("Should allow closing a generation", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    const tx1 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[2].address);
    await tx1.wait();
    
    const tx = await pop.closeGeneration('Year of the impotent tennis ball');

    await tx.wait();
    
    const isLocked = await pop.isGenerationLocked(19n);
    const generation = await pop.generation();
    
    expect(tx).to.emit(pop, 'GenerationClosed').withArgs(19n, 1000000000000000000000000n, 2n, 'Year of the impotent tennis ball');
    expect(isLocked).to.eq(true);
    expect(generation).to.eq(20n);


  });
  
  
  it("Should allow marking attendance", async function() {
    
    const { pop } = await deploy();
    
    const tx1 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);

    const tx2 = await pop.markAttendance(19n, LOCAL_RICH_WALLETS[2].address);
    
    expect( await pop.wasPresent(19n, LOCAL_RICH_WALLETS[1].address)).to.eq(true);

    expect( await pop.wasPresent(19n, LOCAL_RICH_WALLETS[2].address)).to.eq(true);
    
  });
  
  it('Should not allow marking attendance for wrong generation', async function() {

    const { pop } = await deploy();
    try {
      const tx = await pop.markAttendance(20n, LOCAL_RICH_WALLETS[1].address);
      await tx.wait();
      expect.fail('Expected to revert');
    } catch (error) {
      expect(error.message).to.include('Generation is not open');
    }
  });

  it('Should have initial token supply of 1mil', async function() {
    const { drewCoin } = await deploy();
    
    expect(await drewCoin.totalSupply()).to.eq(0n);
  });
  
  it('After the first generation the supply should increase by default amount', async function () {
    const { pop, drewCoin } = await deploy();

    await pop.closeGeneration('Year of the impotent tennis ball');

    expect(await drewCoin.totalSupply()).to.eq(1000000000000000000000000n);

  });
  
  it('After the generation increase the supply should increase by specified amount', async function () {

    const { pop, drewCoin } = await deploy();

    await pop.setIssuance(5000000000000000000000000n);

    await pop.closeGeneration('Year of the impotent tennis ball');

    expect(await drewCoin.totalSupply()).to.eq(5000000000000000000000000n);

  });

  it('Should allow two attendees of the same generation to claim', async function () {

    const { pop, drewCoin, getNft } = await deploy();

    await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
    await pop.markAttendance(19n, LOCAL_RICH_WALLETS[2].address);

    await pop.closeGeneration('Year of the impotent tennis ball');

    const popAddress = await pop.getAddress();
    const user1 = getWallet(LOCAL_RICH_WALLETS[1].privateKey);
    const user2 = getWallet(LOCAL_RICH_WALLETS[2].privateKey);

    expect(await drewCoin.balanceOf(popAddress)).to.eq(1000000000000000000000000n);

    const nft = await getNft(19n);

    await (pop.connect(user1) as Contract).claim(19n)
    await (pop.connect(user2) as Contract).claim(19n)

    expect(await nft.balanceOf(user1.address)).to.eq(1n);
    expect(await drewCoin.balanceOf(user1.address)).to.eq(500000000000000000000000n);
    expect(await nft.balanceOf(user2.address)).to.eq(1n);
    expect(await drewCoin.balanceOf(user2.address)).to.eq(500000000000000000000000n);
    expect(await nft.balanceOf(popAddress)).to.eq(0n);
    expect(await drewCoin.balanceOf(popAddress)).to.eq(0n);

  });
  
  it('Should allow 5 attendees over two generations to claim their correct reward amounts', async function () {

    const { pop, drewCoin, getNft } = await deploy();

    await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
    await pop.markAttendance(19n, LOCAL_RICH_WALLETS[2].address);
    
    await pop.closeGeneration('Year of the impotent tennis ball');
    
    const oneHalf = 1000000000000000000000000n / 2n;

    const oneThird = 2000000000000000000000000n / 3n;

    await pop.setIssuance(2000000000000000000000000n);
    await pop.markAttendance(20n, LOCAL_RICH_WALLETS[2].address);
    await pop.markAttendance(20n, LOCAL_RICH_WALLETS[3].address);
    await pop.markAttendance(20n, LOCAL_RICH_WALLETS[1].address);
    
    await pop.closeGeneration('Year of the impotent tennis ball');

    const popAddress = await pop.getAddress();
    const user1 = getWallet(LOCAL_RICH_WALLETS[1].privateKey);
    const user2 = getWallet(LOCAL_RICH_WALLETS[2].privateKey);
    const user3 = getWallet(LOCAL_RICH_WALLETS[3].privateKey);

    expect(await drewCoin.balanceOf(popAddress)).to.eq(3000000000000000000000000n);
    
    const nft19 = await getNft(19n);
    const nft20 = await getNft(20n);

    await (pop.connect(user1) as Contract).claim(19n)
    await (pop.connect(user2) as Contract).claim(19n)
    await (pop.connect(user1) as Contract).claim(20n)
    await (pop.connect(user2) as Contract).claim(20n)
    await (pop.connect(user3) as Contract).claim(20n)
    

    expect(await drewCoin.balanceOf(user1.address)).to.eq(oneHalf + oneThird);
    expect(await nft19.balanceOf(user1.address)).to.eq(1n);
    expect(await nft20.balanceOf(user1.address)).to.eq(1n);
    expect(await drewCoin.balanceOf(user2.address)).to.eq(oneHalf + oneThird);
    expect(await nft19.balanceOf(user2.address)).to.eq(1n);
    expect(await nft20.balanceOf(user2.address)).to.eq(1n);
    expect(await drewCoin.balanceOf(user3.address)).to.eq(oneThird);
    expect(await nft19.balanceOf(user3.address)).to.eq(0n);
    expect(await nft20.balanceOf(user3.address)).to.eq(1n);

  });
  
  it('Non paloozateer should be unable to claim', async function () {

    const { pop } = await deploy();

    await pop.markAttendance(19n, LOCAL_RICH_WALLETS[1].address);
    
    await pop.closeGeneration('Year of the impotent tennis ball');

    const user2 = getWallet(LOCAL_RICH_WALLETS[2].privateKey);
    
    try {
      await (pop.connect(user2) as Contract).claim(19n);
      expect.fail('Expected to revert');
    } catch (error) {
      expect(error.message).to.include('Paloozateer was not present for this generation');
    }

  });

});
