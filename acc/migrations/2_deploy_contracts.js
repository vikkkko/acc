const utils = require('./utils')

const PriceOracle = artifacts.require("ChainlinkPriceOracleProxy");
const InterestModel = artifacts.require("WhitePaperInterestRateModel");
const ComptrollerG5 = artifacts.require("ComptrollerG5");
const sELA = artifacts.require("CEther");
const CErc20Delegate = artifacts.require("CErc20Delegate");
const erc20Delegator = artifacts.require("CErc20Delegator");
const Unitroller = artifacts.require("Unitroller");
const CompoundLens = artifacts.require("CompoundLens");
const Maximillion = artifacts.require("Maximillion");

// Mock Tokens
const TetherToken = artifacts.require("TetherToken");

// Parameters
const closeFactor = 0.5e18.toString();
const liquidationIncentive = 1.13e18.toString();
// const reserveFactor = 0.3e18.toString();

const maxAssets = 10;
let addressFactory = {};
module.exports = async function(deployer, network) {
    let deployedConfig = utils.getConfigContractAddresses()[network];
    console.log(deployedConfig.usd_per_eth);
    await deployer.deploy(ComptrollerG5);
return
    await deployer.deploy(CErc20Delegate);
    await deployer.deploy(PriceOracle,deployedConfig.usd_per_eth);
    let priceOracleInstance = await PriceOracle.deployed();

    await deployer.deploy(Unitroller);
    await deployer.deploy(CompoundLens);
    // await deployer.deploy(Comp,admin);
    // let compIns = await Comp.deployed();
    // let compBalanceOf = await compIns.balanceOf(admin);
    // console.log("compBalanceOf: ", compBalanceOf);

    addressFactory["ComptrollerG5"] = Unitroller.address;
    addressFactory["PriceOracle"] = PriceOracle.address;
    addressFactory["CompoundLens"] = CompoundLens.address;

    let unitrollerInstance = await Unitroller.deployed();
    let comptrollerG5Instance = await ComptrollerG5.deployed();
    let admin = await comptrollerG5Instance.admin();
    console.log("admin: ", admin);

    await unitrollerInstance._setPendingImplementation(ComptrollerG5.address);
    await comptrollerG5Instance._become(Unitroller.address);

    await deployer.deploy(InterestModel, "20000000000000000", "200000000000000000");

    let proxiedComptrollerG5 = await ComptrollerG5.at(Unitroller.address);

    await proxiedComptrollerG5._setPriceOracle(PriceOracle.address);
    console.log("Done to set price oracle.", await proxiedComptrollerG5.oracle());

    await proxiedComptrollerG5._setMaxAssets(maxAssets);
    let result = await proxiedComptrollerG5.maxAssets();
    console.log("Done to set max assets.", result.toString());

    await proxiedComptrollerG5._setLiquidationIncentive(liquidationIncentive);
    console.log("Done to set liquidation incentive.");
    let incentive = await proxiedComptrollerG5.liquidationIncentiveMantissa();
    console.log("New incentive: ", incentive.toString());

    await proxiedComptrollerG5._setCloseFactor(closeFactor);
    result = await proxiedComptrollerG5.closeFactorMantissa();
    console.log("Done to set close factor with value: ", result.toString());

    if (network == "rinkeby") {
        await deployer.deploy(TetherToken, "1000000000000000", "Tether USD", "USDT", 6);

        await deployer.deploy(erc20Delegator, TetherToken.address, Unitroller.address, InterestModel.address, 0.02e6.toString(), "Accmulation USDT", "sUSDT", 18, admin, erc20Delegate.address, "0x0");

        await proxiedComptrollerG5._supportMarket(erc20Delegator.address);
        console.log("Done to support market: ", erc20Delegator.address);

        let allSupportedMarkets = await proxiedComptrollerG5.getAllMarkets();
        console.log("allSupportedMarkets: ", allSupportedMarkets);

        

        let cTokenAddress = [TetherToken.address];
        let chainlinkAggregatorAddress = [deployedConfig.eth_per_usdt];  //0xdCA36F27cbC4E38aE16C4E9f99D39b42337F6dcf
        // 0: Invalid, 1: USD, 2: ETH, 3: LP, 4: Curve LP
        let chainlinkPriceBase = ['2'];
        let underlyingTokenDecimals = ['6'];
        await priceOracleInstance.setTokenConfigs(
            cTokenAddress,
            chainlinkAggregatorAddress,
            chainlinkPriceBase,
            underlyingTokenDecimals
        );
        console.log("Done to setTokenConfigs");

        let price = await priceOracleInstance.getUnderlyingPrice(erc20Delegator.address);
        console.log(`${erc20Delegator.address}  price :${price}`);
    }

    if (network == "hecotest" || network == "heco") {
        await deployer.deploy(sELA, Unitroller.address, InterestModel.address, 0.02e18.toString(), "Filda HT", "fHT", 18, admin);
        await proxiedComptrollerG5._supportMarket(sELA.address);
        console.log("Done to support market fHT: ", sELA.address);
        let htCollateralFactor = 0.15e18.toString();
        await proxiedComptrollerG5._setCollateralFactor(sELA.address, htCollateralFactor);
        console.log("Done to set collateral factor %s for fHT %s", htCollateralFactor, sELA.address);
        addressFactory["fHT"] = sELA.address;
        await deployer.deploy(Maximillion, sELA.address);
        addressFactory["Maximillion"] = Maximillion.address;
    }
    console.log("================= Copy and record below addresses ==============")
    console.log(addressFactory);
};
