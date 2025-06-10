// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IMintable.sol";

contract TOKENX is OFT, IMintable {

    using SafeERC20 for IERC20;

    uint256 public constant MAX_MINT_AMOUNT = 10 ** 27; // 1B
    uint256 public tokensCirculating;
    uint256 public mintedAmount;

    constructor(address _lzEndpoint, address _owner) OFT("TokenX", "TokenX", _lzEndpoint, _owner) Ownable(_owner) {
        mintedAmount = 0;
    }

    // to help users who accidentally send their tokens to this contract
    function withdrawToken(address _token, address _account, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(_account, _amount);
    }

    function mint(address _account, uint256 _amount) external onlyOwner() {

        require(tokensCirculating + _amount <= MAX_MINT_AMOUNT, "TokenX: max mint amount exceeds");
        require(mintedAmount + _amount <= MAX_MINT_AMOUNT, "TokenX: max mint amount exceeds");
        
        mintedAmount += _amount;
        tokensCirculating += _amount;
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) external onlyOwner() {
        require(tokensCirculating >= _amount, "TokenX: Insufficient tokens");

        tokensCirculating -= _amount;
        _burn(_account, _amount);
    }

}

