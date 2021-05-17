const utils = require('./utils')
const Unitroller = artifacts.require("Unitroller")
const ComptrollerG4 = artifacts.require("ComptrollerG4")
const CErc20 = artifacts.require("CErc20")
const CErc20Delegate = artifacts.require("CErc20Delegate")
const CErc20DelegatorUsdt = artifacts.require("CErc20Delegator")
const CErc20DelegatorWeth = artifacts.require("CErc20Delegator")
const CErc20DelegatorSushiWethUsdt = artifacts.require("CErc20Delegator")
const Comp = artifacts.require("Comp")
const Timelock = artifacts.require("Timelock")
const GovernorAlpha = artifacts.require("GovernorAlpha")


CERC20_DELEGATE = "cerc20_delegate"
CERC20_DELEGATOR_USDT = "cerc20_delegator_usdt"
CERC20_DELEGATOR_WETH = "cerc20_delegator_weth"
CERC20_DELEGATOR_SUSHI_WETH_USDT = "cerc20_delegator_sushi_weth_usdt"
COMP = "comp"
const toWei = web3.utils.toWei


module.exports = async function (deployer, network, accounts) {
    console.log("6_deploy_comp.js, network: ", network)
    let deployedConfig = utils.getConfigContractAddresses();
    let config = utils.getContractAddresses();
    
    if (network == "main_fork") {
        // deploy comp token
        let compTAdmin = accounts[0];
        await deployer.deploy(Comp, compTAdmin, {from: compTAdmin});
        config[network][COMP] = Comp.address
        
        // deploy timelock 
        
        
        // deploy governorAlpha
       

        // save config
        utils.writeContractAddresses(config);

    } else {
        return
    }
    
    


}