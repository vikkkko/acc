const utils = require('./utils')
const Unitroller = artifacts.require("Unitroller")
const ComptrollerG4 = artifacts.require("ComptrollerG4")

UNITROLLER = "unitroller"
CONTROLLER = "controller"

module.exports = async function (deployer, network, accounts) {
    console.log("3_deploy_controller.js, network: ", network)
    // let deployedConfig = utils.getConfigContractAddresses();
    let config = utils.getContractAddresses();
    
    if (network == "main_fork") {
        // deploy Unitroller
        let uniAdmin = accounts[0];
        await deployer.deploy(Unitroller, {from: uniAdmin});
        config[network][UNITROLLER] = Unitroller.address

        // deploy ComptrollerG4
        await deployer.deploy(ComptrollerG4, {from: accounts[0]});
        config[network][CONTROLLER] = ComptrollerG4.address

        // config unitroller
        let unitroller = await Unitroller.at(config[network][UNITROLLER])
        await unitroller._setPendingImplementation(config[network][CONTROLLER], {from: uniAdmin})
        let controller = await ComptrollerG4.at(config[network][CONTROLLER])
        await controller._become(unitroller.address, {from: uniAdmin})

        // save config
        utils.writeContractAddresses(config);

    } else {
        return
    }
    
    


}