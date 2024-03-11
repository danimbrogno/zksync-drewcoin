//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./erc20/DrewCoin.sol";
import "./nft/PaloozaBadge.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProofOfPalooza is Ownable {
    
    address private admin = address(0);
    uint256 public generation;
    uint256 public paloozateerIndex = 0;
    uint256 public issuance = 0;
    
    mapping(uint256 => address) public paloozateers;
    mapping(address => bool) public paloozateerExists;

    mapping(uint256 => uint256) public generationIssuance;
    mapping(uint256 => uint256) public numAttendees;
    mapping(uint256 => mapping(address => bool)) public attendance;
    mapping(uint256 => mapping(address => bool)) public rewards;
    mapping(uint256 => bool) public locked;
    mapping(uint256 => address) public badges;

    DrewCoin public token;

    modifier isAdmin() {
        require(msg.sender == admin, 'Not admin');
        _;
    }

    constructor(uint256 _initialGeneration, uint256 _initialIssuance) {
        generation = _initialGeneration;
        issuance = _initialIssuance;
        admin = msg.sender;
        token = new DrewCoin(0);
        token.transferOwnership(address(this));
    }

    function changeAdmin(address _newAdmin) public isAdmin {
        admin = _newAdmin;
    }

    function setIssuance(uint256 _issuance) public isAdmin {
        issuance = _issuance;
    }

    function wasPresent(uint256 _generation, address _paloozateer) public view returns (bool) {
        return attendance[_generation][_paloozateer];
    }

    function isGenerationOpen(uint256 _generation) public view returns (bool) {
        return _generation == generation && !isGenerationLocked(_generation);
    }

    function isGenerationLocked(uint256 _generation) public view returns (bool) {
        return locked[_generation];
    }

    function addPaloozateer(address _paloozateer) private {
        if (paloozateerExists[_paloozateer] == true) {
            return;
        } else {
            paloozateers[paloozateerIndex] = _paloozateer;
            paloozateerExists[_paloozateer] = true;
            paloozateerIndex = paloozateerIndex + 1;
        }
    }

    function claim(uint256 _generation) public {
        require(isGenerationLocked(_generation), 'Generation still open');
        require(wasPresent(_generation, msg.sender), 'Paloozateer was not present for this generation');
        require(rewards[_generation][msg.sender] == false, 'Paloozateer already claimed coins for this generation');
        rewards[generation][msg.sender] = true;

        uint256 share = generationIssuance[_generation] / numAttendees[_generation];

        token.claim(msg.sender, share);
        PaloozaBadge(badges[_generation]).mint(msg.sender);
        
    }

    function markAttendance(uint256 _generation, address _paloozateer) public isAdmin {
        require(isGenerationOpen(_generation), 'Generation is not open');
        require(attendance[_generation][_paloozateer] == false, 'Paloozateer already marked as present');
        addPaloozateer(_paloozateer);
        attendance[_generation][_paloozateer] = true;
        numAttendees[_generation] = numAttendees[_generation] + 1;

    }

    function closeGeneration(string memory description) public isAdmin {
        require(isGenerationOpen(generation), 'Generation is not open');
        locked[generation] = true;
        generationIssuance[generation] = issuance;
        token.mint(address(this), issuance);
        badges[generation] = address(new PaloozaBadge('Proof of Palooza', description, 'POP', generation, paloozateerIndex));
        generation = generation + 1;
    }
    
}
