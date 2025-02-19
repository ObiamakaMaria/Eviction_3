import { ethers, network } from "hardhat";
import { Contract, ContractTransaction, Signer, BigNumberish, ContractEvent, ContractReceipt, BaseContract } from "ethers";
import { parseEther, parseUnits, formatEther, formatUnits } from "@ethersproject/units";

const POSITION_MANAGER_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WHALE_ADDRESS = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";

type IERC20WithTyping = BaseContract & {
    transfer(recipient: string, amount: BigNumberish): Promise<ContractTransaction>;
    approve(spender: string, amount: BigNumberish): Promise<ContractTransaction>;
    balanceOf(account: string): Promise<BigNumberish>;
    connect(signer: Signer): IERC20WithTyping;
};

type INonfungiblePositionManager = BaseContract & {
    mint(params: {
        token0: string;
        token1: string;
        fee: number;
        tickLower: number;
        tickUpper: number;
        amount0Desired: BigNumberish;
        amount1Desired: BigNumberish;
        amount0Min: number;
        amount1Min: number;
        recipient: string;
        deadline: number;
    }): Promise<ContractTransaction>;
    positions(tokenId: BigNumberish): Promise<[BigNumberish, ...any[]]>;
};

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Interacting with Uniswap V3 using account:", deployer.address);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [WHALE_ADDRESS],
    });
    const whale = await ethers.getSigner(WHALE_ADDRESS);

    const weth = (await ethers.getContractAt("IERC20", WETH_ADDRESS)) as IERC20WithTyping;
    const usdc = (await ethers.getContractAt("IERC20", USDC_ADDRESS)) as IERC20WithTyping;
    const positionManager = (await ethers.getContractAt(
        "INonfungiblePositionManager",
        POSITION_MANAGER_ADDRESS
    )) as INonfungiblePositionManager;

    const wethAmount = parseEther("1");
    const usdcAmount = parseUnits("2000", 6);

    console.log("Transferring tokens from whale to deployer...");
    await weth.connect(whale).transfer(deployer.address, wethAmount);
    await usdc.connect(whale).transfer(deployer.address, usdcAmount);

    const wethBalance = await weth.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("WETH Balance:", formatEther(wethBalance));
    console.log("USDC Balance:", formatUnits(usdcBalance, 6));

    console.log("Approving tokens...");
    await weth.approve(POSITION_MANAGER_ADDRESS, wethAmount);
    await usdc.approve(POSITION_MANAGER_ADDRESS, usdcAmount);

    const tickLower = -887220;
    const tickUpper = 887220;

    const params = {
        token0: USDC_ADDRESS,
        token1: WETH_ADDRESS,
        fee: 3000,
        tickLower,
        tickUpper,
        amount0Desired: usdcAmount,
        amount1Desired: wethAmount,
        amount0Min: 0,
        amount1Min: 0,
        recipient: deployer.address,
        deadline: Math.floor(Date.now() / 1000) + 600
    };

    console.log("Adding liquidity to Uniswap V3 pool...");
    const tx = await positionManager.mint(params);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    if (!receipt) throw new Error("No receipt");
    console.log("Transaction confirmed");

    const transferEvent = (receipt as ContractReceipt).events?.find(
        (event: ContractEvent) => event.event === 'Transfer'
    );
    if (!transferEvent || !transferEvent.args) throw new Error("No Transfer event");
    const tokenId = transferEvent.args.tokenId;

    const position = await positionManager.positions(tokenId);
    
    console.log("\nPosition Details:");
    console.log("Token ID:", tokenId.toString());
    console.log("Liquidity:", position[7].toString());
    console.log("Token0:", position[2]);
    console.log("Token1:", position[3]);
    console.log("Fee Tier:", position[4]);
    console.log("Tick Lower:", position[5]);
    console.log("Tick Upper:", position[6]);

    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [WHALE_ADDRESS],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });