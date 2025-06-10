// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.22;

interface IMintable {
    
    function mint(address _account, uint256 _amount) external;
    function burn(address _account, uint256 _amount) external;

}