const TicketFactory = artifacts.require("TicketFactory");

module.exports = function(deployer) {
  deployer.deploy(TicketFactory, "Ticket factory")
    .then(() => console.log(TicketFactory.address));
  // Additional contracts can be deployed here
};