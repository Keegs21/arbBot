// SPDX-License-Identifier: MIT
pragma solidity >=0.6.2;

interface IAlgebraRouter {
    struct Route {
        address from;
        address to;
        uint24 fee;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);

    function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn);

    // Additional methods as needed
}
