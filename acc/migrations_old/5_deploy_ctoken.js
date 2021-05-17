const utils = require('./utils')
const Unitroller = artifacts.require("Unitroller")
const ComptrollerG4 = artifacts.require("ComptrollerG4")
const CErc20 = artifacts.require("CErc20")
const CEther = artifacts.require("CEther")
const CErc20Delegate = artifacts.require("CErc20Delegate")
const CErc20DelegatorUsdt = artifacts.require("CErc20Delegator")
const CErc20DelegatorWeth = artifacts.require("CErc20Delegator")
const CErc20DelegatorSushiWethUsdt = artifacts.require("CErc20Delegator")
const CErc20DelegatorCurveRenbtcWbtc = artifacts.require("CErc20Delegator")


CERC20_DELEGATE = "cerc20_delegate"
CERC20_DELEGATOR_USDT = "cerc20_delegator_usdt"
CETHER = "cether"
CERC20_DELEGATOR_WETH = "cerc20_delegator_weth"
CERC20_DELEGATOR_SUSHI_WETH_USDT = "cerc20_delegator_sushi_weth_usdt"
CERC20_DELEGATOR_CURVE_RENBTC_WBTC = "cerc20_delegator_curve_renbtc_wbtc"

const toWei = web3.utils.toWei


module.exports = async function (deployer, network, accounts) {
    console.log("5_deploy_ctoken.js, network: ", network)
    let deployedConfig = utils.getConfigContractAddresses();
    let config = utils.getContractAddresses();
    
    if (network == "main_fork") {
        // deploy CErc20Delegate
        let cerc20Admin = accounts[0];
        await deployer.deploy(CErc20Delegate, {from: cerc20Admin});
        config[network][CERC20_DELEGATE] = CErc20Delegate.address

        // deploy cusdt through CErc20Delegator
        await deployer.deploy(CErc20DelegatorUsdt, 
            deployedConfig.mainnet.usdt,
            config[network].unitroller,
            config[network].usdt_interest_rate_model.address,
            deployedConfig.config.cusdt.initial_exchange_rate_mantissa,
            deployedConfig.config.cusdt.name,
            deployedConfig.config.cusdt.symbol,
            deployedConfig.config.cusdt.decimals,
            cerc20Admin,
            CErc20Delegate.address,
            '0x0', {from: cerc20Admin});
        config[network][CERC20_DELEGATOR_USDT] = CErc20DelegatorUsdt.address
        
        // deploy cether through CErc20Delegator
        await deployer.deploy(CEther, 
            config[network].unitroller,
            config[network].usdt_interest_rate_model.address,
            deployedConfig.config.cweth.initial_exchange_rate_mantissa,
            deployedConfig.config.cweth.name,
            deployedConfig.config.cweth.symbol,
            deployedConfig.config.cweth.decimals,
            cerc20Admin,
             {from: cerc20Admin});
        config[network][CETHER] = CEther.address


        // deploy csushi_weth_usdt through CErc20Delegator
        await deployer.deploy(CErc20DelegatorSushiWethUsdt, 
            deployedConfig.mainnet.sushi_weth_usdt_pair,
            config[network].unitroller,
            config[network].usdt_interest_rate_model.address,
            deployedConfig.config.csushi_weth_usdt_pair.initial_exchange_rate_mantissa,
            deployedConfig.config.csushi_weth_usdt_pair.name,
            deployedConfig.config.csushi_weth_usdt_pair.symbol,
            deployedConfig.config.csushi_weth_usdt_pair.decimals,
            cerc20Admin,
            CErc20Delegate.address,
            '0x0', {from: cerc20Admin});
        config[network][CERC20_DELEGATOR_SUSHI_WETH_USDT] = CErc20DelegatorSushiWethUsdt.address
        
        // deploy ccurve_renbtc_wbtc through CErc20Delegator
        await deployer.deploy(CErc20DelegatorCurveRenbtcWbtc, 
            deployedConfig.config.ccurve_renbtc_wbtc.underlying,
            config[network].unitroller,
            config[network].usdt_interest_rate_model.address,
            deployedConfig.config.ccurve_renbtc_wbtc.initial_exchange_rate_mantissa,
            deployedConfig.config.ccurve_renbtc_wbtc.name,
            deployedConfig.config.ccurve_renbtc_wbtc.symbol,
            deployedConfig.config.ccurve_renbtc_wbtc.decimals,
            cerc20Admin,
            CErc20Delegate.address,
            '0x0', {from: cerc20Admin});
        config[network][CERC20_DELEGATOR_CURVE_RENBTC_WBTC] = CErc20DelegatorCurveRenbtcWbtc.address

        // save config
        utils.writeContractAddresses(config);

    } else {
        return
    }
    
    


}