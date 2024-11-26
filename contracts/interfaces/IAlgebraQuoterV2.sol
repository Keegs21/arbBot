// SPDX-License-Identifier: MIT
pragma solidity >=0.6.2;

interface IAlgebraQuoterV2 {
    struct Route {
        address from;
        address to;
        uint24 fee;
    }

    function quoteExactInput(bytes calldata path, uint256 amountIn)
        external
        returns (uint256 amountOut, uint160[] memory, uint32[] memory);

    function quoteExactOutput(bytes calldata path, uint256 amountOut)
        external
        returns (uint256 amountIn, uint160[] memory, uint32[] memory);

    // Additional methods as needed
}
