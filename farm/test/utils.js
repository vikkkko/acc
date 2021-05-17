const StrategyController = artifacts.require("StrategyController")
const Vault = artifacts.require("Vault")
const UsdtVault = artifacts.require("Vault")
const WethVault = artifacts.require("Vault")
const SushiWethUsdtVault = artifacts.require("Vault")
const CurveRenbtcWbtcVault = artifacts.require("Vault")
const StrategyCompoundV1 = artifacts.require("StrategyCompoundV1")
const StrategyUsdt = artifacts.require("StrategyCompoundV1")
const StrategySushi = artifacts.require("StrategySushi")
const StrategySushiWethUsdt = artifacts.require("StrategySushi")


const utils = require('../migrations/utils');
const { time } = require('@openzeppelin/test-helpers');

async function getArtifacts(network) {
    const dconfig = utils.getConfigContractAddresses();
    let dnetwork;
    if (network == "main_fork") {
        dnetwork = "mainnet"
        const config = utils.getContractAddresses();

        const [
            sushi_router,

            oracle, controller, comp, 
            usdt, cusdt,
            weth, ceth,
            s_weth_usdt, cs_weth_usdt,
            c_renbtc_wbtc, cc_renbtc_wbtc
        ] = await Promise.all([
            IUniswapV2Router02.at(dconfig[dnetwork].sushi_router),
            
            ChainlinkPriceOracleProxy.at(config[network].oracle),
            ComptrollerG4.at(config[network].unitroller),
            Comp.at(config[network].comp),
            
            EIP20Interface.at(dconfig[dnetwork].usdt),
            CErc20Delegate.at(config[network].cerc20_delegator_usdt),

            IWETH.at(dconfig[dnetwork].weth),
            CEther.at(config[network].cether),

            IUniswapV2Pair.at(dconfig[dnetwork].sushi_weth_usdt_pair),
            CErc20Delegate.at(config[network].cerc20_delegator_sushi_weth_usdt),

            EIP20Interface.at(dconfig[dnetwork].curve_renbtc_wbtc_token),
            CErc20Delegate.at(config[network].cerc20_delegator_curve_renbtc_wbtc)

        ]);
        res = {
            dconfig,
            config,
            network,
            dnetwork,
            sushi_router,

            oracle, controller, comp, 

            usdt, cusdt,

            weth, ceth,

            s_weth_usdt,
            cs_weth_usdt,

            c_renbtc_wbtc, cc_renbtc_wbtc

        }

        return res;
    }
    

}



async function swapEthTo(T, to, amount, account) {
    
    let weth = T.weth;
    let sushi_router = T.sushi_router;
    console.log("sushi_router ", sushi_router.address)
    await weth.deposit({from: account, value: amount})

    await weth.approve(sushi_router.address, amount, {from: account});
    let amountOut = await sushi_router.getAmountsOut(amount, [weth.address, to]);
    let deadline = (await time.latest()).add(time.duration.days(1));
    await sushi_router.swapTokensForExactTokens(amountOut[1], amount, [weth.address, to], account, deadline, {from: account});
    let tt = await IWETH.at(to);
    console.log("to token name", await tt.name());
    console.log("to acct  bala:", (await tt.balanceOf.call(account)).toString())
}

module.exports = {
    getArtifacts,
    swapEthTo
}