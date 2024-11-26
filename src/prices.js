const request = require("async-request");

module.exports.getPrices = async () => {
    const response = await request('https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2,ethereum,bitcoin,tether,usd-coin,busd&vs_currencies=usd');

    const prices = {};

    try {
        const json = JSON.parse(response.body);
        prices['0xd988097fb8612cc24eeC14542bC03424c656005f'.toLowerCase()] = json['usd-coin'].usd; // USDC
        prices['0x4200000000000000000000000000000000000006'.toLowerCase()] = json.ethereum.usd;
        prices['0xf0F161fDA2712DB8b566946122a5af183995e2eD'.toLowerCase()] = json.tether.usd; // USDT
        // prices['??'.toLowerCase()] = json['usd-coin'].usd;
    } catch (e) {
        console.error(e)
        return {};
    }

    return prices;
}
