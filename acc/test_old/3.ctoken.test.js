const { expectRevert, time } = require('@openzeppelin/test-helpers');
const EIP20Interface = artifacts.require("EIP20Interface")
const CErc20Delegate = artifacts.require("CErc20Delegate")

const utils = require('./utils.js')

const toWei = web3.utils.toWei

contract('CToken', (accounts) => {
    beforeEach(async () => {
        const artifacts = await utils.getArtifacts("main_fork");
        Object.assign(this, artifacts);
        console.log("usdt.address = ", this.usdt.address)
        console.log("cusdt.address = ", this.cusdt.address)
    });

    it('should be CToken', async () => {
        let ifIs = await this.cusdt.isCToken();
        console.log('is ctoken ? '+ ifIs)
        assert.equal(true, ifIs)
    });

    it('should be normal erc20', async() => {
        console.log('usdt.address ', this.usdt.address)
        console.log('this.controller.address ', this.controller.address)
        console.log('this.usdt_interest_model.address ', this.usdt_interest_model.address)

        {
            let name = await this.cusdt.name.call();
            console.log("name: ", name);
            
            let symbol = await this.cusdt.symbol.call();
            console.log("symbol: ", symbol.toString())

            let decimals = await this.cusdt.decimals.call();
            console.log("decimals: ", decimals.toString())

            let supply = await this.cusdt.totalSupply.call();
            console.log("total supply: ", supply.toString());

            // let bal1 = await this.cudt.balanceOf(accounts[1]);
            // console.log('before transfer, bal: ', bal1.toString())
            // await this.cusdt
        }
    })

    it('should have empty farm coin info', async () => {
        let farmCoin = await this.controller.getFarmCoin(this.cusdt.address);
        console.log("farmCoin.coinBase: ", farmCoin.coinBase.toString())
        console.log("farmCoin.farmRatio: ", farmCoin.farmRatio.toString())
        console.log("farmCoin.vault: ", farmCoin.vault)
    });
    it('check env before supply', async () => {
        let ifMintPaused = await this.controller.mintGuardianPaused(this.cusdt.address);
        console.log("ifMintPaused: ", ifMintPaused)
        let market = await this.controller.markets(this.cusdt.address)
        console.log("isListed: ", market.isListed)
        console.log("isComped: ", market.isComped)
        let exchangeRateStored = await this.cusdt.exchangeRateStored();
        console.log("exchangeRateStored: ", exchangeRateStored.toString())
        let compAddr = await this.controller.getCompAddress();
        console.log("comp address: ", compAddr)
    });

    // it('should supply usdt successfully', async() => {
    //     let usdtBalance = await this.usdt.balanceOf(accounts[0]);
    //     console.log("usdt balance = ", usdtBalance.toString());
    //     if (usdtBalance.toString() == "0") {
    //         await utils.swapEthTo(this, this.dconfig[this.dnetwork].usdt, toWei('0.1', 'ether'), accounts[0]);
    //     }
        
    //     usdtBalance = await this.usdt.balanceOf(accounts[0]);
    //     console.log("usdt balance = ", usdtBalance.toString());
    //     await this.usdt.approve(this.cusdt.address, '0');
    //     await this.usdt.approve(this.cusdt.address, usdtBalance);

    //     await this.cusdt.mint(usdtBalance, {from: accounts[0]});
    //     let cusdtBalance = await this.cusdt.balanceOf(accounts[0]);
    //     console.log("cusdt balance = ", cusdtBalance.toString());

    // });

    // it('should redeem usdt successfully', async() => {
    //     let cusdtBalance = await this.cusdt.balanceOf(accounts[0]);
    //     console.log("cusdt balance: ", cusdtBalance.toString());
    //     console.log(" usdt balance: ", (await this.usdt.balanceOf(accounts[0])).toString())
    //     if (cusdtBalance.toString() == "0") {
    //         console.log('redeem: zero cusdt balance')
    //         return
    //     }

    //     await this.cusdt.redeem(cusdtBalance, {from: accounts[0]});
    //     cusdtBalance = await this.cusdt.balanceOf(accounts[0]);
    //     console.log("cusdt balance: ", cusdtBalance.toString());
    //     console.log(" usdt balance: ", (await this.usdt.balanceOf(accounts[0])).toString())

    // });

    it('should claimComp successfully', async() => {
        // check controller comp balance and compRate
        // await this.controller._setCompRate(toWei('10000', 'ether'), {from: accounts[0]})
        console.log("controller comp balance: ", (await this.comp.balanceOf(this.controller.address)).toString())
        console.log("compRate: ", (await this.controller.compRate.call()).toString())
        console.log("cusdt compSpeeds: ", (await this.controller.compSpeeds(this.cusdt.address)).toString())
        // check usdt price in oracle
        let usdtPrice = await this.oracle.getUnderlyingPrice(this.cusdt.address);
        console.log("usdt price: ", usdtPrice.toString())

        // transfer usdt to user
        let user = accounts[1];
        console.log('user address: ', user)
        if ((await this.usdt.balanceOf(user)).toString() == "0")  {
            await this.usdt.transfer(user, (await this.usdt.balanceOf(accounts[0])), {from: accounts[0]})
        }
        
        // supply usdt
        let cusdtBalance = await this.cusdt.balanceOf(user);
        let usdtBalance = await this.usdt.balanceOf(user);
        console.log("user cusdt balance: ", cusdtBalance.toString());
        console.log(" user usdt balance: ", (await this.usdt.balanceOf(user)).toString())
        
        await this.usdt.approve(this.cusdt.address, '0', {from: user});
        await this.usdt.approve(this.cusdt.address, usdtBalance, {from: user});
        await this.cusdt.mint(usdtBalance, {from: user});
        
        console.log("user cusdt balance: ", (await this.cusdt.balanceOf(user)).toString());
        console.log(" user usdt balance: ", (await this.usdt.balanceOf(user)).toString())
        // wait some blocks
        let block2Wait = 100;
        for (i = 0; i < block2Wait; i++) {
            await time.advanceBlock();
        }
        
        
        // claim comp
        // check compSupplyState and other state
        let cusdtSupplyState = await this.controller.compSupplyState(this.cusdt.address);
        console.log("cusdtSupplyState.index: ", cusdtSupplyState.index.toString())
        console.log("cusdtSupplyState.block: ", cusdtSupplyState.block.toString())
        let cusdtSupplySpeed = await this.controller.compSpeeds(this.cusdt.address);
        console.log("cusdtSupplySpeed: ", cusdtSupplySpeed.toString())


        {
            console.log("user comp balance: ", (await this.comp.balanceOf(user)).toString())
            const {logs} = await this.controller.claimComp(user, [this.cusdt.address], {from: user})
            console.log("claimComp logs: ", JSON.stringify(logs))
            console.log("user comp balance: ", (await this.comp.balanceOf(user)).toString())
        }

    });

});