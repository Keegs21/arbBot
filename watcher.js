require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const { performance } = require('perf_hooks');

const FlashswapApi = require('./abis/index').flashswapv2;
const BlockSubscriber = require('./src/block_subscriber');
const Prices = require('./src/prices');

const FLASHSWAP_CONTRACT = process.env.CONTRACT;

const TransactionSender = require('./src/transaction_send');

const fs = require('fs');
const util = require('util');
var log_file = fs.createWriteStream(__dirname + '/log_arbitrage.txt', { flags: 'w' });
var log_stdout = process.stdout;
console.log = function (d) {
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.WSS_BLOCKS, {
        reconnect: {
            auto: true,
            delay: 5000, // ms
            maxAttempts: 15,
            onTimeout: false
        }
    })
);

const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

const prices = {};
const flashswap = new web3.eth.Contract(FlashswapApi, FLASHSWAP_CONTRACT);

const pairs = require('./src/pairs').getPairs();

const init = async () => {
    console.log('starting: ', JSON.stringify(pairs.map(p => p.name)));

    const transactionSender = TransactionSender.factory(process.env.WSS_BLOCKS.split(','));

    let nonce = await web3.eth.getTransactionCount(admin, 'pending');
    let gasPrice = await web3.eth.getGasPrice();

    setInterval(async () => {
        nonce = await web3.eth.getTransactionCount(admin, 'pending');
    }, 1000 * 19);

    setInterval(async () => {
        gasPrice = await web3.eth.getGasPrice();
    }, 1000 * 60 * 3);

    const owner = await flashswap.methods.owner().call();

    console.log(`started: wallet ${admin} - gasPrice ${gasPrice} - contract owner: ${owner}`);

    let handler = async () => {
        const myPrices = await Prices.getPrices();
        if (Object.keys(myPrices).length > 0) {
            for (const [key, value] of Object.entries(myPrices)) {
                prices[key.toLowerCase()] = value;
            }
        }
    };

    await handler();
    setInterval(handler, 1000 * 60 * 5);

    const onBlock = async (block, web3Instance, provider) => {
        const start = performance.now();

        const calls = [];

        const flashswapInstance = new web3Instance.eth.Contract(FlashswapApi, FLASHSWAP_CONTRACT);

        pairs.forEach((pair) => {
            calls.push(async () => {
                // Convert amountTokenPay to correct decimals
                const amountTokenPay = new BigNumber(pair.amountTokenPay).multipliedBy(new BigNumber(10).pow(pair.decimalsTokenBorrow));

                // Adjusted check function call with additional parameters
                const check = await flashswapInstance.methods.check(
                    pair.tokenBorrow,
                    amountTokenPay.toFixed(),
                    pair.tokenPay,
                    pair.sourceRouter,
                    pair.targetRouter,
                    pair.stable,
                    pair.isFlashOnSource
                ).call();

                const profit = new BigNumber(check[0]);
                const amountOut = new BigNumber(check[1]);

                let s = pair.tokenPay.toLowerCase();
                const price = prices[s];
                if (!price) {
                    console.log('invalid price', pair.tokenPay);
                    return;
                }

                // Adjust for token decimals
                const profitTokenPayUnits = profit.dividedBy(new BigNumber(10).pow(pair.decimalsTokenPay));
                const profitUsd = profitTokenPayUnits.multipliedBy(price);
                const percentage = profitTokenPayUnits.dividedBy(pair.amountTokenPay).multipliedBy(100);

                console.log(`[${block.number}] [${new Date().toLocaleString()}]: [${provider}] [${pair.name}] Arbitrage checked! Expected profit: ${profitTokenPayUnits.toFixed(6)} $${profitUsd.toFixed(2)} - ${percentage.toFixed(2)}%`);

                if (profit.isGreaterThan(0)) {
                    console.log(`[${block.number}] [${new Date().toLocaleString()}]: [${provider}] [${pair.name}] Arbitrage opportunity found! Expected profit: ${profitTokenPayUnits.toFixed(6)} $${profitUsd.toFixed(2)} - ${percentage.toFixed(2)}%`);

                    // Adjusted start function call with additional parameters
                    const tx = flashswapInstance.methods.start(
                        block.number + 2,
                        pair.tokenBorrow,
                        amountTokenPay.toFixed(),
                        pair.tokenPay,
                        pair.sourceRouter,
                        pair.targetRouter,
                        pair.sourceFactory,
                        pair.stable,
                        pair.isFlashOnSource,
                        pair.isVelodrome
                    );

                    let estimateGas;
                    try {
                        estimateGas = await tx.estimateGas({ from: admin });
                    } catch (e) {
                        console.log(`[${block.number}] [${new Date().toLocaleString()}]: [${pair.name}]`, 'gasCost error', e.message);
                        return;
                    }

                    const myGasPrice = new BigNumber(gasPrice).plus(new BigNumber(gasPrice).multipliedBy(0.2212)).toFixed(0);
                    const txCostWei = new BigNumber(estimateGas).multipliedBy(myGasPrice);

                    // Convert gas cost to USD
                    const gasCostEth = txCostWei.dividedBy(new BigNumber(10).pow(18));
                    const gasCostUsd = gasCostEth.multipliedBy(prices[WETH_MAINNET.toLowerCase()]);
                    const profitMinusFeeInUsd = profitUsd.minus(gasCostUsd);

                    if (profitMinusFeeInUsd.isLessThan(0.6)) {
                        console.log(`[${block.number}] [${new Date().toLocaleString()}] [${provider}]: [${pair.name}] stopped: `, JSON.stringify({
                            profit: "$" + profitMinusFeeInUsd.toFixed(2),
                            profitWithoutGasCost: "$" + profitUsd.toFixed(2),
                            gasCost: "$" + gasCostUsd.toFixed(2),
                            duration: `${(performance.now() - start).toFixed(2)} ms`,
                            provider: provider,
                            myGasPrice: myGasPrice.toString(),
                            txCostETH: gasCostEth.toFixed(6),
                            estimateGas: estimateGas,
                        }));
                        return;
                    }

                    if (profitMinusFeeInUsd.isGreaterThan(0.6)) {
                        console.log(`[${block.number}] [${new Date().toLocaleString()}] [${provider}]: [${pair.name}] proceeding with transaction: `, JSON.stringify({
                            profit: "$" + profitMinusFeeInUsd.toFixed(2),
                            profitWithoutGasCost: "$" + profitUsd.toFixed(2),
                            gasCost: "$" + gasCostUsd.toFixed(2),
                            duration: `${(performance.now() - start).toFixed(2)} ms`,
                            provider: provider,
                        }));

                        const data = tx.encodeABI();
                        const txData = {
                            from: admin,
                            to: flashswapInstance.options.address,
                            data: data,
                            gas: estimateGas,
                            gasPrice: myGasPrice,
                            nonce: nonce
                        };

                        let number = performance.now() - start;
                        if (number > 1500) {
                            console.error('out of time window: ', number);
                            return;
                        }

                        console.log(`[${block.number}] [${new Date().toLocaleString()}] [${provider}]: sending transaction...`, JSON.stringify(txData));

                        try {
                            await transactionSender.sendTransaction(txData);
                        } catch (e) {
                            console.error('transaction error', e);
                        }
                    }
                }
            });
        });

        try {
            await Promise.all(calls.map(fn => fn()));
        } catch (e) {
            console.log('error', e);
        }

        let number = performance.now() - start;
        if (number > 1500) {
            console.error('warning too slow', number);
        }

        if (block.number % 40 === 0) {
            console.log(`[${block.number}] [${new Date().toLocaleString()}]: alive (${provider}) - took ${number.toFixed(2)} ms`);
        }
    };

    BlockSubscriber.subscribe(process.env.WSS_BLOCKS.split(','), onBlock);
};

init();
