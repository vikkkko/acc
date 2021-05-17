const utils = require('./utils')
const StrategyController = artifacts.require("StrategyController")


SUB_KEY = "farm"
CONTROLLER = "controller"

module.exports = async function (deployer, network, accounts) {
    console.log("2_deploy_controller.js, network: ", network)
    let deployedConfig = utils.getConfigContractAddresses();
    let config = utils.getContractAddresses();
    
    if (network == "main_fork") {
        deployedConfig = deployedConfig["mainnet"]
        // deploy controller
        await deployer.deploy(StrategyController, {from: accounts[0]});
        config[network][SUB_KEY] = {

        }
        config[network][SUB_KEY][CONTROLLER] = StrategyController.address
        
        let controller = await StrategyController.at(config[network][SUB_KEY][CONTROLLER])

        {
            let gov = accounts[0];
            let strategist = accounts[0];
            let keeper = accounts[0];
            let rewards = accounts[0];
            await controller.initialize(
                gov,
                strategist,
                keeper,
                rewards,
                {from: accounts[0]}
            );
        } 
        
        // save config
        utils.writeContractAddresses(config);
    } else {
        return
    }
    
}