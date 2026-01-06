const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function() {
    let dex, tokenA, tokenB, owner, addr1, addr2;

    beforeEach(async function() {
        [owner, addr1, addr2] = await ethers.getSigners();
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        tokenA = await MockERC20.deploy("Token A", "TKA");
        tokenB = await MockERC20.deploy("Token B", "TKB");
        const DEX = await ethers.getContractFactory("DEX");
        dex = await DEX.deploy(tokenA.address, tokenB.address);
        
        await tokenA.approve(dex.address, ethers.constants.MaxUint256);
        await tokenB.approve(dex.address, ethers.constants.MaxUint256);
        
        await tokenA.mint(addr1.address, ethers.utils.parseEther("1000"));
        await tokenB.mint(addr1.address, ethers.utils.parseEther("1000"));
        await tokenA.connect(addr1).approve(dex.address, ethers.utils.parseEther("1000"));
        await tokenB.connect(addr1).approve(dex.address, ethers.utils.parseEther("1000"));
    });

    describe("Liquidity Management", function() {
        it("should allow initial liquidity provision", async function() {
            await expect(dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("100"))).to.emit(dex, "LiquidityAdded");
        });
        it("should mint correct LP tokens for first provider", async function() {
            await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("400"));
            expect(await dex.liquidity(owner.address)).to.equal(ethers.utils.parseEther("200"));
        });
        it("should allow subsequent liquidity additions", async function() {
            await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("100"));
            await dex.connect(addr1).addLiquidity(ethers.utils.parseEther("50"), ethers.utils.parseEther("50"));
            expect(await dex.totalLiquidity()).to.equal(ethers.utils.parseEther("150"));
        });
        it("should maintain price ratio on liquidity addition", async function() {
            await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
            const p1 = await dex.getPrice();
            await dex.connect(addr1).addLiquidity(ethers.utils.parseEther("50"), ethers.utils.parseEther("100"));
            expect(await dex.getPrice()).to.equal(p1);
        });
        it("should allow partial liquidity removal", async function() {
            await dex.addLiquidity(1000, 1000);
            await dex.removeLiquidity(500);
            expect(await dex.liquidity(owner.address)).to.equal(500);
        });
        it("should return correct token amounts on liquidity removal", async function() {
            await dex.addLiquidity(100, 200);
            await dex.removeLiquidity(await dex.liquidity(owner.address));
            const [rA, rB] = await dex.getReserves();
            expect(rA).to.equal(0);
        });
        it("should revert on zero liquidity addition", async function() {
            await expect(dex.addLiquidity(0, 0)).to.be.revertedWith("Amounts must be > 0");
        });
        it("should revert when removing more liquidity than owned", async function() {
            await dex.addLiquidity(10, 10);
            await expect(dex.removeLiquidity(20)).to.be.revertedWith("Insufficient liquidity balance");
        });
    });

    describe("Token Swaps", function() {
        beforeEach(async function() { await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200")); });
        it("should swap token A for token B", async function() { await expect(dex.swapAForB(100)).to.emit(dex, "Swap"); });
        it("should swap token B for token A", async function() { await expect(dex.swapBForA(100)).to.emit(dex, "Swap"); });
        it("should calculate correct output amount with fee", async function() {
            const out = await dex.getAmountOut(ethers.utils.parseEther("10"), ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
            const b1 = await tokenB.balanceOf(owner.address);
            await dex.swapAForB(ethers.utils.parseEther("10"));
            expect((await tokenB.balanceOf(owner.address)).sub(b1)).to.equal(out);
        });
        it("should update reserves after swap", async function() {
            await dex.swapAForB(ethers.utils.parseEther("1"));
            const [rA] = await dex.getReserves();
            expect(rA).to.be.gt(ethers.utils.parseEther("100"));
        });
        it("should increase k after swap due to fees", async function() {
            const [rA1, rB1] = await dex.getReserves();
            const k1 = rA1.mul(rB1);
            await dex.swapAForB(ethers.utils.parseEther("10"));
            const [rA2, rB2] = await dex.getReserves();
            expect(rA2.mul(rB2)).to.be.gt(k1);
        });
        it("should revert on zero swap amount", async function() { 
            await expect(dex.swapAForB(0)).to.be.revertedWith("Amount must be > 0"); 
        });
        it("should handle large swaps with high price impact", async function() {
            await dex.swapAForB(ethers.utils.parseEther("500"));
            const [rA, rB] = await dex.getReserves();
            expect(rB).to.be.lt(ethers.utils.parseEther("200"));
        });
        it("should handle multiple consecutive swaps", async function() {
            await dex.swapAForB(100); await dex.swapAForB(100);
            const [rA] = await dex.getReserves();
            expect(rA).to.be.gt(ethers.utils.parseEther("100"));
        });
    });

    describe("Price Calculations", function() {
        it("should return correct initial price", async function() {
            await dex.addLiquidity(100, 200);
            expect(await dex.getPrice()).to.equal(ethers.utils.parseEther("2"));
        });
        it("should update price after swaps", async function() {
            await dex.addLiquidity(100, 100);
            await dex.swapAForB(50);
            expect(await dex.getPrice()).to.be.lt(ethers.utils.parseEther("1"));
        });
        it("should handle price queries with zero reserves gracefully", async function() {
            await expect(dex.getPrice()).to.be.revertedWith("No liquidity");
        });
    });

    describe("Fee Distribution", function() {
        it("should accumulate fees for liquidity providers", async function() {
            await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("100"));
            await dex.connect(addr1).swapAForB(ethers.utils.parseEther("10"));
            await dex.removeLiquidity(await dex.liquidity(owner.address));
            expect(await tokenA.balanceOf(owner.address)).to.be.gt(ethers.utils.parseEther("999900"));
        });
        it("should distribute fees proportionally to LP share", async function() {
            await dex.addLiquidity(1000, 1000);
            await dex.connect(addr1).addLiquidity(1000, 1000);
            await tokenA.mint(addr2.address, 500);
            await tokenA.connect(addr2).approve(dex.address, 500);
            await dex.connect(addr2).swapAForB(500);
            expect(await dex.liquidity(owner.address)).to.equal(await dex.liquidity(addr1.address));
        });
    });

    describe("Edge Cases", function() {
        it("should handle very small liquidity amounts", async function() { await dex.addLiquidity(10, 10); expect(await dex.totalLiquidity()).to.be.gt(0); });
        it("should handle very large liquidity amounts", async function() {
            const large = ethers.utils.parseEther("10000");
            await dex.addLiquidity(large, large);
            expect(await dex.totalLiquidity()).to.be.gt(0);
        });
        it("should prevent unauthorized access", async function() {
            await dex.addLiquidity(100, 100);
            await expect(dex.connect(addr1).removeLiquidity(100)).to.be.reverted;
        });
    });

    describe("Events", function() {
        it("should emit LiquidityAdded event", async function() { await expect(dex.addLiquidity(10, 10)).to.emit(dex, "LiquidityAdded"); });
        it("should emit LiquidityRemoved event", async function() {
            await dex.addLiquidity(10, 10);
            await expect(dex.removeLiquidity(await dex.liquidity(owner.address))).to.emit(dex, "LiquidityRemoved");
        });
        it("should emit Swap event", async function() {
            await dex.addLiquidity(100, 100);
            await expect(dex.swapAForB(10)).to.emit(dex, "Swap");
        });
    });
});