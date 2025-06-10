// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract TGE is Ownable, ReentrancyGuard {
    using Math for uint256;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    event TokenDeposit(address indexed purchaser, address indexed beneficiary, uint256 value);
    event Withdraw(uint256 amount);
    event AllocateTOKENX(uint256 amount);
    event ClaimTOKENX(address claimer, uint256 tokenXAmount, uint256 refundAmount);

    error InvalidSaleStart();
    error InvalidSaleClose();
    error SaleNotStarted();
    error SaleHasStarted();
    error SaleEnded();
    error InvalidAddress();
    error AlreadyClaimed();
    error InvalidValue();
    error SaleHasNotEnded();
    error AlreadyWithdraw();
    error MaxDepositAmountExceeded();
    error SaleNotCancelled();
    error MaxDepositAmountExceededForTGE();
    error SaleCancelled();
    error NoDeposits();

    uint256 public constant TOKENX_PRICE = 10 ** 29; // 0.1 USD
    uint256 public constant PRICE_PRECISION = 10 ** 30;
    uint256 public constant TOKENX_DECIMALS = 18;
    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant MAX_DEPOSIT = 2000 * 10 ** USDC_DECIMALS; // 2000 USDC

    address public tokenX;
    uint256 public tokenXTokensAllocated; // TOKENX Tokens allocated to this contract
    uint256 public usdcDeposited; // Keeps track of USDC deposited
    uint64 public saleStart; // Time when the token sale starts
    uint64 public saleClose; // Time when the token sale ends
    bool public isUsdcWithdrawn; // Flag that says if the owner of this contract has withdrawn the ETH raised by this TGE event
    address public usdc;
    bool public saleCancelled; // Flag that says if the owner of this contract has cancelled the token sale
    mapping(address => uint256) public deposits; // Amount each user deposited
    mapping(address => bool) public isClaimed; // Keep track if user has already claimed TOKENX
    EnumerableSet.AddressSet private depositors; // Keep track of all the depositors

    constructor(address _tokenX, address _usdc) Ownable(msg.sender) {
        if (_tokenX == address(0) || _usdc == address(0)) revert InvalidAddress();
        tokenX = _tokenX;
        usdc = _usdc;
        isUsdcWithdrawn = false;
    }

    /// @param _saleStart time when the token sale starts
    /// @param _saleClose time when the token sale closes
    function Initialize(uint64 _saleStart, uint64 _saleClose) external onlyOwner {
        if (_saleStart <= block.timestamp) revert InvalidSaleStart();
        if (_saleClose <= _saleStart) revert InvalidSaleClose();
        saleCancelled = false;
        saleStart = _saleStart;
        saleClose = _saleClose;
        isUsdcWithdrawn = false;
    }

    // owner can not allocate tokenX tokens before initalizing the saleStart and saleClose parameters using intialize function
    function allocateTOKENX(uint256 _tokenXAllocation) external onlyOwner {
        if (block.timestamp > saleStart) revert SaleHasStarted();

        IERC20(tokenX).transferFrom(owner(), address(this), _tokenXAllocation);

        tokenXTokensAllocated = IERC20(tokenX).balanceOf(address(this));

        emit AllocateTOKENX(_tokenXAllocation);
    }

    // Hard Cap for USDC to be collected from this TGE
    function usdcHardCap() public view returns (uint256) {
        return (tokenXTokensAllocated * TOKENX_PRICE) / PRICE_PRECISION / (10 ** (TOKENX_DECIMALS - USDC_DECIMALS));
    }

    function depositUsdc(uint256 _amount) external nonReentrant {
        if (saleCancelled) revert SaleCancelled();
        if (usdcDeposited + _amount > usdcHardCap()) revert MaxDepositAmountExceededForTGE();
        if (block.timestamp < saleStart) revert SaleNotStarted();
        if (block.timestamp > saleClose) revert SaleEnded();
        if (_amount == 0) revert InvalidValue();
        if (deposits[msg.sender] + _amount > MAX_DEPOSIT) revert MaxDepositAmountExceeded();

        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);

        _deposit(msg.sender, _amount);
    }

    function claimTOKENX() external nonReentrant {
        if (block.timestamp <= saleClose) revert SaleHasNotEnded();
        if (isClaimed[msg.sender]) revert AlreadyClaimed();

        uint256 _claimableAmount = claimableAmount(msg.sender);
        uint256 _refundAmount = refundAmount(msg.sender);
        isClaimed[msg.sender] = true;

        if (_claimableAmount > 0) {
            IERC20(tokenX).transfer(msg.sender, _claimableAmount);
        }

        if (_refundAmount > 0) {
            _transferOutUsdc(msg.sender, _refundAmount);
        }

        emit ClaimTOKENX(msg.sender, _claimableAmount, _refundAmount);
    }

    function withdraw() external onlyOwner {
        if (block.timestamp <= saleClose) revert SaleHasNotEnded();
        if (isUsdcWithdrawn) revert AlreadyWithdraw();

        uint256 _usdcHardCap = usdcHardCap();
        uint256 usdctoWithdraw = usdcDeposited >= _usdcHardCap ? _usdcHardCap : usdcDeposited;

        isUsdcWithdrawn = true;

        _transferOutUsdc(msg.sender, usdctoWithdraw);
        _withdrawTOKENX();

        emit Withdraw(usdctoWithdraw);
    }

    function claimableAmount(address beneficiary) public view returns (uint256) {
        uint256 _amount = !isClaimed[beneficiary] && usdcDeposited > 0
            ? (deposits[beneficiary] * PRICE_PRECISION * (10 ** (TOKENX_DECIMALS - USDC_DECIMALS))) / TOKENX_PRICE
            : 0;

        uint256 _usdcHardCap = usdcHardCap();
        if (_amount > 0 && usdcDeposited > _usdcHardCap) {
            _amount = (_amount * _usdcHardCap) / usdcDeposited;
        }
        return _amount;
    }

    function refundAmount(address beneficiary) public view returns (uint256) {
        if (isClaimed[beneficiary]) return 0;

        uint256 _usdcHardCap = usdcHardCap();

        if (usdcDeposited <= _usdcHardCap) return 0;

        return (deposits[beneficiary] * (usdcDeposited - _usdcHardCap)) / usdcDeposited;
    }

    function _deposit(address beneficiary, uint256 _amount) internal {
        deposits[beneficiary] += _amount;
        usdcDeposited += _amount;
        if (!depositors.contains(beneficiary)) {
            depositors.add(beneficiary);
        }
        emit TokenDeposit(msg.sender, beneficiary, _amount);
    }

    function _transferOutUsdc(address to, uint256 amount) internal {
        IERC20(usdc).transfer(to, amount);
    }

    function _withdrawTOKENX() internal {
        uint256 _usdcHardCap = usdcHardCap();

        if (usdcDeposited < _usdcHardCap) {
            uint256 tokenXAmount = (tokenXTokensAllocated * (_usdcHardCap - usdcDeposited)) / _usdcHardCap;
            IERC20(tokenX).transfer(msg.sender, tokenXAmount);
        }
    }

    function withdrawAndCancelAllocation(address _depositor) external onlyOwner {
        if (block.timestamp > saleClose) revert SaleEnded();
        uint256 amount = deposits[_depositor];
        deposits[_depositor] = 0;
        usdcDeposited = usdcDeposited - amount;
        depositors.remove(_depositor);
        _transferOutUsdc(_depositor, amount);
    }

    function cancelAllocation() external {
        if (block.timestamp > saleClose) revert SaleEnded();
        if (deposits[msg.sender] == 0) revert NoDeposits();
        uint256 amount = deposits[msg.sender];
        deposits[msg.sender] = 0;
        usdcDeposited = usdcDeposited - amount;
        depositors.remove(msg.sender);
        _transferOutUsdc(msg.sender, amount);
    }

    function withdrawAll(address to, address token) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        if (token == address(usdc)) revert InvalidAddress();
        if (token == address(tokenX)) revert InvalidAddress();
        uint256 amount = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(to, amount);
    }

    function cancelSale() external onlyOwner {
        if (block.timestamp > saleClose) revert SaleEnded();
        saleCancelled = true;
    }

    function withdrawUsdcAfterCancellation() external nonReentrant {
        if (!saleCancelled) revert SaleNotCancelled();
        if (deposits[msg.sender] == 0) revert NoDeposits();
        uint256 amount = deposits[msg.sender];
        deposits[msg.sender] = 0;
        usdcDeposited = usdcDeposited - amount;
        depositors.remove(msg.sender);
        _transferOutUsdc(msg.sender, amount);
    }

    function withdrawUsdcAfterCancellationByOwner(address _depositor) external onlyOwner {
        if (!saleCancelled) revert SaleNotCancelled();
        if (deposits[_depositor] == 0) revert NoDeposits();
        uint256 amount = deposits[_depositor];
        deposits[_depositor] = 0;
        usdcDeposited = usdcDeposited - amount;
        depositors.remove(_depositor);
        _transferOutUsdc(_depositor, amount);
    }

    function getDepositors() external view returns (address[] memory) {
        return depositors.values();
    }

    function isDepositor(address account) external view returns (bool) {
        return depositors.contains(account);
    }

    /// @notice Automatically refund ETH sent to the contract
    receive() external payable {
        // Refund immediately
        (bool success, ) = msg.sender.call{ value: msg.value }("");
        require(success, "ETH refund failed");
    }

    /// @notice Catch-all fallback to prevent sending invalid data
    fallback() external payable {
        revert("Invalid call");
    }
}