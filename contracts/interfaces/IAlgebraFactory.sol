// SPDX-License-Identifier: MIT

pragma solidity >=0.5.0;

interface IAlgebraFactory {
    function poolByPair(address tokenA, address tokenB) external view returns (address pool);
    function computePoolAddress(address tokenA, address tokenB) external view returns (address pool);
    // Add other functions if needed
}
