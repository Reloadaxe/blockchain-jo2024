// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketFactory is Ownable {
    event NewTicket(
        uint256 ticketId,
        Category category,
        uint256 expires_at
    );
    event TicketScanned(uint256 ticketId, address agent, uint256 created_at);

    enum Category {
        VISITEUR,
        AGENT,
        DELEGATION,
        AUTRES
    }

    struct Ticket {
        Category category;
        uint256 expires_at;
        uint8 validations;
    }

    struct TicketResponse {
        uint256 ticketId;
        Ticket ticket;
    }

    struct Scan {
        address agent;
        uint256 created_at;
    }

    Ticket[] public tickets;
    Scan[] public scans;

    mapping(address => bool) private _whitelist;
    mapping(uint256 => address) private _ticketToOwner;
    mapping(uint256 => uint256) private _scanToTicket;
    mapping(address => uint256) private _ownerTicketCount;

    uint32 private _expiration_seconds = 60 * 60 * 24; // one day
    uint256 private _createTicketFee = 0.001 ether;

    function createTicket(Category _category) external payable {
        require(msg.value == _createTicketFee);
        address payable sender = payable(msg.sender);
        sender.transfer(msg.value - _createTicketFee);
        uint256 expiration_date = block.timestamp + _expiration_seconds;
        // bytes32 randomBytes = keccak256(
        //     abi.encodePacked(msg.sender, block.timestamp)
        // );
        tickets.push(Ticket(_category, expiration_date, 0));
        uint256 id = tickets.length - 1;
        _ticketToOwner[id] = msg.sender;
        _ownerTicketCount[msg.sender]++;
        emit NewTicket(id, _category, expiration_date);
    }

    function scanTicket(uint32 _ticketId) external {
        require(
            _whitelist[msg.sender],
            "Only whitelisted agents can scan tickets"
        );

        Ticket storage ticket = tickets[_ticketId];

        require(ticket.expires_at > block.timestamp, "Ticket is expired");

        scans.push(Scan(msg.sender, block.timestamp));
        uint256 id = scans.length - 1;
        _scanToTicket[id] = _ticketId;
        ticket.validations++;
        emit TicketScanned(_ticketId, msg.sender, block.timestamp);
    }

    function getOwnedTickets() external view returns (TicketResponse[] memory) {
        TicketResponse[] memory ownedTickets = new TicketResponse[](
            _ownerTicketCount[msg.sender]
        );
        uint256 counter = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (_ticketToOwner[i] == msg.sender) {
                ownedTickets[counter] = TicketResponse(i, tickets[i]);
                counter++;
            }
        }
        return ownedTickets;
    }

    function getTicketScans(uint256 _ticketId)
        external
        view
        returns (uint256[] memory)
    {
        Ticket memory ticket = tickets[_ticketId];
        uint256[] memory ticketScans = new uint256[](ticket.validations);
        uint256 counter = 0;
        for (uint256 i = 0; i < scans.length; i++) {
            if (_scanToTicket[i] == _ticketId) {
                ticketScans[counter] = i;
                counter++;
            }
        }
        return ticketScans;
    }

    function changeExpirationSeconds(uint32 _seconds) external onlyOwner {
        _expiration_seconds = _seconds;
    }

    function changeCreateTicketFee(uint256 _TicketFee) external onlyOwner {
        _createTicketFee = _TicketFee;
    }

    function addAgentToWhitelist(address _address) external onlyOwner {
        _whitelist[_address] = true;
    }

    function isAgent(address _address) external view returns (bool) {
        return _whitelist[_address];
    }
}
