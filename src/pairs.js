// pairs.js

const pearl = {
    router: "0xa1F56f72b0320179b01A947A5F78678E8F96F8EC", // Pearl router on re.al
    factory: "0xeF0b0a33815146b599A8D4d3215B18447F2A8101" // Pearl factory on Mode
};

module.exports.getPairs = () => {
    const USDC_REAL = '0xc518A88c67CECA8B3f24c4562CB71deeB2AF86B7'; // USDC on real
    const ARC_REAL = '0xAEC9e50e3397f9ddC635C6c429C8C7eca418a143'; // ARC on real
    const USTB_REAL = '0x83feDBc0B85c6e29B589aA6BdefB1Cc581935ECD'; // USTB on real
    const PEARL_REAL = '0xCE1581d7b4bA40176f0e219b2CaC30088Ad50C7A';
    const UKRE_REAL = '0x835d3E1C0aA079C6164AAd21DCb23E60eb71AF48';

    const pairs = [
        {
            name: 'ARC/USDC on Pearl > ARC/USTB on Pearl',
            pool0: '0x22aC4821bBb8d1AC42eA7F0f32ed415F52577Ca1', // **Replace with actual Uniswap V3 Pool Address for ARC/USDC on Pearl**
            fee1: 100, // 0.01% fee tier
            tokenIn: ARC_REAL, // ARC
            tokenOut: USTB_REAL, // USDC
            amountIn: '10000000000000000000000',
            decimalsTokenBorrow: 18, // ARC decimals
            decimalsTokenPay: 18, // USTB decimals
        },
        {
            name: 'ARC/USTB on Pearl > ARC/USDC on Pearl',
            pool0: '0xC6B3AaaAbf2f6eD6cF7fdFFfb0DaC45E10c4A5B3', // **Replace with actual Uniswap V3 Pool Address for ARC/USTB on Pearl**
            fee1: 100, // 0.01% fee tier
            tokenIn: ARC_REAL, // ARC
            tokenOut: USDC_REAL, // USTB
            amountIn: '10000000000000000000000', 
            decimalsTokenBorrow: 18, // ARC decimals
            decimalsTokenPay: 6, // USDC decimals
        },
        // {
        //     name: 'ARC/USDC on Pearl > ARC/UKRE on Pearl',
        //     pool0: '0x22aC4821bBb8d1AC42eA7F0f32ed415F52577Ca1', // **Replace with actual Uniswap V3 Pool Address for ARC/USDC on Pearl**
        //     fee1: 100, // 0.01% fee tier
        //     tokenIn: ARC_REAL, // ARC
        //     tokenOut: UKRE_REAL, // USDC
        //     amountIn: '10000000000000000000000',
        //     decimalsTokenBorrow: 18, // ARC decimals
        //     decimalsTokenPay: 18, // UKRE decimals
        // },
        // {
        //     name: 'ARC/UKRE on Pearl > ARC/USDC on Pearl',
        //     pool0: '0x72c20EBBffaE1fe4E9C759b326D97763E218F9F6', // **Replace with actual Uniswap V3 Pool Address for ARC/USDC on Pearl**
        //     fee1: 500, // 0.05% fee tier
        //     tokenIn: ARC_REAL, // ARC
        //     tokenOut: USDC_REAL, // USDC
        //     amountIn: '10000000000000000000000',
        //     decimalsTokenBorrow: 18, // ARC decimals
        //     decimalsTokenPay: 6, // UKRE decimals
        // },
        {
            name: 'Pearl/USDC on Pearl > PEARL/USTB on Pearl',
            pool0: '0x374a765309B6D5a123f32971dcA1E6CeF9fa0066', // **Replace with actual Uniswap V3 Pool Address **
            fee1: 10000, // 1% fee tier
            tokenIn: PEARL_REAL, // pearl
            tokenOut: USTB_REAL, // USDC
            amountIn: '10000000000000000000000',
            decimalsTokenBorrow: 18, // ARC decimals
            decimalsTokenPay: 18, // USTB decimals
        },
        {
            name: 'Pearl/USTB on Pearl > PEARL/USTB on Pearl',
            pool0: '0x35BA384F9D30D68028898849ddBf5bda09bbE7EA', // **Replace with actual Uniswap V3 Pool Address for **
            fee1: 10000, // 1% fee tier
            tokenIn: PEARL_REAL, // pearl
            tokenOut: USDC_REAL, // USTB
            amountIn: '10000000000000000000000', 
            decimalsTokenBorrow: 18, // ARC decimals
            decimalsTokenPay: 6, // USDC decimals
        },
    ];

    return pairs;
};