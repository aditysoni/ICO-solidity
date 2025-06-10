
import { ethers } from 'hardhat'

async function main() {
  
    // Configuration parameters
    const tokenX = "0xCC9d7CF91E014577234226fEAc1508639275C8cb";
    const TOKENX = await ethers.getContractAt("TOKENX", "0xCC9d7CF91E014577234226fEAc1508639275C8cb") //  B3X token contract address
    // await TOKENX.approve("0x63bFfaB7b956b15f1A8430A278320E2700E3d2ca", ethers.utils.parseUnits("1000000000000000", 18));
    // await TOKENX.mint("0x1B20869b7294BF4114Ef2121f274BC5854383a18", ethers.utils.parseUnits("100000000", 18));
    // // console.log("allowanve", await TOKENX.allowance("0x1B20869b7294BF4114Ef2121f274BC5854383a18","0x63bFfaB7b956b15f1A8430A278320E2700E3d2ca"));
    // console.log("balances of the tokenX", await TOKENX.balanceOf("0x1B20869b7294BF4114Ef2121f274BC5854383a18"));
    // console.log("approval", await TOKENX.allowance("0x1B20869b7294BF4114Ef2121f274BC5854383a18","0x63bFfaB7b956b15f1A8430A278320E2700E3d2ca"));
    // console.log("Deploying TGE contract...");

    const USDC = await ethers.getContractAt("ERC20Mock", "0x710faD8680Be60994c01E800684812ECe5090b38");
    // const usdc = await ethers.getContractFactory("ERC20Mock")
    // const USDC =  await usdc.deploy("USDC", "USDC");
    // console.log("USDC contract deployed at:", await USDC.address);
    const TGE = await ethers.getContractFactory("TGE");
    const tge = await TGE.deploy(
        tokenX,
        USDC.address
    );

    // await tge.deployed();
    console.log("TGE contract deployed at:", tge.address);
    console.log("balance", await USDC.balanceOf("0xB9FB603f882438388D7f3Db8B64E34700493E49f"));
     await TOKENX.approve("0xdbf75315692bD2955032502206a531Ed58f68058", ethers.utils.parseUnits("1000000000000000", 18));
    // await USDC.mint("0xB9FB603f882438388D7f3Db8B64E34700493E49f", ethers.utils.parseUnits("1000", 18))

}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});