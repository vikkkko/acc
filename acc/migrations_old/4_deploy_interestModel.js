const utils = require('./utils')
const Unitroller = artifacts.require("Unitroller")
const ComptrollerG4 = artifacts.require("ComptrollerG4")
const JumpRateModelV2 = artifacts.require("JumpRateModelV2")

module.exports = async function (deployer, network, accounts) {
    console.log("4_deploy_interestModel.js, network: ", network)
    let deployedConfig = utils.getConfigContractAddresses();
    let config = utils.getContractAddresses();
    
    if (network == "main_fork") {
        // deploy usdt interest model
        let usdtInterestRateAdmin = accounts[0];
        await deployer.deploy(JumpRateModelV2,
            deployedConfig.config.usdt_interest_rate_model.base_rate,
            deployedConfig.config.usdt_interest_rate_model.multiplier,
            deployedConfig.config.usdt_interest_rate_model.jump,
            deployedConfig.config.usdt_interest_rate_model.kink,
            usdtInterestRateAdmin, 
            {from: usdtInterestRateAdmin});
        config[network]["usdt_interest_rate_model"] = {
            "address": JumpRateModelV2.address,
            "base_rate": deployedConfig.config.usdt_interest_rate_model.base_rate,
            "jump": deployedConfig.config.usdt_interest_rate_model.jump,
            "kink": deployedConfig.config.usdt_interest_rate_model.kink,
            "owner": usdtInterestRateAdmin
        }

        // save config
        utils.writeContractAddresses(config);

    } else {
        return
    }
    
    


}