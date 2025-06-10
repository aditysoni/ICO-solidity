import { ethers } from "hardhat";

const approval = async() => 
{
   const tokenX = await ethers.getContractAt("TokenX", "0xaaBAC2A81486c7e945251140deB1f62795213488");
    // cons usdc = await ethers.getContractAt("USDC", "0xBb4aD8D9F198527e94E770a57cA7EAf364917f19");
    // const approval = await b3x.approve("0xBb4aD8D9F198527e94E770a57cA7EAf364917f19", ethers.utils.parseUnits("1000", 18))
    // console.log(approval);

    const tge = await ethers.getContractAt("TGE", "0xBb4aD8D9F198527e94E770a57cA7EAf364917f19");
    console.log("testing ", await tge.refundAmount("0xB9FB603f882438388D7f3Db8B64E34700493E49f"))

    // console.log("approved value ", await tokenX.allowance("0x1B20869b7294BF4114Ef2121f274BC5854383a18","0x45d9384D36e041112149F7DaB3BB1d10fF73E917"));
}

approval()





// 1 . deploying the token . 
// 2 . Minting the token to a second Admin account . 
// 3 . Approving the token from behalf of the admin account . 
// 4 . Initialaing the token sale 
// 5 . Allocating the token 
// 6 . Set the price in the contract to the 0.01 
// 7 . Depositiion of the token 
// 8 . Waiting for the token sale to end . 