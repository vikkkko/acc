pragma solidity >=0.5.0;

interface IWETH {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint);
    function balanceOf(address owner) external returns (uint256);
    function transfer(address to, uint value) external returns (bool);
    function approve(address to, uint value) external returns (bool);
    function transferFrom(address owner, address to, uint value) external returns (bool);

    function deposit() external payable;
    function withdraw(uint) external; 
}
