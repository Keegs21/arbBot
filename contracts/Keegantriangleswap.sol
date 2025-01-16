// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import './interfaces/IERC20.sol';
import './interfaces/IUniswapV3Pool.sol';
import './interfaces/IUniswapV3Router02.sol';
import './interfaces/IQuoterV2.sol';

address constant SWAP_ROUTER_02 = 0xa1F56f72b0320179b01A947A5F78678E8F96F8EC;
address constant QUOTER_V2_ADDRESS = 0xDe43aBe37aB3b5202c22422795A527151d65Eb18;

contract KeeganSwap {
    ISwapRouter02 public immutable router;
    IQuoterV2 public immutable quoter;

    uint160 private constant MIN_SQRT_RATIO = 4295128739;
    uint160 private constant MAX_SQRT_RATIO =
        1461446703485210103287273052203988822378723970342;

    address public owner;

    constructor() {
        owner = msg.sender;
        router = ISwapRouter02(SWAP_ROUTER_02);
        quoter = IQuoterV2(QUOTER_V2_ADDRESS);
    }

    // DAI / WETH 0.3% swap fee (2000 DAI / WETH)
    // DAI / WETH 0.05% swap fee (2100 DAI / WETH)
    // 1. Flash swap on pool0 (receive WETH)
    // 2. Swap on pool1 (WETH -> DAI)
    // 3. Send DAI to pool0
    // profit = DAI received from pool1 - DAI repaid to pool0


    function check(
        address pool0,
        uint24 fee1,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public returns (int256 profit, uint256 buyBackAmount) {
        // Step 1: Simulate swap on source pool (pool0)
        IQuoterV2.QuoteExactInputSingleParams memory paramsSource = IQuoterV2
            .QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: fee1,
                sqrtPriceLimitX96: 0
            });

        // Call quoteExactInputSingle directly
        (
            uint256 amountOutSource,
            uint160 sqrtPriceX96AfterSource,
            uint32 initializedTicksCrossedSource,
            uint256 gasEstimateSource
        ) = quoter.quoteExactInputSingle(paramsSource);

        // Step 2: Simulate swap on target pool (pool1)
        // Assuming target pool has the same fee. Adjust if different.
        uint24 fee2 = fee1; // Replace with actual fee if different

        IQuoterV2.QuoteExactInputSingleParams memory paramsTarget = IQuoterV2
            .QuoteExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: tokenIn,
                amountIn: amountOutSource,
                fee: fee2,
                sqrtPriceLimitX96: 0
            });

        (
            uint256 amountOutTarget,
            uint160 sqrtPriceX96AfterTarget,
            uint32 initializedTicksCrossedTarget,
            uint256 gasEstimateTarget
        ) = quoter.quoteExactInputSingle(paramsTarget);

        // Step 3: Calculate profit (allow negative values)
        profit = int256(amountOutTarget) - int256(amountIn);
        buyBackAmount = amountOutSource;
    }


    function flashSwap(
        address pool0,
        uint24 fee1,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external {
        bool zeroForOne = tokenIn < tokenOut;
        // 0 -> 1 => sqrt price decrease
        // 1 -> 0 => sqrt price increase
        uint160 sqrtPriceLimitX96 =
            zeroForOne ? MIN_SQRT_RATIO + 1 : MAX_SQRT_RATIO - 1;

        bytes memory data = abi.encode(
            msg.sender, pool0, fee1, tokenIn, tokenOut, amountIn, zeroForOne
        );

        IUniswapV3Pool(pool0).swap({
            recipient: address(this),
            zeroForOne: zeroForOne,
            amountSpecified: int256(amountIn),
            sqrtPriceLimitX96: sqrtPriceLimitX96,
            data: data
        });
    }

    function _swap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin
    ) private returns (uint256 amountOut) {
        IERC20(tokenIn).approve(address(router), amountIn);

        ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02
            .ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: address(this),
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });

        amountOut = router.exactInputSingle(params);
    }

    function uniswapV3SwapCallback(
        int256 amount0,
        int256 amount1,
        bytes calldata data
    ) external {
        // Decode data
        (
            address caller,
            address pool0,
            uint24 fee1,
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            bool zeroForOne
        ) = abi.decode(
            data, (address, address, uint24, address, address, uint256, bool)
        );

        uint256 amountOut = zeroForOne ? uint256(-amount1) : uint256(-amount0);

        // pool0 -> tokenIn -> tokenOut (amountOut)
        // Swap on pool 1 (swap tokenOut -> tokenIn)
        uint256 buyBackAmount = _swap({
            tokenIn: tokenOut,
            tokenOut: tokenIn,
            fee: fee1,
            amountIn: amountOut,
            amountOutMin: amountIn
        });

        // Repay pool 0
        uint256 profit = buyBackAmount - amountIn;
        require(profit > 0, "profit = 0");

        IERC20(tokenIn).transfer(pool0, amountIn);
        IERC20(tokenIn).transfer(caller, profit);
    }
}



