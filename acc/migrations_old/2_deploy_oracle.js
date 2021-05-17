const utils = require('./utils')
const ChainlinkPriceOracleProxy = artifacts.require("ChainlinkPriceOracleProxy")

module.exports = async function (deployer, network, accounts) {
    console.log("2_deploy_oracle.js, network: ", network)
    let deployedConfig = utils.getConfigContractAddresses();
    let config = utils.getContractAddresses();
    
    if (network == "main_fork") {
        deployedConfig = deployedConfig["mainnet"]
        // deploy oracle
        await deployer.deploy(ChainlinkPriceOracleProxy, deployedConfig.usd_per_eth, {from: accounts[0]});
        config[network] = {
            "oracle": ChainlinkPriceOracleProxy.address
        }
        


        // save config
        utils.writeContractAddresses(config);
    } else {
        return
    }
    
    // load oracle
    let oracle = await ChainlinkPriceOracleProxy.at(config[network]["oracle"]);


    


}