import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Card, ListGroup, ListGroupItem } from 'react-bootstrap';
import Web3 from 'web3';
import TicketFactoryAbi from './utils/TicketFactory.json';
import 'bootstrap/dist/css/bootstrap.min.css';

const TicketFactoryAddress = "0x076ca6Ec2BbfF3F0119AF1208DaF64Ad28184768";

const TICKET_CATEGORIES = [
  "VISITEUR",
  "AGENT",
  "DELEGATION",
  "AUTRES"
]

export default function App() {
  const [ticketFactory, setTicketFactory] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [web3, setWeb3] = useState(null);
  const [isAgent, setIsAgent] = useState(false);

  const buyTicket = () => {
    web3.eth.getAccounts().then((accounts) => {
      ticketFactory.methods.createTicket(isAgent ? 1 : 0)
        .send({ from: accounts[0], value: web3.utils.toWei("0.001", "ether"), gas: 3000000 })
    })
  }

  const becomeAgent = () => {
    web3.eth.getAccounts().then((accounts) => {
      ticketFactory.methods.addAgentToWhitelist(accounts[0])
        .send({ from: accounts[0], gas: 3000000 }).then(() => {
          web3.eth.getAccounts().then((accounts) => {
            ticketFactory.methods.isAgent(accounts[0])
              .call().then((_isAgent) => {
                setIsAgent(_isAgent);
              })
          })
        })
    })
  }

  const scanTicket = (ticketId) => {
    web3.eth.getAccounts().then((accounts) => {
      ticketFactory.methods.scanTicket(ticketId)
        .send({ from: accounts[0], gas: 3000000 })
        .catch((error) => {
          console.error(error.message)
        })
    })
  }

  useEffect(() => {
    let web3Inst = new Web3("ws://127.0.0.1:8545");
    setWeb3(web3Inst);

    let ticketFactoryContract = new web3Inst.eth.Contract(TicketFactoryAbi.abi, TicketFactoryAddress);

    ticketFactoryContract.methods.getOwnedTickets().call().then(setTickets);

    setTicketFactory(ticketFactoryContract);

    ticketFactoryContract.events.NewTicket()
    .on("data", function(event) {
      let ticket = event.returnValues;
      console.log("A new ticket was created!", ticket.ticketId, ticket.category, ticket.expires_at);
      ticketFactoryContract.methods.getOwnedTickets().call().then(setTickets);
    }).on("error", console.error);

    ticketFactoryContract.events.TicketScanned()
    .on("data", function(event) {
      ticketFactoryContract.methods.getOwnedTickets().call().then(setTickets);
    }).on("error", console.error);

    web3Inst.eth.getAccounts().then((accounts) => {
      ticketFactoryContract.methods.isAgent(accounts[0])
        .call().then((_isAgent) => {
          setIsAgent(_isAgent);
        })
    })
  }, []);

  return (
    <View style={styles.container}>
      {!isAgent
        ? <Button
        onPress={becomeAgent}
        title={"Become Agent"}
        />
        : <Text>You're actually an agent</Text>
      }
      <Text>You have {tickets.length} Tickets</Text>
      <Button
        onPress={buyTicket}
        title={"Buy a ticket !"}
      />
      {tickets.map((ticketResponse, key) => (
          <Card key={key} style={{ margin: "10px" }}>
            <Card.Header><Card.Title>#{ticketResponse.ticketId}</Card.Title></Card.Header>
            <Card.Body>
              <ListGroup>
                <ListGroupItem>Category: {TICKET_CATEGORIES[ticketResponse.ticket.category]}</ListGroupItem>
                <ListGroupItem>Expires at: {ticketResponse.ticket.expires_at}</ListGroupItem>
                <ListGroupItem>Validations: {ticketResponse.ticket.validations}</ListGroupItem>
              </ListGroup>
            </Card.Body>
            {isAgent && <Card.Footer>
              <Button
                onPress={() => scanTicket(ticketResponse.ticketId)}
                title={"Scan the ticket !"}
              />
            </Card.Footer>}
          </Card>
        )
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
