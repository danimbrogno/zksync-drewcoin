import { estimateDeploymentFee } from "./utils";

(BigInt.prototype as any).toJSON = function() { return this.toString() }

export default async function () {
  // const contractArtifactName = "DrewCoin";
  // const constructorArguments = [1000000000000000000000000n];
  // const contractArtifactName = "PaloozaBadge";
  // const constructorArguments = ['Proof of Palooza', 'POP', '', 0n, 0n];
  const contractArtifactName = "ProofOfPalooza";
  const constructorArguments = [19, 1000000000000000000000000n, 'Proof of Palooza', 'POP'];
  
  await estimateDeploymentFee(contractArtifactName, constructorArguments);
}
