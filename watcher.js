require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const { performance } = require('perf_hooks');

const FlashswapApi = require('./abis/index').UniswapV3FlashSwap;
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
const flashswap = new web3.eth.Contract(FlashswapApi.abi, FLASHSWAP_CONTRACT);

const pairs = require('./src/pairs').getPairs();

const init = async () => {
    console.log('pairs:', JSON.stringify(pairs, null, 2));
    console.log('Starting with pairs:', JSON.stringify(pairs.map(p => p.name)));

    const transactionSender = TransactionSender.factory(process.env.WSS_BLOCKS.split(','));

    let nonce = await web3.eth.getTransactionCount(admin, 'pending');
    let gasPrice = await web3.eth.getGasPrice();

    setInterval(async () => {
        nonce = await web3.eth.getTransactionCount(admin, 'pending');
    }, 1000 * 19);

    setInterval(async () => {
        gasPrice = await web3.eth.getGasPrice();
    }, 1000 * 60 * 3);

    // Logging before calling owner()
    console.log('Fetching contract owner...');
    let owner;
    try {
        owner = await flashswap.methods.owner().call();
        console.log(`Contract owner: ${owner}`);
    } catch (e) {
        console.error('Error fetching contract owner:', e);
        return;
    }

    console.log(`Started: wallet ${admin} - gasPrice ${gasPrice} - contract owner: ${owner}`);

    let handler = async () => {
        console.log('Fetching prices...');
        try {
            const myPrices = await Prices.getPrices();
            console.log('Prices fetched:', myPrices);
            if (Object.keys(myPrices).length > 0) {
                for (const [key, value] of Object.entries(myPrices)) {
                    prices[key.toLowerCase()] = value;
                }
                console.log('Prices updated:', prices);
            } else {
                console.log('No prices fetched.');
            }
        } catch (e) {
            console.error('Error fetching prices:', e);
        }
    };

    await handler();
    setInterval(handler, 1000 * 60 * 5);

    const onBlock = async (block, web3Instance, provider) => {
        const start = performance.now();
        console.log(`New block received: ${block.number} from provider ${provider}`);

        const calls = [];

        const flashswapInstance = new web3Instance.eth.Contract(FlashswapApi.abi, FLASHSWAP_CONTRACT);

        pairs.forEach((pair) => {
            calls.push(async () => {
                console.log(`Processing pair: ${pair.name}`);
                try {
                    // Use amountIn directly since it's already in wei
                    const amountIn = new BigNumber(pair.amountIn);
                    console.log(`amountIn: ${amountIn.toFixed()}`);
        
                    // Call the check function on the contract
                    console.log('Calling check function on contract...');
                    let check;
                    try {
                        check = await flashswapInstance.methods.check(
                            pair.pool0,
                            pair.fee1,
                            pair.tokenIn,
                            pair.tokenOut,
                            pair.amountIn
                        ).call();
                    } catch (e) {
                        console.error(`Error calling check function for pair ${pair.name}:`, e);
                        return;
                    }
        
                    // Parse profit and amountOut, handling negative profits
                    const profit = new BigNumber(check[0]);
                    const amountOut = new BigNumber(check[1]);
        
                    console.log(`Profit: ${profit.toFixed()}, AmountOut: ${amountOut.toFixed()}`);
        
                    // Use tokenIn for price lookup since profit is in tokenIn units
                    let s = pair.tokenIn.toLowerCase();
                    const price = prices[s];
        
                    // Debugging statements
                    console.log(`Token In: ${pair.tokenIn}`);
                    console.log(`Token In (lowercase): ${s}`);
                    console.log(`Price fetched: ${price}`);
        
                    if (!price || isNaN(price)) {
                        console.log('Invalid price for token:', pair.tokenIn);
                        return;
                    }
        
                    // Ensure decimalsTokenBorrow is defined and a number
                    if (pair.decimalsTokenBorrow === undefined || isNaN(pair.decimalsTokenBorrow)) {
                        console.error(`Invalid decimalsTokenBorrow for pair ${pair.name}`);
                        return;
                    }
        
                    // Adjust for token decimals
                    console.log('Calculating profit in token units and USD...');
        
                    const decimalsTokenBorrow = new BigNumber(pair.decimalsTokenBorrow);
        
                    // Ensure decimalsTokenBorrow is an integer
                    if (!decimalsTokenBorrow.isInteger()) {
                        console.error(`decimalsTokenBorrow is not an integer for pair ${pair.name}`);
                        return;
                    }
        
                    const divisor = new BigNumber(10).pow(decimalsTokenBorrow);
        
                    const profitTokenUnits = profit.dividedBy(divisor);
                    const profitUsd = profitTokenUnits.multipliedBy(price);
                    const amountInUnits = amountIn.dividedBy(divisor);
                    const percentage = profitTokenUnits.dividedBy(amountInUnits).multipliedBy(100);
        
                    console.log(`Profit in token units: ${profitTokenUnits.toFixed(6)}, Profit in USD: $${profitUsd.toFixed(2)}, Percentage: ${percentage.toFixed(2)}%, amountInUnits: ${amountInUnits.toFixed(6)}`);
        
                    console.log(`[${block.number}] [${new Date().toLocaleString()}]: [${provider}] [${pair.name}] Arbitrage checked! Expected profit: ${profitTokenUnits.toFixed(6)} $${profitUsd.toFixed(2)} - ${percentage.toFixed(2)}%`);
        
                    // Proceed only if profit is greater than zero
                    if (profit.isGreaterThan(0)) {
                        console.log(`[${block.number}] [${new Date().toLocaleString()}]: [${provider}] [${pair.name}] Arbitrage opportunity found! Expected profit: ${profitTokenUnits.toFixed(6)} $${profitUsd.toFixed(2)} - ${percentage.toFixed(2)}%`);
        
                        // Prepare transaction
                        const tx = flashswapInstance.methods.flashSwap(
                            pair.pool0,
                            pair.fee1,
                            pair.tokenIn,
                            pair.tokenOut,
                            pair.amountIn
                        );
        
                        let estimateGas;
                        try {
                            console.log('Estimating gas...');
                            estimateGas = await tx.estimateGas({ from: admin });
                            console.log(`Estimated gas: ${estimateGas}`);
                        } catch (e) {
                            console.log(`[${block.number}] [${new Date().toLocaleString()}]: [${pair.name}] Gas estimation error:`, e.message);
                            return;
                        }
        
                        const myGasPrice = new BigNumber(gasPrice)
                            .plus(new BigNumber(gasPrice).multipliedBy(0.2212))
                            .toFixed(0);
                        const txCostWei = new BigNumber(estimateGas).multipliedBy(myGasPrice);
        
                        // Convert gas cost to USD
                        const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // Replace with the native token address
                        const gasPriceNative = prices[NATIVE_TOKEN_ADDRESS.toLowerCase()] || 0;
                        if (!gasPriceNative || isNaN(gasPriceNative)) {
                            console.log('Invalid price for native token');
                            return;
                        }
        
                        const gasCostNative = txCostWei.dividedBy(new BigNumber(10).pow(18));
                        const gasCostUsd = gasCostNative.multipliedBy(gasPriceNative);
                        const profitMinusFeeInUsd = profitUsd.minus(gasCostUsd);
        
                        if (profitMinusFeeInUsd.isLessThan(0.6)) {
                            console.log(
                                `[${block.number}] [${new Date().toLocaleString()}] [${provider}]: [${pair.name}] Stopped due to low profit after gas costs:`,
                                JSON.stringify({
                                    profit: "$" + profitMinusFeeInUsd.toFixed(2),
                                    profitWithoutGasCost: "$" + profitUsd.toFixed(2),
                                    gasCost: "$" + gasCostUsd.toFixed(2),
                                    duration: `${(performance.now() - start).toFixed(2)} ms`,
                                    provider: provider,
                                    myGasPrice: myGasPrice.toString(),
                                    txCostNative: gasCostNative.toFixed(6),
                                    estimateGas: estimateGas,
                                })
                            );
                            return;
                        }
        
                        if (profitMinusFeeInUsd.isGreaterThan(0.6)) {
                            console.log(
                                `[${block.number}] [${new Date().toLocaleString()}] [${provider}]: [${pair.name}] Proceeding with transaction:`,
                                JSON.stringify({
                                    profit: "$" + profitMinusFeeInUsd.toFixed(2),
                                    profitWithoutGasCost: "$" + profitUsd.toFixed(2),
                                    gasCost: "$" + gasCostUsd.toFixed(2),
                                    duration: `${(performance.now() - start).toFixed(2)} ms`,
                                    provider: provider,
                                })
                            );
        
                            const data = tx.encodeABI();
                            const txData = {
                                from: admin,
                                to: flashswapInstance.options.address,
                                data: data,
                                gas: estimateGas,
                                gasPrice: myGasPrice,
                                nonce: nonce,
                            };
        
                            let number = performance.now() - start;
                            if (number > 1500) {
                                console.error('Out of time window:', number);
                                return;
                            }
        
                            console.log(
                                `[${block.number}] [${new Date().toLocaleString()}] [${provider}]: Sending transaction...`,
                                JSON.stringify(txData)
                            );
        
                            try {
                                await transactionSender.sendTransaction(txData);
                                console.log('Transaction sent successfully.');
                            } catch (e) {
                                console.error('Transaction error:', e);
                            }
                        }
                    } else {
                        // Log when no arbitrage opportunity is found due to zero or negative profit
                        console.log(
                            `[${block.number}] [${new Date().toLocaleString()}]: [${provider}] [${pair.name}] No arbitrage opportunity. Profit is zero or negative.`
                        );
                    }
                } catch (e) {
                    console.error(`Error processing pair ${pair.name}:`, e);
                }
            });
        });                    

        try {
            console.log('Executing calls...');
            await Promise.all(calls.map(fn => fn()));
            console.log('Calls executed successfully.');
        } catch (e) {
            console.error('Error during calls execution:', e);
        }

        let number = performance.now() - start;
        if (number > 1500) {
            console.error('Warning: Processing took too long:', number);
        }

        if (block.number % 40 === 0) {
            console.log(`[${block.number}] [${new Date().toLocaleString()}]: Alive (${provider}) - Processing took ${number.toFixed(2)} ms`);
        }
    };

    console.log('Subscribing to new blocks...');
    try {
        BlockSubscriber.subscribe(process.env.WSS_BLOCKS.split(','), onBlock);
        console.log('Subscription successful.');
    } catch (e) {
        console.error('Error subscribing to blocks:', e);
    }
};

init().catch((e) => {
    console.error('Error during initialization:', e);
});
