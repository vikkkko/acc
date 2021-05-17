const ChainlinkPriceOracleProxy = artifacts.require("ChainlinkPriceOracleProxy")
const Unitroller = artifacts.require("Unitroller")
const ComptrollerG4 = artifacts.require("ComptrollerG4")
const CErc20 = artifacts.require("CErc20")
const CEther = artifacts.require("CEther")
const CErc20Delegate = artifacts.require("CErc20Delegate")
const CErc20Delegator = artifacts.require("CErc20Delegator")
const EIP20Interface = artifacts.require("EIP20Interface")
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair")
const IWETH = artifacts.require("IWETH")
const Comp = artifacts.require("Comp")
const IUniswapV2Router02 = artifacts.require("IUniswapV2Router02")
const JumpRateModelV2 = artifacts.require("JumpRateModelV2")


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
            usdt, cusdt, usdt_interest_model,
            weth, ceth,
            s_weth_usdt, cs_weth_usdt,
            c_renbtc_wbtc, cc_renbtc_wbtc
        ] = await Promise.all([
            IUniswapV2Router02.at(dconfig[dnetwork].sushi_router),
            
            ChainlinkPriceOracleProxy.at(config[network].oracle),
            ComptrollerG4.at(config[network].unitroller),
            Comp.at(config[network].comp),

            EIP20Interface.at(dconfig[dnetwork].usdt),
            CErc20Delegator.at(config[network].cerc20_delegator_usdt),
            JumpRateModelV2.at(config[network].usdt_interest_rate_model.address),

            IWETH.at(dconfig[dnetwork].weth),
            CEther.at(config[network].cether),

            IUniswapV2Pair.at(dconfig[dnetwork].sushi_weth_usdt_pair),
            CErc20Delegator.at(config[network].cerc20_delegator_sushi_weth_usdt),

            EIP20Interface.at(dconfig[dnetwork].curve_renbtc_wbtc_token),
            CErc20Delegator.at(config[network].cerc20_delegator_curve_renbtc_wbtc)

        ]);
        res = {
            dconfig,
            config,
            network,
            dnetwork,
            sushi_router,

            oracle, controller, comp, 

            usdt, cusdt, usdt_interest_model,

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
    console.log("account: ", account);
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