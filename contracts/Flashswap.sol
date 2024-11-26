// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.6.6 <0.9.0;
pragma abicoder v2;

import './interfaces/IUniswapV2Router.sol';
import './interfaces/IUniswapV2Pair.sol';
import './interfaces/IUniswapV2Factory.sol';

import './interfaces/IVelodromeRouter.sol';
import './interfaces/IVelodromeV2Pair.sol';
import './interfaces/IVelodromeV2Factory.sol';

import './interfaces/IERC20.sol';

contract Flashswap {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function start(
        uint256 _maxBlockNumber,
        address _tokenBorrow,
        uint256 _amountTokenPay,
        address _tokenPay,
        address _router1,
        address _router2,
        address _factory1,
        bool _stable, // For Velodrome pools (set to false for Uniswap V2)
        bool _flashOnRouter1 // true if flash swap on router1, false if on router2
    ) external {
        require(block.number <= _maxBlockNumber, 'e00');

        // Check for profit
        (int256 profit, uint256 _tokenBorrowAmount) = check(
            _tokenBorrow,
            _amountTokenPay,
            _tokenPay,
            _router1,
            _router2,
            _stable,
            _flashOnRouter1
        );
        require(profit > 0, 'e01');

        if (_flashOnRouter1) {
            initiateFlashSwapRouter1(_tokenBorrow, _tokenPay, _tokenBorrowAmount, _router1, _router2, _factory1, _stable, _flashOnRouter1);
        } else {
            initiateFlashSwapRouter2(_tokenBorrow, _tokenPay, _tokenBorrowAmount, _router1, _router2, _factory1, _stable, _flashOnRouter1);
        }
    }

    function initiateFlashSwapRouter1(
        address _tokenBorrow,
        address _tokenPay,
        uint256 _tokenBorrowAmount,
        address _router1,
        address _router2,
        address _factory1,
        bool _stable,
        bool _flashOnRouter1
    ) internal {
        if (_stable) {
            // Velodrome V2 flash swap
            address pairAddress = IVelodromeV2Factory(_factory1).getPair(_tokenBorrow, _tokenPay, _stable);
            require(pairAddress != address(0), 'e10');

            address token0 = IVelodromeV2Pair(pairAddress).token0();
            address token1 = IVelodromeV2Pair(pairAddress).token1();

            require(token0 != address(0) && token1 != address(0), 'e11');

            IVelodromeV2Pair(pairAddress).swap(
                _tokenBorrow == token0 ? _tokenBorrowAmount : 0,
                _tokenBorrow == token1 ? _tokenBorrowAmount : 0,
                address(this),
                abi.encode(_router1, _router2, _stable, _flashOnRouter1)
            );
        } else {
            // Uniswap V2 flash swap
            address pairAddress = IUniswapV2Factory(_factory1).getPair(_tokenBorrow, _tokenPay);
            require(pairAddress != address(0), 'e10');

            address token0 = IUniswapV2Pair(pairAddress).token0();
            address token1 = IUniswapV2Pair(pairAddress).token1();

            require(token0 != address(0) && token1 != address(0), 'e11');

            IUniswapV2Pair(pairAddress).swap(
                _tokenBorrow == token0 ? _tokenBorrowAmount : 0,
                _tokenBorrow == token1 ? _tokenBorrowAmount : 0,
                address(this),
                abi.encode(_router1, _router2, _stable, _flashOnRouter1)
            );
        }
    }

    function initiateFlashSwapRouter2(
        address _tokenBorrow,
        address _tokenPay,
        uint256 _tokenBorrowAmount,
        address _router1,
        address _router2,
        address _factory1,
        bool _stable,
        bool _flashOnRouter1
    ) internal {
        if (_stable) {
            // Velodrome V2 flash swap
            address pairAddress = IVelodromeV2Factory(_factory1).getPair(_tokenBorrow, _tokenPay, _stable);
            require(pairAddress != address(0), 'e10');

            address token0 = IVelodromeV2Pair(pairAddress).token0();
            address token1 = IVelodromeV2Pair(pairAddress).token1();

            require(token0 != address(0) && token1 != address(0), 'e11');

            IVelodromeV2Pair(pairAddress).swap(
                _tokenBorrow == token0 ? _tokenBorrowAmount : 0,
                _tokenBorrow == token1 ? _tokenBorrowAmount : 0,
                address(this),
                abi.encode(_router1, _router2, _stable, _flashOnRouter1)
            );
        } else {
            // Uniswap V2 flash swap
            address pairAddress = IUniswapV2Factory(_factory1).getPair(_tokenBorrow, _tokenPay);
            require(pairAddress != address(0), 'e10');

            address token0 = IUniswapV2Pair(pairAddress).token0();
            address token1 = IUniswapV2Pair(pairAddress).token1();

            require(token0 != address(0) && token1 != address(0), 'e11');

            IUniswapV2Pair(pairAddress).swap(
                _tokenBorrow == token0 ? _tokenBorrowAmount : 0,
                _tokenBorrow == token1 ? _tokenBorrowAmount : 0,
                address(this),
                abi.encode(_router1, _router2, _stable, _flashOnRouter1)
            );
        }
    }

    function check(
        address _tokenBorrow,
        uint256 _amountTokenPay,
        address _tokenPay,
        address _router1,
        address _router2,
        bool _stable,
        bool _flashOnRouter1
    ) public view returns (int256, uint256) {
        uint256 amountOut;
        uint256 amountRepay;

        if (_flashOnRouter1) {
            // Flash swap on router1, swap on router2
            if (_stable) {
                // Velodrome to Uniswap V2
                // Get amountOut from Velodrome
                IVelodromeRouter.Route[] memory routes1 = new IVelodromeRouter.Route[](1);
                routes1[0] = IVelodromeRouter.Route({
                    from: _tokenPay,
                    to: _tokenBorrow,
                    stable: _stable,
                    factory: address(0)
                });

                uint256[] memory amountsOut = IVelodromeRouter(_router1).getAmountsOut(_amountTokenPay, routes1);
                amountOut = amountsOut[amountsOut.length - 1];

                // Get amountRepay from Uniswap V2
                address[] memory path2 = new address[](2);
                path2[0] = _tokenBorrow;
                path2[1] = _tokenPay;

                uint256[] memory amountsRepay = IUniswapV2Router(_router2).getAmountsOut(amountOut, path2);
                amountRepay = amountsRepay[amountsRepay.length - 1];
            } else {
                // Uniswap V2 to Velodrome
                // Get amountOut from Uniswap V2
                address[] memory path1 = new address[](2);
                path1[0] = _tokenPay;
                path1[1] = _tokenBorrow;

                uint256[] memory amountsOut = IUniswapV2Router(_router1).getAmountsOut(_amountTokenPay, path1);
                amountOut = amountsOut[amountsOut.length - 1];

                // Get amountRepay from Velodrome
                IVelodromeRouter.Route[] memory routes2 = new IVelodromeRouter.Route[](1);
                routes2[0] = IVelodromeRouter.Route({
                    from: _tokenBorrow,
                    to: _tokenPay,
                    stable: _stable,
                    factory: address(0)
                });

                uint256[] memory amountsRepay = IVelodromeRouter(_router2).getAmountsOut(amountOut, routes2);
                amountRepay = amountsRepay[amountsRepay.length - 1];
            }
        } else {
            // Flash swap on router2, swap on router1
            if (_stable) {
                // Velodrome to Uniswap V2
                // Get amountOut from Velodrome
                IVelodromeRouter.Route[] memory routes1 = new IVelodromeRouter.Route[](1);
                routes1[0] = IVelodromeRouter.Route({
                    from: _tokenPay,
                    to: _tokenBorrow,
                    stable: _stable,
                    factory: address(0)
                });

                uint256[] memory amountsOut = IVelodromeRouter(_router2).getAmountsOut(_amountTokenPay, routes1);
                amountOut = amountsOut[amountsOut.length - 1];

                // Get amountRepay from Uniswap V2
                address[] memory path2 = new address[](2);
                path2[0] = _tokenBorrow;
                path2[1] = _tokenPay;

                uint256[] memory amountsRepay = IUniswapV2Router(_router1).getAmountsOut(amountOut, path2);
                amountRepay = amountsRepay[amountsRepay.length - 1];
            } else {
                // Uniswap V2 to Velodrome
                // Get amountOut from Uniswap V2
                address[] memory path1 = new address[](2);
                path1[0] = _tokenPay;
                path1[1] = _tokenBorrow;

                uint256[] memory amountsOut = IUniswapV2Router(_router2).getAmountsOut(_amountTokenPay, path1);
                amountOut = amountsOut[amountsOut.length - 1];

                // Get amountRepay from Velodrome
                IVelodromeRouter.Route[] memory routes2 = new IVelodromeRouter.Route[](1);
                routes2[0] = IVelodromeRouter.Route({
                    from: _tokenBorrow,
                    to: _tokenPay,
                    stable: _stable,
                    factory: address(0)
                });

                uint256[] memory amountsRepay = IVelodromeRouter(_router1).getAmountsOut(amountOut, routes2);
                amountRepay = amountsRepay[amountsRepay.length - 1];
            }
        }

        return (
            int256(amountRepay) - int256(_amountTokenPay), // profit
            amountOut // amount of _tokenBorrow obtained
        );
    }

    function execute(address /*_sender*/, uint256 _amount0, uint256 _amount1, bytes calldata _data) internal {
        uint256 amountBorrowed = _amount0 == 0 ? _amount1 : _amount0;

        address tokenBorrowed;
        address tokenOther;
        address router1;
        address router2;
        bool stable;
        bool flashOnRouter1;

        (router1, router2, stable, flashOnRouter1) = abi.decode(_data, (address, address, bool, bool));

        if (flashOnRouter1) {
            if (stable) {
                // Flash swap on Velodrome
                IVelodromeV2Pair pair = IVelodromeV2Pair(msg.sender);
                tokenBorrowed = _amount0 == 0 ? pair.token1() : pair.token0();
                tokenOther = _amount0 == 0 ? pair.token0() : pair.token1();
            } else {
                // Flash swap on Uniswap V2
                IUniswapV2Pair pair = IUniswapV2Pair(msg.sender);
                tokenBorrowed = _amount0 == 0 ? pair.token1() : pair.token0();
                tokenOther = _amount0 == 0 ? pair.token0() : pair.token1();
            }
        } else {
            if (stable) {
                // Flash swap on Velodrome
                IVelodromeV2Pair pair = IVelodromeV2Pair(msg.sender);
                tokenBorrowed = _amount0 == 0 ? pair.token1() : pair.token0();
                tokenOther = _amount0 == 0 ? pair.token0() : pair.token1();
            } else {
                // Flash swap on Uniswap V2
                IUniswapV2Pair pair = IUniswapV2Pair(msg.sender);
                tokenBorrowed = _amount0 == 0 ? pair.token1() : pair.token0();
                tokenOther = _amount0 == 0 ? pair.token0() : pair.token1();
            }
        }

        require(tokenBorrowed != address(0) && tokenOther != address(0), 'e16');

        require(router1 != address(0) && router2 != address(0), 'e12');

        // Approve router2 to spend tokenBorrowed
        IERC20(tokenBorrowed).approve(router2, amountBorrowed);

        uint256 amountReceived;

        if (flashOnRouter1) {
            // Swap on router2
            if (stable) {
                // Swap on Uniswap V2
                address[] memory path = new address[](2);
                path[0] = tokenBorrowed;
                path[1] = tokenOther;

                uint256[] memory amountsOut = IUniswapV2Router(router2).swapExactTokensForTokens(
                    amountBorrowed,
                    0, // amountOutMin
                    path,
                    address(this),
                    block.timestamp + 60
                );

                amountReceived = amountsOut[amountsOut.length - 1];
            } else {
                // Swap on Velodrome
                IVelodromeRouter.Route[] memory routes = new IVelodromeRouter.Route[](1);
                routes[0] = IVelodromeRouter.Route({
                    from: tokenBorrowed,
                    to: tokenOther,
                    stable: stable,
                    factory: address(0)
                });

                uint256[] memory amountsOut = IVelodromeRouter(router2).swapExactTokensForTokens(
                    amountBorrowed,
                    0, // amountOutMin
                    routes,
                    address(this),
                    block.timestamp + 60
                );

                amountReceived = amountsOut[amountsOut.length - 1];
            }
        } else {
            // Swap on router1
            if (stable) {
                // Swap on Uniswap V2
                address[] memory path = new address[](2);
                path[0] = tokenBorrowed;
                path[1] = tokenOther;

                uint256[] memory amountsOut = IUniswapV2Router(router1).swapExactTokensForTokens(
                    amountBorrowed,
                    0, // amountOutMin
                    path,
                    address(this),
                    block.timestamp + 60
                );

                amountReceived = amountsOut[amountsOut.length - 1];
            } else {
                // Swap on Velodrome
                IVelodromeRouter.Route[] memory routes = new IVelodromeRouter.Route[](1);
                routes[0] = IVelodromeRouter.Route({
                    from: tokenBorrowed,
                    to: tokenOther,
                    stable: stable,
                    factory: address(0)
                });

                uint256[] memory amountsOut = IVelodromeRouter(router1).swapExactTokensForTokens(
                    amountBorrowed,
                    0, // amountOutMin
                    routes,
                    address(this),
                    block.timestamp + 60
                );

                amountReceived = amountsOut[amountsOut.length - 1];
            }
        }

        // Calculate the amount required to repay the flash swap
        uint256 amountRequired;
        if (flashOnRouter1) {
            if (stable) {
                // Velodrome flash swap, need to repay amountBorrowed
                amountRequired = amountBorrowed;
            } else {
                // Uniswap V2 flash swap
                address[] memory path = new address[](2);
                path[0] = tokenOther;
                path[1] = tokenBorrowed;

                amountRequired = IUniswapV2Router(router1).getAmountsIn(amountBorrowed, path)[0];
            }
        } else {
            if (stable) {
                // Velodrome flash swap, need to repay amountBorrowed
                amountRequired = amountBorrowed;
            } else {
                // Uniswap V2 flash swap
                address[] memory path = new address[](2);
                path[0] = tokenOther;
                path[1] = tokenBorrowed;

                amountRequired = IUniswapV2Router(router2).getAmountsIn(amountBorrowed, path)[0];
            }
        }

        // Check for profit
        require(amountReceived > amountRequired, 'e13');

        // Repay the flash swap
        IERC20(tokenBorrowed).transfer(msg.sender, amountBorrowed);

        // Transfer profit to owner
        uint256 profit = amountReceived - amountRequired;
        IERC20(tokenOther).transfer(owner, profit);
    }

    // Callback function for Uniswap V2
    function uniswapV2Call(address _sender, uint256 _amount0, uint256 _amount1, bytes calldata _data) external {
        execute(_sender, _amount0, _amount1, _data);
    }

    // Callback function for Velodrome V2
    function hook(address _sender, uint256 _amount0, uint256 _amount1, bytes calldata _data) external {
        execute(_sender, _amount0, _amount1, _data);
    }
}
