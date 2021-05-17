pragma solidity ^0.6.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "./StrategyBase.sol";
import "../interfaces/IMasterChef.sol";
import "../interfaces/IOneSplitAudit.sol";
import "../interfaces/IUniswapRouterV2.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IERC20Detailed.sol";

contract StrategySushi is StragegyBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;

    address public masterChef;
    address public sushi;

    uint256 public pid;

    function initialize(
        address _governance,
        address _strategist,
        address _controller,
        address _keeper,
        address _guardian,
        address _sushiChef,
        uint256 _pid
    ) public initializer {
        __StrategyBase_init(_governance, _strategist, _controller, _keeper, _guardian);
        masterChef = _sushiChef;
        sushi = IMasterChef(masterChef).sushi();
        pid = _pid;
        (want,,,) = IMasterChef(masterChef).poolInfo(_pid);
    }

    function getName() external override view returns (string memory) {
        return string(
            abi.encodePacked(
                "StrategySushiFarm ",
                IERC20Detailed(IUniswapV2Pair(want).token0()).symbol(),
                "/",
                IERC20Detailed(IUniswapV2Pair(want).token1()).symbol()
            )
        );
    }

    function balanceOfPool() public override view returns (uint) {
        (uint staked, ) = IMasterChef(masterChef).userInfo(pid, address(this));
        return staked;
    }

    function getProtectedTokens() external view override returns (address[] memory) {
        address[] memory protectedTokens = new address[](2);
        protectedTokens[0] = want;
        protectedTokens[1] = sushi;
        return protectedTokens;
    }
    

    /// ===== Internal Core Implementations =====

    function _onlyNotProtectedTokens(address _asset) internal override {
        require(address(want) != _asset, "want");
        require(address(sushi) != _asset, "sushi");
    }

    function _deposit(uint _want) internal override {
        _safeApproveHelper(want, masterChef, _want);
        IMasterChef(masterChef).deposit(pid, _want);
    }

    function _withdrawAll() internal override {
        IMasterChef(masterChef).withdraw(pid, balanceOfPool());

        // Send any unproessed sushi to rewards
        uint sushi_ = IERC20Upgradeable(sushi).balanceOf(address(this));
        if (sushi_ > 0) {
            IERC20Upgradeable(sushi).safeTransfer(IController(controller).rewards(), sushi_);
        }

    }

    function _withdrawSome(uint _amount) internal override returns (uint) {
        uint _want = balanceOfWant();
        if (_want < _amount) {
            uint _toWithdraw = _amount.sub(_want);
            if (_toWithdraw > balanceOfPool()) {
                _toWithdraw = balanceOfPool();
            }
            IMasterChef(masterChef).withdraw(pid, _toWithdraw);
        }
        return MathUpgradeable.min(_amount, balanceOfWant());
    }

    function harvest() external whenNotPaused {
        _onlyAuthorizedActors();
        
        // collect sushi rewards from masterChef
        IMasterChef(masterChef).deposit(pid, 0);

        uint sushiHarvested = IERC20Upgradeable(sushi).balanceOf(address(this));
        
        if (sushiHarvested == 0) {
            return;
        }
        (address t0, address t1) = (IUniswapV2Pair(want).token0(), IUniswapV2Pair(want).token1());
        

        // Take fees on sushi
        uint govFee = _processFee(sushi, sushiHarvested, performanceFeeGovernance, governance);

        uint halfSushiAfterFee = sushiHarvested.sub(govFee).div(2);
        // swap sushi to token0
        {
            address onesplit = IController(controller).onesplit();
            (uint expected, uint256[] memory distribution) = IOneSplitAudit(onesplit).getExpectedReturn(
                sushi, t0, halfSushiAfterFee, 1, 0
            );
            IOneSplitAudit(onesplit).swap(
                sushi,
                t0,
                halfSushiAfterFee,
                expected,
                distribution,
                0
            );
        }

        // swap sushi to token1
        {
            address onesplit = IController(controller).onesplit();
            (uint expected, uint256[] memory distribution) = IOneSplitAudit(onesplit).getExpectedReturn(
                sushi, t1, halfSushiAfterFee, 1, 0
            );
            IOneSplitAudit(onesplit).swap(
                sushi,
                t1,
                halfSushiAfterFee,
                expected,
                distribution,
                0
            );
        }

        // add liquidity
        _add_max_liquidity(sushiswap, t0, t1);

        // deposit harvested lp into masterchef
        uint want_ = IERC20Upgradeable(want).balanceOf(address(this));
        if (want_ > 0) {
            IMasterChef(masterChef).deposit(pid, want_);
        }
    }

} 