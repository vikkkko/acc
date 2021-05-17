pragma solidity ^0.6.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "./StrategyBase.sol";
import "../interfaces/IComptroller.sol";
import "../interfaces/ICToken.sol";
import "../interfaces/IOneSplitAudit.sol";
import "../interfaces/IUniswapRouterV2.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IERC20Detailed.sol";
import "../interfaces/IERC20Detailed.sol";
import "../interfaces/IWETH.sol";

contract StrategyCompoundV1 is StragegyBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;

    address public comp;
    address public comptroller;
    address public cToken;

    uint256 constant mantissaScale = 10 ** 18;
    uint256 constant mantissaHalfScale = 10 ** 9;

    uint256 public ratioNumerator;
    uint256 public ratioDenominator;
    uint256 public toleranceNumerator;

    address public constant cweth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    uint256 public borrowed;
    uint256 public supplied;

    

    function initialize(
        address _governance,
        address _strategist,
        address _controller,
        address _keeper,
        address _guardian,
        address _comptroller,
        address _cToken
    ) public initializer {
        __StrategyBase_init(_governance, _strategist, _controller, _keeper, _guardian);
        comp = IComptroller(_comptroller).getCompAddress();
        require(IComptroller(_comptroller).isComptroller(), "!Comptroller");
        comptroller = _comptroller;
        cToken = _cToken;
        want = ICToken(_cToken).underlying();
        ratioNumerator = 0;
        ratioDenominator = 100;
    }



    function getName() external override view returns (string memory) {
        return string(
            abi.encodePacked(
                "StrategyCompoundFarm ",
                IERC20Detailed(want).symbol()
            )
        );
    }

    function balanceOfPool() public override view returns (uint) {
        (, uint cTokenBal, , uint exchangeRatemMantissa) = ICToken(cToken).getAccountSnapshot(address(this));
        return cTokenBal.mul(exchangeRatemMantissa).div(1e18);

    }

    function getProtectedTokens() external view override returns (address[] memory) {
        address[] memory protectedTokens = new address[](3);
        protectedTokens[0] = want;
        protectedTokens[1] = cToken;
        protectedTokens[2] = want;
        return protectedTokens;
    }
    

    /// ===== Internal Core Implementations =====

    function _onlyNotProtectedTokens(address _asset) internal override {
        require(address(want) != _asset, "want");
        require(address(cToken) != _asset, "ctoken");
        require(address(want) != _asset, "ctoken underlying");
    }

    
    function _deposit(uint _want) internal override {
        if (cToken == cweth) {
            IWETH(weth).withdraw(_want);
            ICEther(cToken).mint{value: _want}();
        } else {
            _safeApproveHelper(want, cToken, _want);
            uint mintResult = ICToken(cToken).mint(_want);
            require(mintResult == 0, "mint fail");
        }
    }

    // Redeem from compound in terms of undderlying amount
    function _redeemUnderlying(uint underlyingAmount) internal {
        
        uint error = ICToken(cToken).redeemUnderlying(underlyingAmount);
        require(error == 0, "redeemUnderlying from compound fail");
        
        if (cToken == cweth) {
            IWETH(weth).deposit{value: underlyingAmount}();
        }
    }

    // Redeem from compound in terms of all ctoken balance 
    function _redeem() internal {
        uint cTokenBalance = ICToken(cToken).balanceOf(address(this));
        if (cTokenBalance == 0) {
            return;
        }

        uint error = ICToken(cToken).redeem(cTokenBalance);
        require(error == 0, "redeem from compound fail");
        
        if (cToken == cweth) {
            IWETH(weth).deposit{value: address(this).balance}();
        }
    }
    

    function _withdrawAll() internal override {

        claimComp();

        // redeem in terms of all cToken balance
        _redeem();
        
        // Send any unproessed comp to rewards
        uint comp_ = IERC20Upgradeable(comp).balanceOf(address(this));
        if (comp_ > 0) {
            IERC20Upgradeable(comp).safeTransfer(IController(controller).rewards(), comp_);
        }
    }

    function _withdrawSome(uint _amount) internal override returns (uint) {
        uint want_ = IERC20Upgradeable(want).balanceOf(address(this));
        if (_amount > want_) {
            uint left = _amount.sub(want_);
            _redeemUnderlying(left);
        }
        return MathUpgradeable.min(_amount, IERC20Upgradeable(want).balanceOf(address(this)));
    }
    
    
    // withdraw all assets, liquidate COMP, and invests again in the required ratio
    function harvest() external whenNotPaused {
        _onlyAuthorizedActors();
        
        claimComp();
        liquidateComp();

        // redeem in terms of all cToken balance
        _redeem();

        _deposit(IERC20Upgradeable(want).balanceOf(address(this)));

    }


    function claimComp() public {
        IComptroller(comptroller).claimComp(address(this));
    }

    function liquidateComp() public {
        uint compHarvested = IERC20Upgradeable(comp).balanceOf(address(this));
        if (compHarvested == 0) {
            return;
        }

        // Take fees on comp
        uint govFee = _processFee(comp, compHarvested, performanceFeeGovernance, governance);

        uint compAfterFee = compHarvested.sub(govFee);
        // swap comp to want
        {
            address onesplit = IController(controller).onesplit();
            (uint expected, uint256[] memory distribution) = IOneSplitAudit(onesplit).getExpectedReturn(
                comp, want, compAfterFee, 1, 0
            );
            IOneSplitAudit(onesplit).swap(
                comp,
                want,
                compAfterFee,
                expected,
                distribution,
                0
            );
        }

    }


} 