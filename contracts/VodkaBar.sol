pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract VodkaBar is ERC20("VodkaBar", "xVODKA"){
    using SafeMath for uint256;
    IERC20 public vodka;

    constructor(IERC20 _vodka) public {
        vodka = _vodka;
    }

    // Enter the bar. Pay some VODKAs. Earn some shares.
    function enter(uint256 _amount) public {
        uint256 totalVodka = vodka.balanceOf(address(this));
        uint256 totalShares = totalSupply();
        if (totalShares == 0 || totalVodka == 0) {
            _mint(msg.sender, _amount);
        } else {
            uint256 what = _amount.mul(totalShares).div(totalVodka);
            _mint(msg.sender, what);
        }
        vodka.transferFrom(msg.sender, address(this), _amount);
    }

    // Leave the bar. Claim back your VODKAs.
    function leave(uint256 _share) public {
        uint256 totalShares = totalSupply();
        uint256 what = _share.mul(vodka.balanceOf(address(this))).div(totalShares);
        _burn(msg.sender, _share);
        vodka.transfer(msg.sender, what);
    }
}