
import { ethers } from 'hardhat'

async function main() {
  
    // Configuration parameters
    const tokenX = "0xCC9d7CF91E014577234226fEAc1508639275C8cb"; //  B3X token contract address
    const usdbc = "0x710faD8680Be60994c01E800684812ECe5090b38"; //  USDBC token contract address
    
    console.log("Deploying TGE contract...");
    const TGE = await ethers.getContractFactory("TGE");
    const tge = await TGE.deploy(
        tokenX,
        usdbc
    );

    await tge.deployed();
    console.log("TGE contract deployed at:", tge.address);

}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});