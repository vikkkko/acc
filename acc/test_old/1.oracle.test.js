const { expectRevert, time } = require('@openzeppelin/test-helpers');

const utils = require('./utils.js')

const toWei = web3.utils.toWei
const BN = web3.utils.BN
contract('ChainlinkPriceOracleProxy', (accounts) => {
    beforeEach(async () => {
        const artifacts = await utils.getArtifacts("main_fork");
        Object.assign(this, artifacts);
        this.admin = accounts[0];
    });

    it('should be PriceOracle', async () => {
        let ifIs = await this.oracle.isPriceOracle();
        console.log('is oracle ? '+ ifIs)
        assert.equal(true, ifIs)
        
        let ethUsdChainlink = await this.oracle.ethUsdChainlinkAggregatorAddress();
        assert.equal(ethUsdChainlink, this.dconfig[this.dnetwork].usd_per_eth);
    });

    it('should setTokenConfigs successfully', async() => {
        let cTokenAddress = [
            this.ceth.address, this.dconfig[this.dnetwork].weth,
            this.cusdt.address, this.dconfig[this.dnetwork].usdt,
            this.cs_weth_usdt.address,
            this.dconfig[this.dnetwork].wbtc, this.cc_renbtc_wbtc.address 
        ];
        let chainlinkAggregatorAddress = [
            this.dconfig[this.dnetwork].usd_per_eth, this.dconfig[this.dnetwork].usd_per_eth,
            this.dconfig[this.dnetwork].eth_per_usdt, this.dconfig[this.dnetwork].eth_per_usdt,
            this.s_weth_usdt.address,
            this.dconfig[this.dnetwork].usd_per_btc, this.dconfig[this.dnetwork].usd_per_btc
        ];
        // 0: Invalid, 1: USD, 2: ETH, 3: LP, 4: Curve LP
        let chainlinkPriceBase = [
            '1', '1', 
            '2', '2', 
            '3',
            '1', '4'
        ];
        let underlyingTokenDecimals = [
            '18', '18', 
            '6', '6', 
            '18',
            '8', '8'
        ];
        
        await this.oracle.setTokenConfigs(
            cTokenAddress,
            chainlinkAggregatorAddress,
            chainlinkPriceBase,
            underlyingTokenDecimals,
            {from: this.admin}
        );

        {
            let cusdtConfig = await this.oracle.tokenConfig(this.ceth.address);
            assert.equal(cusdtConfig[0], this.dconfig[this.dnetwork].usd_per_eth);
            assert.equal(cusdtConfig[1], '1');
            assert.equal(cusdtConfig[2], '18');

            let ethPriceInUsd = await this.oracle.getUnderlyingPrice(this.ceth.address);
            console.log('ethPriceInUsd = ', ethPriceInUsd.toString());

        }
        
        {
            let cusdtConfig = await this.oracle.tokenConfig(this.cusdt.address);
            assert.equal(cusdtConfig[0], this.dconfig[this.dnetwork].eth_per_usdt);
            assert.equal(cusdtConfig[1], '2');
            assert.equal(cusdtConfig[2], '6');

            let usdtPriceInUsd = await this.oracle.getUnderlyingPrice(this.cusdt.address);
            console.log('usdtPriceInUsd = ', usdtPriceInUsd.toString());

        }

        {
            let cConfig = await this.oracle.tokenConfig(this.cs_weth_usdt.address);
            assert.equal(cConfig[0], this.dconfig[this.dnetwork].sushi_weth_usdt_pair);
            assert.equal(cConfig[1], '3');
            assert.equal(cConfig[2], '18');

            // usage of lp price
            let wethUsdtLpPriceInUsd = await this.oracle.getUnderlyingPrice(this.cs_weth_usdt.address);
            console.log('sushiwethUsdtLpPriceInUsd = ', wethUsdtLpPriceInUsd.toString());
            let sushiLpSupply = await this.s_weth_usdt.totalSupply();
            let sushiLpTotalValueInUsd = wethUsdtLpPriceInUsd.mul(sushiLpSupply).div(new BN(toWei(toWei('1', 'ether'), 'ether')));
            console.log("sushiLpTotalValueInUsd = ", sushiLpTotalValueInUsd.toString())
        }


    });

    it('should setCurvePools successfully', async() => {
        let cTokenAddress = [
            this.cc_renbtc_wbtc.address
        ];

        let swapPools = [
            this.dconfig[this.dnetwork].curve_renbtc_wbtc_pool
        ];

        let poolTokens = [
            this.dconfig[this.dnetwork].curve_renbtc_wbtc_token
        ];
        
        let baseAssets = [
            this.dconfig[this.dnetwork].wbtc
        ]
        
        await this.oracle.setCurveConfigs(
            cTokenAddress,
            swapPools,
            poolTokens,
            baseAssets
        );

        {
            let cconfig = await this.oracle.curveConfig.call(this.cc_renbtc_wbtc.address);
            assert.equal(cconfig.swapPool, this.dconfig[this.dnetwork].curve_renbtc_wbtc_pool);

            let wbtcPriceInUsd = await this.oracle.getUnderlyingPrice(this.dconfig[this.dnetwork].wbtc);
            console.log('wbtcPriceInUsd = ', wbtcPriceInUsd.toString());
            
            // usage of lp price
            let curveRWbtcLpPriceInUsd = await this.oracle.getUnderlyingPrice(this.cc_renbtc_wbtc.address);
            console.log('curveRWbtcLpPriceInUsd = ', curveRWbtcLpPriceInUsd.toString());
            let lpSupply = await this.c_renbtc_wbtc.totalSupply();
            let curveRWbtcLpTotalValueInUsd = curveRWbtcLpPriceInUsd.mul(lpSupply).div(new BN(toWei(toWei('1', 'ether'), 'ether')));
            console.log("curveRWbtcLpTotalValueInUsd = ", curveRWbtcLpTotalValueInUsd.toString())

        }

    });


});