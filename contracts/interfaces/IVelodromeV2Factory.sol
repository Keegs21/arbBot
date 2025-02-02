// SPDX-License-Identifier: MIT

pragma solidity >=0.5.0;

interface IVelodromeV2Factory {
    function getPair(address tokenA, address tokenB, bool stable) external view returns (address pair);
}
