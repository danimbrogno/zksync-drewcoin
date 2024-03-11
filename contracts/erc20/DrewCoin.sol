// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyERC20Token
 * @dev This is a basic ERC20 token using the OpenZeppelin's ERC20PresetFixedSupply preset.
 * You can edit the default values as needed.
 */
contract DrewCoin is ERC20Burnable, Ownable {

    
    /**
     * @dev Constructor to initialize the token with default values.
     * You can edit these values as needed.
     */
    constructor(uint256 initialSupply) ERC20("DrewCoin", "DREW") {

        // The initial supply is minted to the deployer's address
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function claim(address to, uint256 amount) public onlyOwner {
        _transfer(msg.sender, to, amount);
    }
    
}
