const { expect } = require("chai");
const { ethers, deployments,hre } = require("hardhat");
const { ContractFactory } = require("ethers");

describe("TGE Contract", () => {
    let TOKENX: any, USDC: any, WETH: any;
    let owner: any, user1: any;
    let mockEndpointV2A: any;
    let EndpointV2Mock: any;
    let tge: any;
    let tokenX: any;
    let endpointOwner: any;
    let eidA: number;
    let MyOFT: any;
    const initialUSDCSupply = ethers.utils.parseUnits("1000000", 6); // 1,000,000 USDC

    beforeEach(async () => {
        [owner, user1] = await ethers.getSigners();
        eidA = 1
        // We are using a derived contract that exposes a mint() function for testing purposes
        MyOFT = await ethers.getContractFactory('TOKENX')

        // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
        const signers = await ethers.getSigners();
        [owner, endpointOwner] = signers

        MyOFT = await ethers.getContractFactory('TOKENX')

        // Fetching the first three signers (accounts) from Hardhat's local Ethereum network

        // The EndpointV2Mock contract comes from   package
        // and its artifacts are connected as external artifacts to this project
        //
        // Unfortunately, hardhat itself does not yet provide a way of connecting external artifacts,
        // so we rely on hardhat-deploy to create a ContractFactory for EndpointV2Mock
        //
        // See https://github.com/NomicFoundation/hardhat/issues/1040

        const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock')
        EndpointV2Mock = new ContractFactory(EndpointV2MockArtifact.abi, EndpointV2MockArtifact.bytecode, endpointOwner)
        mockEndpointV2A = await EndpointV2Mock.deploy(eidA)
        // token deployment 
        TOKENX = await ethers.getContractFactory('TOKENX');

        tokenX = await TOKENX.deploy(mockEndpointV2A.address, owner.address)

        // Deploy mock USDC token
        let MockERC20 = await ethers.getContractFactory("ERC20Mock");

        USDC = await MockERC20.deploy("USD Coin", "USDC");
        await USDC.mint(user1.address, initialUSDCSupply);

        // Deploy TGE contract
        const TGEContract = await ethers.getContractFactory("TGE");
        tge = await TGEContract.deploy(
            tokenX.address,
            USDC.address,
        );
        await tge.deployed();

    });

    describe("Initialization", () => {
        it("Should initialize the contract with correct parameters", async () => {
            expect(await tge.tokenX()).to.equal(tokenX.address);
            expect(await tge.usdc()).to.equal(await USDC.address);
            expect((await tge.saleStart()).toString()).to.equal((0).toString());
            expect((await tge.saleClose()).toString()).to.equal((0).toString());
        });
    });

    describe("Allocating TOKENX tokens", () => {
        it("Should initialize sale start and close times", async function () {

            const block = await hre.ethers.provider.getBlock("latest");

            // Print the block timestamp
            const start = block.timestamp + 600; // 1 min later
            const close = start + 3600; // 1 hour later

            await tge.Initialize(start, close);

            expect((await tge.saleStart()).toString()).to.equal((block.timestamp + 600).toString());
            expect((await tge.saleClose()).toString()).to.equal(close.toString());
        });

        it("Should revert if allocation is attempted after sale start", async () => {
            const allocation = ethers.utils.parseUnits("100000", 18); // Allocate 100,000 TOKENX
            await tokenX.connect(owner).approve(tge.address, allocation);

            // Fast forward time to after sale start
            await ethers.provider.send("evm_increaseTime", [600]);
            await ethers.provider.send("evm_mine");
            async function allocateTOKENX() {
                try {
                    await tge.allocateTOKENX(allocation);
                    return false;
                } catch (error: any) {
                    if (error.message.includes("SaleHasStarted")) {
                        return true;
                    } else {
                        return false;
                    }

                }
            };
            expect(await allocateTOKENX()).to.be.true;
        });

        it("Should retrun the allocated amount", async () => {

            const allocation = ethers.utils.parseUnits("100000", 18); // Allocate 100,000 TOKENX
            await tokenX.connect(owner).approve(tge.address, allocation);
            await tokenX.mint(owner.address, allocation);
            const block = await hre.ethers.provider.getBlock("latest");

            // Print the block timestamp
            const start = block.timestamp + 600; // 1 min later
            const close = start + 3600; // 1 hour later

            await tge.Initialize(start, close);
            await tge.connect(owner).allocateTOKENX(allocation);
            expect((await tge.tokenXTokensAllocated()).toString()).to.equal(allocation.toString());
        });
    });

    describe("Depositing funds", () => {
        it("Should allow depositing USDC tokens", async () => {

            const allocation = ethers.utils.parseUnits("1000000000", 18); // Allocate 100,000 TOKENX
            await tokenX.connect(owner).approve(tge.address, allocation);
            await tokenX.mint(owner.address, allocation);
            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            const block = await hre.ethers.provider.getBlock("latest");

            // Print the block timestamp
            const start = block.timestamp + 60; // 1 min later
            const close = start + 3600; // 1 hour later

            await tge.Initialize(start, close);
            await tge.allocateTOKENX(allocation);
            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            await USDC.connect(user1).approve(tge.address, depositAmount);
            await USDC.mint(user1.address, depositAmount);
            await (tge.connect(user1).depositUsdc(depositAmount))
            expect((await tge.isDepositor(user1.address)).toString()).to.equal("true");
            expect((await USDC.balanceOf(tge.address)).toString()).to.equal(depositAmount.toString());
        });

        it("Should return correct depositors addresses", async () => {
            const allocation = ethers.utils.parseUnits("1000000000", 18); // Allocate 100,000 TOKENX
            await tokenX.connect(owner).approve(tge.address, allocation);
            await tokenX.mint(owner.address, allocation);
            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            const block = await hre.ethers.provider.getBlock("latest");

            // Print the block timestamp
            const start = block.timestamp + 60; // 1 min later
            const close = start + 3600; // 1 hour later

            await tge.Initialize(start, close);
            await tge.allocateTOKENX(allocation);
            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            await USDC.connect(user1).approve(tge.address, depositAmount);
            await USDC.mint(user1.address, depositAmount);
            await (tge.connect(user1).depositUsdc(depositAmount))
            expect((await tge.isDepositor(user1.address)).toString()).to.equal("true");
            const account = await tge.getDepositors();
            expect(account[0]).to.equal(user1.address);
            expect(account.length == 1) ;
            
         });

        it("Should revert if deposit is attempted before sale start", async () => {

            const allocation = ethers.utils.parseUnits("1000000000", 18); // Allocate 100,000 TOKENX
            await tokenX.connect(owner).approve(tge.address, allocation);
            await tokenX.mint(owner.address, allocation);

            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            await USDC.connect(user1).approve(tge.address, depositAmount);

            const block = await hre.ethers.provider.getBlock("latest");

            // Print the block timestamp
            const start = block.timestamp + 60; // 1 min later
            const close = start + 3600; // 1 hour later

            await tge.Initialize(start, close);
            await tge.allocateTOKENX(allocation);

            async function depositUsdbc() {
                try {
                    await tge.connect(user1).depositUsdc(depositAmount);
                    return false;
                } catch (error: any) {
                    if (error.message.includes("SaleNotStarted")) {
                        return true;
                    } else {
                        console.log(error.message);
                        return false;
                    }
                }
            }
            expect(
                await depositUsdbc()
            ).to.be.true;

        });

        it("Should revert if deposit exceeds MAX_DEPOSIT", async () => {
            const depositAmount = ethers.utils.parseUnits("2000000", 6); // Exceed MAX_DEPOSIT
            const block = await hre.ethers.provider.getBlock("latest");

            // Initialize sale start and close times
            const start = block.timestamp + 60; // 1 min later
            const close = start + 3600; // 1 hour later

            await tge.Initialize(start, close);

            // Fast forward time to sale start
            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            // Approve and mint tokens
            await USDC.connect(user1).approve(tge.address, depositAmount);
            await USDC.mint(user1.address, depositAmount);

            // Attempt deposit
            async function depositExceedMax() {
                try {
                    await tge.connect(user1).depositUsdc(depositAmount);
                    return false;
                } catch (error: any) {
                    if (error.message.includes("MaxDepositAmountExceeded")) {
                        return true;
                    } else {
                        console.log(error.message);
                        return false;
                    }
                }
            }

            // Expect the error to be thrown
            expect(await depositExceedMax()).to.be.true;
        });

        it("Should reject deposits after sale cancellation", async function () {
            const block = await hre.ethers.provider.getBlock("latest");

            // Initialize sale start and close times
            const start = block.timestamp + 60; // 1 min later
            const close = start + 3600; // 1 hour later
            const depositAmount = ethers.utils.parseUnits("100", 6);
            const allocation = ethers.utils.parseUnits("1000000000", 18); // Allocate 100,000 TOKENX
            await tokenX.connect(owner).approve(tge.address, allocation);
            await tokenX.mint(owner.address, allocation);

            await tge.Initialize(start, close);
            await tge.allocateTOKENX(allocation);
            await tge.cancelSale();

            await USDC.connect(user1).approve(tge.address, depositAmount);

            async function depositAfterCancellation() {
                try {
                    await tge.connect(user1).depositUsdc(depositAmount);
                    return false;
                }
                catch (error: any) {
                    if (error.message.includes("SaleCancelled")) {
                        return true;
                    }
                }

                return false;
            }
            expect(await depositAfterCancellation()).to.be.true;
        });
    });

    describe("Claiming tokens", () => {
        it("Should allow claiming TOKENX tokens after sale close", async () => {
            const allocation = ethers.utils.parseUnits("1000000000", 18); // Allocate 100,000 TOKENX

            await tokenX.approve(tge.address, allocation);
            await tokenX.mint(owner.address, allocation);
            const block = await hre.ethers.provider.getBlock("latest");
            // Print the block timestamp
            const start = block.timestamp + 60; // 1 min later
            const close = start + 3600; // 1 hour later
            await tge.Initialize(start, close);
            await tge.allocateTOKENX(allocation);
            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            const claimAmount = ethers.utils.parseUnits("1000", 18); // (100 / 0.1 ) = 1000 TOKENX
            await USDC.connect(user1).approve(tge.address, depositAmount);
            // Fast forward time to sale start
            await ethers.provider.send("evm_increaseTime", [60]);
            await ethers.provider.send("evm_mine");

            await tge.connect(user1).depositUsdc(depositAmount);

            // Fast forward time to sale close
            await ethers.provider.send("evm_increaseTime", [3600]);
            await ethers.provider.send("evm_mine");

            await (tge.connect(user1).claimTOKENX())
            expect((await tokenX.balanceOf(user1.address)).toString()).to.equal(claimAmount.toString());
        });
    });

    describe("Withdrawing funds", () => {
        it("Should allow the owner to withdraw USDC after sale close", async () => {

            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            await USDC.connect(user1).approve(tge.address, depositAmount);
            await tokenX.approve(tge.address, ethers.utils.parseUnits("100000", 18));
            await tokenX.mint(owner.address, ethers.utils.parseUnits("100000", 18));

            const block = await hre.ethers.provider.getBlock("latest");

            // Print the block timestamp
            const start = block.timestamp + 60; // 1 min later
            const close = start + 3600; // 1 hour later

            await tge.Initialize(start, close);
            await tge.allocateTOKENX(ethers.utils.parseUnits("100000", 18));
            // Fast forward time to sale start
            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            await tge.connect(user1).depositUsdc(depositAmount);

            // Fast forward time to sale close
            await ethers.provider.send("evm_increaseTime", [3660]);
            await ethers.provider.send("evm_mine");


            await (tge.withdraw())

            expect((await USDC.balanceOf(owner.address)).toString()).to.equal(depositAmount.toString());
        });

    });

    describe("Cancelling Sale", () => {
        it("Should cancel the sale before the saleClose", async () => {
            const block = await ethers.provider.getBlock("latest");
            const start = block.timestamp + 60; // 1 min later
            const close = start + 3600; // 1 hour later

            await tge.Initialize(start, close);
            await tge.cancelSale();
            expect(await tge.saleCancelled()).to.be.true;
        });

        it("Should revert if cancelling after sale close", async () => {
            const block = await ethers.provider.getBlock("latest");
            const start = block.timestamp + 60;
            const close = start + 120;

            await tge.Initialize(start, close);

            await ethers.provider.send("evm_increaseTime", [200]);
            await ethers.provider.send("evm_mine");
            async function cancelSale() {
                try {
                    await tge.cancelSale();
                    return false;
                } catch (error: any) {
                    if (error.message.includes("SaleEnded")) {
                        return true;
                    } else {
                        console.log(error.message);
                        return false;
                    }
                }
            }
            expect(
                await cancelSale()
            ).to.be.true;
        });
    });

    describe("Withdraw USDC After Cancellation", () => {
        it("Should allow users to withdraw USDC after cancellation", async () => {
            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            const block = await ethers.provider.getBlock("latest");
            const start = block.timestamp + 60;
            const close = start + 3600;
            const allocation = ethers.utils.parseUnits("100000", 18);
            await tokenX.mint(owner.address, allocation);
            await tokenX.approve(tge.address, allocation);
            await USDC.connect(user1).approve(tge.address, depositAmount);
            await tge.Initialize(start, close);
            await tge.allocateTOKENX(allocation);
            await tokenX.mint(owner.address, allocation);
            await USDC.connect(user1).approve(tge.address, depositAmount);
            await USDC.mint(user1.address, depositAmount);
            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            await tge.connect(user1).depositUsdc(depositAmount);
            await tge.cancelSale();
            const beforeBalance = await USDC.balanceOf(user1.address);
            await tge.connect(user1).withdrawUsdcAfterCancellation();
            const afterBalance = await USDC.balanceOf(user1.address);
            expect((afterBalance - beforeBalance).toString()).to.equal(depositAmount.toString());
        });

        it("Should revert if sale is not cancelled", async () => {
            async function withdrawUsdcAfterCanellation() {
                try {
                    await tge.connect(user1).withdrawUsdcAfterCancellation();
                    return false;
                }
                catch (error: any) {
                    if (error.message.includes("SaleNotCancelled")) {
                        return true;
                    }
                    return false;
                }
            }
            expect(
                await withdrawUsdcAfterCanellation()
            ).to.be.true;
        });

    });

    describe("Withdraw and Cancel Allocation", () => {

        it("Should allow owner to withdraw deposits and cancel allocation", async () => {
            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            const block = await ethers.provider.getBlock("latest");
            const start = block.timestamp + 60;
            const close = start + 3600;
            const allocation = ethers.utils.parseUnits("1000000000", 18); // Allocate 100,000 TOKENX

            await tokenX.approve(tge.address, allocation);
            await tokenX.mint(owner.address, allocation);
            await tge.Initialize(start, close);
            await tge.allocateTOKENX(allocation);

            await USDC.connect(user1).approve(tge.address, depositAmount);
            await USDC.mint(user1.address, depositAmount);

            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            await tge.connect(user1).depositUsdc(depositAmount);
            const beforeBalance = await USDC.balanceOf(user1.address);
            await tge.withdrawAndCancelAllocation(user1.address);
            const afterBalance = await USDC.balanceOf(user1.address);
            expect((await tge.isDepositor(user1.address)).toString()).to.equal("false");
            expect((afterBalance - beforeBalance).toString()).to.equal(depositAmount.toString());
        });

        it("usdcDeposit calculation Testing : withdrawAndCancelAllocation ", async () => {
            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            const block = await ethers.provider.getBlock("latest");
            const start = block.timestamp + 60;
            const close = start + 3600;
            const allocation = ethers.utils.parseUnits("1000000000", 18); // Allocate 100,000 TOKENX

            await tokenX.approve(tge.address, allocation);
            await tokenX.mint(owner.address, allocation);
            await tge.Initialize(start, close);
            await tge.allocateTOKENX(allocation);

            await USDC.connect(user1).approve(tge.address, depositAmount);
            await USDC.mint(user1.address, depositAmount);

            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            await tge.connect(user1).depositUsdc(depositAmount);
            const beforeUsdcDeposit = await tge.usdcDeposited();
            await tge.withdrawAndCancelAllocation(user1.address);
            const afterUsdcDeposit = await tge.usdcDeposited();
            expect((beforeUsdcDeposit - afterUsdcDeposit).toString()).to.equal(depositAmount.toString());

        });

        it("usdcDeposit calculation Testing : after withdrawAndCancelAllocation by Owner : No deposit from User1", async () => {
            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            const block = await ethers.provider.getBlock("latest");
            const start = block.timestamp + 60;
            const close = start + 3600;
            const allocation = ethers.utils.parseUnits("1000000000", 18); // Allocate 100,000 TOKENX

            await tokenX.approve(tge.address, allocation);
            await tokenX.mint(owner.address, allocation);
            await tge.Initialize(start, close);
            await tge.allocateTOKENX(allocation);

            await USDC.connect(user1).approve(tge.address, depositAmount);
            await USDC.mint(user1.address, depositAmount);

            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            const beforeUsdcDeposit = await tge.usdcDeposited();
            await tge.withdrawAndCancelAllocation(user1.address);
            const afterUsdcDeposit = await tge.usdcDeposited();
            expect((beforeUsdcDeposit - afterUsdcDeposit).toString()).to.equal("0");

        });

    });

    describe("Withdraw All Tokens", () => {
        it("Should revert to withdraw all USDC using withdrawAll", async () => {
            const depositAmount = ethers.utils.parseUnits("100", 6);
            await tokenX.mint(tge.address, depositAmount);
            async function withdraw() {
                try {
                    await tge.withdrawAll(user1.address, tokenX.address);
                    return false;
                } catch (error: any) {
                    if (error.message.includes("InvalidAddress")) {
                        return true;
                    } else {
                        console.log(error.message);
                        return false;
                    }
                }
            }
            expect(
                await withdraw()
            ).to.be.true;
        });
        it("Should revert to withdraw all TOKENX using withdrawAll", async () => {
            const depositAmount = ethers.utils.parseUnits("100", 6);
            await tokenX.mint(tge.address, depositAmount);
            async function withdraw() {
                try {
                    await tge.withdrawAll(user1.address, USDC.address);
                    return false;
                } catch (error: any) {
                    if (error.message.includes("InvalidAddress")) {
                        return true;
                    } else {
                        console.log(error.message);
                        return false;
                    }
                }
            }
            expect(
                await withdraw()
            ).to.be.true;
        });
        it("Should allow owner to withdraw all tokens using withdrawAll", async () => {
            const depositAmount = ethers.utils.parseUnits("100", 6);
            let MockERC20 = await ethers.getContractFactory("ERC20Mock");

            let tokenX = await MockERC20.deploy("TOKENX Coin", "TOKENX");
            await tokenX.mint(tge.address, depositAmount);
            await tge.withdrawAll(owner.address, tokenX.address);
            const balance = await tokenX.balanceOf(owner.address);
            expect(balance.toString()).to.equal(depositAmount.toString());
        });
    });

    describe("cancelAllocation", () => {
        it("Should allow user to cancel allocation and withdraw deposits", async () => {
            // Setup sale parameters
            const block = await ethers.provider.getBlock("latest");
            const start = block.timestamp + 60; // Sale starts in 1 minute
            const close = start + 3600; // Sale closes in 1 hour
            const depositAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
            const allocation = ethers.utils.parseUnits("1000000000", 18); // 1,000,000 TOKENX

            // Initialize and allocate TOKENX
            await tge.Initialize(start, close);
            await tokenX.mint(owner.address, allocation);
            await tokenX.approve(tge.address, allocation);
            await tge.allocateTOKENX(allocation);

            // Approve and deposit USDC
            await USDC.connect(user1).approve(tge.address, depositAmount);
            await ethers.provider.send("evm_increaseTime", [120]); // Move to after sale start
            await ethers.provider.send("evm_mine");

            await tge.connect(user1).depositUsdc(depositAmount);

            // Cancel allocation
            const beforeBalance = await USDC.balanceOf(user1.address);
            await tge.connect(user1).cancelAllocation();
            const afterBalance = await USDC.balanceOf(user1.address);

            // Check that deposit was refunded
            expect((await tge.isDepositor(user1.address)).toString()).to.equal("false");
            expect((afterBalance.sub(beforeBalance)).toString()).to.equal(depositAmount.toString());
        });

        it("Should revert if sale has ended", async () => {
            const block = await ethers.provider.getBlock("latest");
            const start = block.timestamp + 60; // Sale starts in 1 minute
            const close = start + 120; // Sale closes in 2 minutes
            const depositAmount = ethers.utils.parseUnits("100", 6);
            const allocation = ethers.utils.parseUnits("1000000000", 18);

            // Initialize and allocate TOKENX
            await tge.Initialize(start, close);
            await tokenX.mint(owner.address, allocation);
            await tokenX.approve(tge.address, allocation);
            await tge.allocateTOKENX(allocation);

            // Deposit USDC
            await USDC.connect(user1).approve(tge.address, depositAmount);
            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");
            await tge.connect(user1).depositUsdc(depositAmount);

            // Move past sale close
            await ethers.provider.send("evm_increaseTime", [3600]);
            await ethers.provider.send("evm_mine");

            async function attemptCancelAfterEnd() {
                try {
                    await tge.connect(user1).cancelAllocation();
                    return false;
                } catch (error) {
                    if (error.message.includes("SaleEnded")) {
                        return true;
                    }
                    return false;
                }
            }
            expect(await attemptCancelAfterEnd()).to.be.true;
        });

        it("Should revert if no deposits are present", async () => {
            const block = await ethers.provider.getBlock("latest");
            const start = block.timestamp + 60; // Sale starts in 1 minute
            const close = start + 3600; // Sale closes in 1 hour
            const allocation = ethers.utils.parseUnits("1000000000", 18);

            // Initialize and allocate TOKENX
            await tge.Initialize(start, close);
            await tokenX.mint(owner.address, allocation);
            await tokenX.approve(tge.address, allocation);
            await tge.allocateTOKENX(allocation);

            await ethers.provider.send("evm_increaseTime", [120]); // Move to after sale start
            await ethers.provider.send("evm_mine");

            // Attempt to cancel allocation without deposit
            async function attemptCancelWithoutDeposit() {
                try {
                    await tge.connect(user1).cancelAllocation();
                    return false;
                } catch (error) {
                    if (error.message.includes("NoDeposits")) {
                        return true;
                    }
                    return false;
                }
            }
            expect(await attemptCancelWithoutDeposit()).to.be.true;
        });

    });

    
});
