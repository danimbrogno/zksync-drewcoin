import { expect } from 'chai';
import { getWallet, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
import { Contract, Wallet, ContractFactory } from 'zksync-ethers';

const deploy = async () => {
  
  let wallet: Wallet;
  
  wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
  
  const { deployer, contract } = await deployContract("ProofOfPalooza", [], { wallet, silent: true });
  
  await contract.waitForDeployment();

  const drewCoinAddr = await contract.token();

  const drewCoinArtifact = await deployer.loadArtifact("DrewCoin");

  const drewCoin = new Contract(drewCoinAddr, drewCoinArtifact.abi, wallet);

  return { pop: contract, drewCoin, wallet };

}
describe('Proof Of Palooza', function () {
  

  it("Should begin at generation 20", async function () {
    
    const { pop } = await deploy();
    expect(await pop.generation()).to.eq(20n);
    
  });

  it("Should allow incrementing generation", async function () {

    const { pop } = await deploy();
    await pop.closeGeneration();
    expect(await pop.generation()).to.eq(21n);

  });
  
  it("Should allow marking attendance of paloozateer for current generation", async function() {
    
    const { pop } = await deploy();
    const tx = await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
    
    await tx.wait();
    
    expect(await pop.paloozateers(0)).to.eq(LOCAL_RICH_WALLETS[1].address);
  });
  
  it("Should not allow marking attendance of paloozateer for next generation", async function() {
    
    const { pop } = await deploy();
    try {
      const tx = await pop.markAttendance(21, LOCAL_RICH_WALLETS[1].address);
      await tx.wait();
      expect.fail('Expected to revert');;

    } catch (error) {
      expect(error.message).to.include('Generation is not open');
    }

  });
  
  it("Should not allow marking paloozateer as present twice in the same generation", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    
    try {
      const tx1 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
      await tx1.wait();
      expect.fail('Expected to revert');
    } catch (error) {
      expect(error.message).to.include('Paloozateer already marked as present');
    }
    
  });
  
  it("Should allow adding two different paloozateers in the same generation", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    const tx1 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[2].address);
    await tx1.wait();
    
    const numPaloozateers = await pop.paloozateerIndex();
    const numAttendees = await pop.numAttendees(20);
    expect(numPaloozateers).to.eq(2n);
    expect( numAttendees).to.eq(2n);
    
  });
  it("Should allow adding the same paloozateers in different generations", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    const tx1 = await pop.closeGeneration();
    await tx1.wait();
    const tx2 = await pop.markAttendance(21, LOCAL_RICH_WALLETS[1].address);
    await tx2.wait();
    
    const numPaloozateers = await pop.paloozateerIndex();
    const numAttendees20 = await pop.numAttendees(20);
    const numAttendees21 = await pop.numAttendees(20);
    expect(numAttendees20).to.eq(1n);
    expect(numAttendees21).to.eq(1n);
    expect(numPaloozateers).to.eq(1n);
    
  });

  it("Should allow adding three paloozateers over 2 generations", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    const tx1 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[2].address);
    await tx1.wait();
    const tx2 = await pop.closeGeneration();
    await tx2.wait();
    const tx3 = await pop.markAttendance(21, LOCAL_RICH_WALLETS[3].address);
    await tx3.wait();

    const numPaloozateers = await pop.paloozateerIndex();
    const numAttendees20 = await pop.numAttendees(20);
    const numAttendees21 = await pop.numAttendees(21);

    expect(numAttendees20).to.eq(2n);
    expect(numAttendees21).to.eq(1n);
    expect(numPaloozateers).to.eq(3n);
    
  });

  it("Should allow closing a generation", async function() {
    
    const { pop } = await deploy();
    const tx0 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
    await tx0.wait();
    const tx1 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[2].address);
    await tx1.wait();
    
    await pop.closeGeneration();

    const isLocked = await pop.isGenerationLocked(20);
    const generation = await pop.generation();

    expect(isLocked).to.eq(true);
    expect(generation).to.eq(21n);

  });
  
  
  it("Should allow marking attendance", async function() {
    
    const { pop } = await deploy();
    
    const tx1 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);

    const tx2 = await pop.markAttendance(20, LOCAL_RICH_WALLETS[2].address);
    
    expect( await pop.wasPresent(20, LOCAL_RICH_WALLETS[1].address)).to.eq(true);

    expect( await pop.wasPresent(20, LOCAL_RICH_WALLETS[2].address)).to.eq(true);
    
  });
  
  it('Should not allow marking attendance for wrong generation', async function() {

    const { pop } = await deploy();
    try {
      const tx = await pop.markAttendance(21, LOCAL_RICH_WALLETS[1].address);
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

    await pop.closeGeneration();

    expect(await drewCoin.totalSupply()).to.eq(1000000000000000000000000n);

  });
  
  it('After the generation increase the supply should increase by specified amount', async function () {

    const { pop, drewCoin } = await deploy();

    await pop.setIssuance(5000000000000000000000000n);

    await pop.closeGeneration();

    expect(await drewCoin.totalSupply()).to.eq(5000000000000000000000000n);

  });

  it('Should allow two attendees of the same generation to claim their reward', async function () {

    const { pop, drewCoin, wallet } = await deploy();

    await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
    await pop.markAttendance(20, LOCAL_RICH_WALLETS[2].address);

    await pop.closeGeneration();

    const popAddress = await pop.getAddress();
    const user1 = getWallet(LOCAL_RICH_WALLETS[1].privateKey);
    const user2 = getWallet(LOCAL_RICH_WALLETS[2].privateKey);

    expect(await drewCoin.balanceOf(popAddress)).to.eq(1000000000000000000000000n);

    await (pop.connect(user1) as Contract).claim(20)
    await (pop.connect(user2) as Contract).claim(20)

    expect(await drewCoin.balanceOf(user1.address)).to.eq(500000000000000000000000n);
    expect(await drewCoin.balanceOf(user2.address)).to.eq(500000000000000000000000n);
    expect(await drewCoin.balanceOf(popAddress)).to.eq(0n);

  });
  
  it.only('Should allow 5 attendees over two generations to claim their correct reward amounts', async function () {

    const { pop, drewCoin } = await deploy();

    await pop.markAttendance(20, LOCAL_RICH_WALLETS[1].address);
    await pop.markAttendance(20, LOCAL_RICH_WALLETS[2].address);
    
    await pop.closeGeneration();
    
    const oneHalf = 1000000000000000000000000n / 2n;

    const oneThird = 2000000000000000000000000n / 3n;

    await pop.setIssuance(2000000000000000000000000n);
    await pop.markAttendance(21, LOCAL_RICH_WALLETS[1].address);
    await pop.markAttendance(21, LOCAL_RICH_WALLETS[2].address);
    await pop.markAttendance(21, LOCAL_RICH_WALLETS[3].address);
    
    await pop.closeGeneration();

    const popAddress = await pop.getAddress();
    const user1 = getWallet(LOCAL_RICH_WALLETS[1].privateKey);
    const user2 = getWallet(LOCAL_RICH_WALLETS[2].privateKey);
    const user3 = getWallet(LOCAL_RICH_WALLETS[3].privateKey);

    expect(await drewCoin.balanceOf(popAddress)).to.eq(3000000000000000000000000n);
    
    await (pop.connect(user1) as Contract).claim(20)
    await (pop.connect(user2) as Contract).claim(20)
    await (pop.connect(user1) as Contract).claim(21)
    await (pop.connect(user2) as Contract).claim(21)
    await (pop.connect(user3) as Contract).claim(21)
    

    expect(await drewCoin.balanceOf(user1.address)).to.eq(oneHalf + oneThird);
    expect(await drewCoin.balanceOf(user2.address)).to.eq(oneHalf + oneThird);
    expect(await drewCoin.balanceOf(user3.address)).to.eq(oneThird);

  });

});
