// pairs.js

const velo = {
    router: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858", // Velo router on Mode
    factory: "0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a" // Velo factory on Mode
};

const kim = {
    router: "0x5D61c537393cf21893BE619E36fC94cd73C77DD3", // Kim router on Mode
    factory: "0xc02155946dd8C89D3D3238A6c8A64D04E2CD4500" // Kim factory on Mode
};

module.exports.getPairs = () => {
    const USDC_MAINNET = '0xd988097fb8612cc24eeC14542bC03424c656005f'; // USDC on Mode
    const WETH_MAINNET = '0x4200000000000000000000000000000000000006'; // WETH on Mode
    const USDT_MAINNET = '0xf0F161fDA2712DB8b566946122a5af183995e2eD'; // USDT on Mode

    const pairs = [
        // Arbitrage between WETH/USDC on Velodrome and WETH/USDT on Kim

        {
            name: 'WETH/USDC on Velo > WETH/USDT on Kim',
            tokenBorrow: WETH_MAINNET, // WETH
            amountTokenPay: 0.1, // Amount of WETH to borrow (in ETH units)
            tokenPay: USDC_MAINNET, // USDC
            sourceRouter: velo.router,
            targetRouter: kim.router,
            sourceFactory: velo.factory,
            stable: true, // Velodrome stable pool
            isVelodrome: false, // Source is Velodrome
            isFlashOnSource: true, // Flash swap on source router
            decimalsTokenBorrow: 18, // WETH decimals
            decimalsTokenPay: 6, // USDC decimals
        },
        {
            name: 'WETH/USDT on Kim > WETH/USDC on Velo',
            tokenBorrow: WETH_MAINNET, // WETH
            amountTokenPay: 0.1, // Amount of WETH to borrow (in ETH units)
            tokenPay: USDT_MAINNET, // USDT
            sourceRouter: kim.router,
            targetRouter: velo.router,
            sourceFactory: kim.factory,
            stable: false, // Assuming Velodrome uses stable pool
            isVelodrome: false, // Source is Uniswap V2 (Kim)
            isFlashOnSource: true, // Flash swap on source router
            decimalsTokenBorrow: 18, // WETH decimals
            decimalsTokenPay: 6, // USDT decimals
        },
    ];

    return pairs;
};
