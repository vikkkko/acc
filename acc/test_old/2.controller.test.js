const { expectRevert, time } = require('@openzeppelin/test-helpers');

const utils = require('./utils.js')

const toWei = web3.utils.toWei

contract('ControllerG4', (accounts) => {
    beforeEach(async () => {
        const artifacts = await utils.getArtifacts("main_fork");
        Object.assign(this, artifacts);
    });

    it('should be Comptroller', async () => {
        let ifIs = await this.controller.isComptroller();
        console.log('is comptroller ? '+ ifIs)
        assert.equal(true, ifIs)
    });

    
    it('should be transfer comp to controller successfully', async () => {
        let compBalance = await this.comp.balanceOf.call(this.controller.address);
        if (compBalance.toString() != "0") {
            return
        }
        // transfer 2 million to controller to distribute
        let controllerComp = toWei('2000000', 'ether')
        await this.comp.transfer(this.controller.address, controllerComp, {from: accounts[0]})
        compBalance = await this.comp.balanceOf.call(this.controller.address);
        console.log('controller comp balance is ', compBalance.toString())
        assert.equal(compBalance, controllerComp)
    });    
    
    it('should _setPriceOracle successfully', async() => {
        await this.controller._setPriceOracle(this.oracle.address)
        let storedOralce = await this.controller.oracle();
        assert.equal(storedOralce, this.oracle.address);
    })

    it('should _setCompAddress successfully', async() => {
        let compAddr = await this.controller.getCompAddress();
        if (compAddr != this.comp.address) {
            await this.controller._setCompAddress(this.comp.address);
            compAddr = await this.controller.getCompAddress();
        }
        assert.equal(compAddr, this.comp.address);
    });

    it('should _setCloseFactor successfully', async() => {
        await this.controller._setCloseFactor(toWei('0.5', 'ether'))
        let factor = await this.controller.closeFactorMantissa();
        assert.equal(factor, toWei('0.5', 'ether'));
    });

    it('should _supportMarket successfully', async() => {
        await this.controller._setMaxAssets('10')

        await this.controller._supportMarket(this.cusdt.address)
        await this.controller._supportMarket(this.ceth.address)
        await this.controller._supportMarket(this.cs_weth_usdt.address)
        await this.controller._supportMarket(this.cc_renbtc_wbtc.address)
    });

    it('should _setCollateralFactor successfully', async() => {
        await this.controller._setCollateralFactor(this.cusdt.address, toWei('0.9', 'ether'))
        await this.controller._setCollateralFactor(this.ceth.address, toWei('0.8', 'ether'))
        await this.controller._setCollateralFactor(this.cs_weth_usdt.address, toWei('0.85', 'ether'))
        await this.controller._setCollateralFactor(this.cc_renbtc_wbtc.address, toWei('0.85', 'ether'))

        {
            let cusdtMarket = await this.controller.markets(this.cusdt.address);
            assert.equal(cusdtMarket.isListed, true)
            assert.equal(cusdtMarket.collateralFactorMantissa, toWei('0.9', 'ether'))
            assert.equal(cusdtMarket.isComped, false)
        }
    });
    
    // enable comp distribution
    it('should _addCompMarkets successfully', async() => {
        let toBeAdded = [
            this.cusdt.address, 
            this.ceth.address, 
            this.cs_weth_usdt.address, 
            this.cc_renbtc_wbtc.address
        ];

        for (i = 0; i < toBeAdded.length; i++) {
            let market = await this.controller.markets(this.cusdt.address);
            if (market.isComped) {
                continue
            }
            await this.controller._addCompMarkets([toBeAdded[i]], {from: accounts[0]})
            {
                market = await this.controller.markets(this.cusdt.address);
                assert.equal(market.isComped, true)
            }
        }
    });
    // TODO: set comp distribution rate
    it('should _addCompMarkets successfully', async() => {
        let compRate = await this.controller.compRate.call();
        if (compRate.toString() == "0") {
            await this.controller._setCompRate(toWei('10', 'ether'), {from: accounts[0]})
        }
        console.log("compRate: ", (await this.controller.compRate.call()).toString())
        
    });
    

    it('should _setBorrowPaused(sushiLp, curveLp) successfully', async() => {
        await this.controller._setBorrowPaused(this.cc_renbtc_wbtc.address, true)
        {
            let paused = await this.controller.borrowGuardianPaused.call(this.cc_renbtc_wbtc.address);
            assert.equal(paused, true)
        }
    });


});