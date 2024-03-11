import { deployContract } from "./utils";

(BigInt.prototype as any).toJSON = function() { return this.toString() }

export default async function () {
  const contractArtifactName = "ProofOfPalooza";
  const constructorArguments = [19, 1000000000000000000000000n, 'Proof of Palooza', 'POP'];
  await deployContract(contractArtifactName, constructorArguments);
}
