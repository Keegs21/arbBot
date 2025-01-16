//prices.js
const request = require("async-request");

module.exports.getPrices = async () => {
    const response = await request('https://api.coingecko.com/api/v3/simple/price?ids=arcana-2,real-us-t-bill,pearl,uk-real-estate,usd-coin&vs_currencies=usd');

    const prices = {};

    try {
        const json = JSON.parse(response.body);
        prices['0x835d3E1C0aA079C6164AAd21DCb23E60eb71AF48'.toLowerCase()] = json['uk-real-estate'].usd;
        prices['0xCE1581d7b4bA40176f0e219b2CaC30088Ad50C7A'.toLowerCase()] = json['pearl'].usd;
        prices['0xc518A88c67CECA8B3f24c4562CB71deeB2AF86B7'.toLowerCase()] = json['usd-coin'].usd; // USDC
        prices['0xAEC9e50e3397f9ddC635C6c429C8C7eca418a143'.toLowerCase()] = json['arcana-2'].usd;
        prices['0x83feDBc0B85c6e29B589aA6BdefB1Cc581935ECD'.toLowerCase()] = json['real-us-t-bill'].usd; // USDT
        // prices['??'.toLowerCase()] = json['usd-coin'].usd;
    } catch (e) {
        console.error(e)
        return {};
    }

    return prices;
}
