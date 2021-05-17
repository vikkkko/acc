// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.8.0;

interface IOneSplitAudit {
    /// @notice Swap `amount` of `fromToken` to `destToken`
    /// @param fromToken (IERC20) Address of token or `address(0)` for Ether
    /// @param destToken (IERC20) Address of token or `address(0)` for Ether
    /// @param amount (uint256) Amount for `fromToken`
    /// @param minReturn (uint256) Minimum expected return, else revert
    /// @param distribution (uint256[]) Array of weights for volume distribution returned by `getExpectedReturn`
    /// @param flags (uint256) Flags for enabling and disabling some features, default 0
    function swap(
        address fromToken,
        address destToken,
        uint256 amount,
        uint256 minReturn,
        uint256[] calldata distribution,
        uint256 flags
    ) external payable returns (uint256 returnAmount);

    /// @notice Calculate expected returning amount of `destToken`
    /// @param fromToken (IERC20) Address of token or `address(0)` for Ether
    /// @param destToken (IERC20) Address of token or `address(0)` for Ether
    /// @param amount (uint256) Amount for `fromToken`
    /// @param parts (uint256) Number of pieces source volume could be splitted,
    /// works like granularity, higly affects gas usage. Should be called offchain,
    /// but could be called onchain if user swaps not his own funds, but this is still considered as not safe.
    /// @param flags (uint256) Flags for enabling and disabling some features, default 0
    function getExpectedReturn(
        address fromToken,
        address destToken,
        uint256 amount,
        uint256 parts,
        uint256 flags // See constants in IOneSplit.sol
    ) external view returns (uint256 returnAmount, uint256[] memory distribution);
}
