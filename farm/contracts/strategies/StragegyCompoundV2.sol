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

contract StrategyCompoundV2 is StragegyBase {
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


    uint256 public borrowed;
    uint256 public supplied;

    

    function initialize(
        address _governance,
        address _strategist,
        address _controller,
        address _keeper,
        address _guardian,
        address _comp,
        address _comptroller,
        address _cToken
    ) public initializer {
        __StrategyBase_init(_governance, _strategist, _controller, _keeper, _guardian);
        comp = _comp;
        require(IComptroller(_comptroller).isComptroller(), "!Comptroller");
        comptroller = _comptroller;
        cToken = _cToken;
        want = ICToken(_cToken).underlying();
        ratioNumerator = 0;
        ratioDenominator = 100;
    }


    modifier protectCollateral() {
        _;
        supplied = ICToken(cToken).balanceOfUnderlying(address(this));
        borrowed = ICToken(cToken).borrowBalanceCurrent(address(this));
        (, uint256 collateralFactorMantissa, ) = IComptroller(comptroller).markets(cToken);
        uint256 canBorrow = supplied
            .mul(collateralFactorMantissa.div(mantissaHalfScale))
            .div(mantissaHalfScale);

        require(borrowed < canBorrow || borrowed == 0, "We would get liquidated!");
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
        return _balanceOfUnderlying();
    }

    function _balanceOfUnderlying() public view returns (uint) {
        
        (uint err, uint cTokenBal, uint borrowBal, uint exchangeRatemMantissa) = ICToken(cToken).getAccountSnapshot(address(this));
        // TODO:
        return 0;

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

    function outsideTolerance() public returns (bool) {
        borrowed = ICToken(cToken).borrowBalanceCurrent(address(this));
        supplied = ICToken(cToken).balanceOfUnderlying(address(this));

        uint allowedLoan = supplied.mul(ratioNumerator).div(ratioDenominator);
        uint tolerance = supplied.mul(toleranceNumerator).div(ratioDenominator);
        // insideTolerance means: allowed - tolerance < borrowed < allowed + tolerance
        return borrowed > allowedLoan.add(tolerance) || borrowed.add(tolerance) < allowedLoan;
    }

    function _mintCToken(uint _want) internal {
        if (cToken == address(0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5)) {
            ICEther(cToken).mint{value: _want}();
        } else {
            _safeApproveHelper(want, cToken, _want);
            uint mintResult = ICToken(cToken).mint(_want);
            require(mintResult == 0, "mint fail");
        }
    }
    function _deposit(uint _want) internal override {
        _mintCToken(_want);
    }

    function _supply(uint amount) internal returns (uint) {
        uint want_ = IERC20Upgradeable(want).balanceOf(address(this));
        if (amount < want_) {
            want_ = amount;
        }
        _mintCToken(want_);
        return want_;
    }

    function _borrow(uint amount) internal {
        // Borrow DAI, check DAI balance for address(this)
        uint result = ICToken(cToken).borrow(amount);
        require(result == 0, "borrow fail");
    }

    function borrow(uint underlyingAmount) internal returns (uint) {
        // borrow as much as we can
        (, uint collateralFactorMantissa, ) = IComptroller(comptroller).markets(cToken);
        // TODO: check 10 ** 12
        collateralFactorMantissa = collateralFactorMantissa.div(10 ** 12);
        
        uint loan = ICToken(cToken).borrowBalanceCurrent(address(this));
        uint supply = ICToken(cToken).balanceOfUnderlying(address(this));
        uint max = supply.mul(collateralFactorMantissa).div(10 ** 6);
        uint canBorrow = loan >= max ? 0 : max.sub(loan);

        if (canBorrow == 0) {
            return 0;
        }

        uint actualBorrow = MathUpgradeable.min(underlyingAmount, canBorrow);
        _borrow(actualBorrow);
        return actualBorrow;
    }

    // repay a loan
    function _repay(uint underlyingAmount) internal {
        IERC20Upgradeable(want).safeApprove(cToken, 0);
        IERC20Upgradeable(want).safeApprove(cToken, underlyingAmount);
        ICToken(cToken).repayBorrow(underlyingAmount);
        IERC20Upgradeable(want).safeApprove(cToken, 0);
    }

    // Repay as much as we can, but at most what is needed
    function repayMaximum() internal returns (uint) {
        uint balance = IERC20Upgradeable(want).balanceOf(address(this));
        if (balance == 0) {
            // nothing to work with
            return 0;
        }
        uint loan = ICToken(cToken).borrowBalanceCurrent(address(this));
        uint repayAmount = MathUpgradeable.min(balance, loan);
        if (repayAmount > 0) {
            _repay(repayAmount);
        }
        return repayAmount;
    }

    // Redeem liquidity in underlying
    function _redeemUnderlying(uint underlyingAmount) internal {
        if (underlyingAmount > 0) {
            ICToken(cToken).redeemUnderlying(underlyingAmount);
        }
    }

    // Redeems maximum that can be redeemed from Compound.
    function redeemMaximum() internal returns (uint) {
        // redeem as much as we can 
        (, uint collateralFactorMantissa, ) = IComptroller(comptroller).markets(cToken);
        
        uint loan = ICToken(cToken).borrowBalanceCurrent(address(this));
        uint supply = ICToken(cToken).balanceOfUnderlying(address(this));

        uint needToKeep = loan
            .mul(mantissaHalfScale)
            .div(collateralFactorMantissa.div(mantissaHalfScale));
        
        uint canRedeem = supply > needToKeep ? supply.sub(needToKeep) : 0;
        uint dust = (
            10 ** uint256(
                IERC20Detailed(want).decimals()
                )
            ).div(10);

        if (canRedeem > dust) {
            _redeemUnderlying(canRedeem);
            return canRedeem;
        }
        return 0;
    }

    function _withdrawAll() internal override {

        claimComp();
        liquidateComp();

        // we always supplied more than necessary due to the set investment ratio
        // we can redeem everything
        supplied = ICToken(cToken).balanceOfUnderlying(address(this));
        borrowed = ICToken(cToken).borrowBalanceCurrent(address(this));

        uint dust = (10 ** uint256(IERC20Detailed(want).decimals())).div(10);
        while (supplied > dust) {
            repayMaximum();
            redeemMaximum();
            
            supplied = ICToken(cToken).balanceOfUnderlying(address(this));
            borrowed = ICToken(cToken).borrowBalanceCurrent(address(this));
        }
        
        // transfer want to vault
        IERC20Upgradeable(want).safeTransfer(
            IController(controller).vaults(want), 
            IERC20Upgradeable(want).balanceOf(address(this))
        );
    }

    function _withdrawSome(uint _amount) internal override returns (uint) {
        if (_amount < IERC20Upgradeable(want).balanceOf(address(this))) {
            
            // check underlying asset destination
            IERC20Upgradeable(want).safeTransfer(
                IController(controller).vaults(want), 
                _amount
            );
            
            return _amount;
        }
    }
    
    
    /**
    * Based on the current balance and the collateralization ratio that is desired, the function
    * returns a tuple indicating how much funds should be invested in, and how much funds should
    * be borrowed back. The difference between the current balance and how much should be invested
    * needs to be obtained either by executing the roll several times, or by getting a flash loan.
    */
    function investExact() public view returns (uint, uint) {
        require(ratioNumerator < ratioDenominator, "we could borrow infinitely");
        if (ratioNumerator == 0) {
            return (0,0);
        }
        uint256 want_ = IERC20Upgradeable(want).balanceOf(address(this));
        uint256 totalIn = want_.mul(ratioDenominator).div(ratioDenominator.sub(ratioNumerator));
        uint256 totalOut = totalIn.sub(want_);
        return (totalIn, totalOut);
    }

    /**
    * The strategy invests by supplying the underlying as a collateral and taking
    * a loan in the required ratio. The borrowed money is then re-supplied.
    */
    function investAllUnderlying() public protectCollateral {

        (uint256 amountIn, uint256 amountOut) = investExact();

        uint256 want_ = IERC20Upgradeable(want).balanceOf(address(this));

        // get more cash from vault
        address vault = IController(controller).vaults(want);
        uint256 vaultLoan = 0;
        if (want_ < amountIn) {
            vaultLoan = IERC20Upgradeable(want).balanceOf(vault);
            if (vaultLoan > 0) {
            IERC20Upgradeable(want).safeTransferFrom(vault, address(this), vaultLoan);
            }
        }

        // we are out of options, now we need to roll
        uint256 suppliedRoll = 0;
        uint256 borrowedRoll = 0;
        while(suppliedRoll < amountIn) {
            uint256 nowSupplied = _supply(amountIn.sub(suppliedRoll));
            suppliedRoll = suppliedRoll.add(nowSupplied);

            uint256 nowBorrowed = borrow(amountOut.sub(borrowedRoll));
            borrowedRoll = borrowedRoll.add(nowBorrowed);
        }

        // state of supply/loan will be updated by the modifier

        // return loans
        if (vaultLoan > 0) {
            IERC20Upgradeable(want).safeTransfer(vault, vaultLoan);
        }
    }

    // withdraw all assets, liquidate COMP, and invests again in the required ratio
    function harvest() external whenNotPaused {
        _onlyAuthorizedActors();
        
        if (outsideTolerance()) {
            // there is a difference between how we are invested and how we want to be invested
            // we should withdraw all and rebalance
            _withdrawAll();
        }
        claimComp();
        liquidateComp();
        investAllUnderlying();

    }


    function claimComp() public {
        IComptroller(comptroller).claimComp(address(this));
    }

    function liquidateComp() public {
        uint oldBalance = IERC20Upgradeable(want).balanceOf(address(this));
        uint compBalance = IERC20Upgradeable(comp).balanceOf(address(this));
        if (compBalance > 0) {
            _safeApproveHelper(comp, uniswap, compBalance);
            address[] memory path = new address[](3);
            path[0] = address(comp);
            path[1] = weth;
            path[2] = address(want);
            IUniswapRouterV2(uniswap).swapExactTokensForTokens(
                compBalance,
                1,
                path,
                address(this),
                block.timestamp
            );
        }
        
        uint govFee = _processFee(want, IERC20Upgradeable(want).balanceOf(address(this)).sub(oldBalance), performanceFeeGovernance, governance);




    }


} 