pragma solidity ^0.6.11;

interface IMasterChef {
    function sushi() external view returns (address);
    function poolInfo(uint pid) external view returns (
        address lpToken,
        uint allocPoint,
        uint lastRewardBlock,
        uint accSushiPerShare);
    function poolLength() external view returns (uint);
    function userInfo(uint pid, address user) external view returns (
        uint amount,
        uint rewardDebt
    );
    function pendingSushi(uint pid, address user) external view returns (uint);

    function deposit(uint pid, uint amount) external;
    function withdraw(uint pid, uint amount) external;
    function emergencyWithdraw(uint pid) external;


}