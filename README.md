# 🦌 Anti-Poaching System using Hyperledger Fabric

This project demonstrates a basic anti-poaching event tracking system built on **Hyperledger Fabric**, featuring:

- A blockchain network that stores anti-poaching event data
- A simple Express.js backend to interact with the blockchain
- Dockerized Fabric setup for easy local deployment
- Support for duplicate event detection

---

## 🚀 Getting Started

### Prerequisites

Ensure the following are installed:

- Docker & Docker Compose
- Node.js (v14+ recommended)
- Hyperledger Fabric Samples and Binaries
- cURL

---

## 🧠 Project Structure

```bash
hyperledger-fabric-event-storing/
├── chaincode/               # Smart contract in JavaScript
├── fabric-samples/          # Hyperledger Fabric sample network
└── event-backend/           # Node.js backend server
```

---

## ⚙️ Running the Fabric Network

Make sure Docker is running before starting.

```bash
# Check running containers (optional)
docker ps

# Navigate to test-network directory
cd ~/fabric-samples/test-network

# Tear down previous network (optional)
./network.sh down

# Bring up the network with Certificate Authorities (CA)
./network.sh up -ca

# Create a new channel named 'eventchannel'
./network.sh createChannel -c eventchannel

# Deploy the chaincode (smart contract)
./network.sh deployCC -ccn eventtracker -ccp ../chaincode/eventtracker -ccl javascript -c eventchannel
```

---

## 🖥️ Starting the Backend Server

```bash
cd ~/fabric-samples/event-backend
node server.js
```

Your API server should now be running at `http://localhost:3000`.

---

## 🔁 Interact with the API

You can now send events to the backend, which will store them on the blockchain.

### Sample `POST` Request

```bash
curl -X POST http://localhost:3000/api/events \
-H "Content-Type: application/json" \
-d '{
  "eventId": "event_same_id",
  "eventType": "gun-shot",
  "description": "Forest shooting detected",
  "location": "Test Location",
  "metadata": {
    "test": true,
    "purpose": "deduplication"
  },
  "latitude": 35.6895,
  "longitude": 139.6917
}'
```

---

## 📡 Verifying Channels

To list the available channels on the peer:

```bash
docker exec -it peer0.org1.example.com peer channel list
```

---

## 🛠️ Chaincode Overview

The `eventtracker` chaincode handles:

- Adding new events
- Preventing duplicate entries based on `eventId`
- Storing metadata, location, and event details immutably

You can find the chaincode in:  
`~/fabric-samples/chaincode/eventtracker/`

---

## 📌 Notes

- Ensure you're using the correct paths and have permissions for `fabric-samples`
- This project uses a basic JavaScript chaincode for demonstration. You can extend it to support queries, access control, or event indexing.
- Duplicate detection is based on `eventId`. You should ensure that every event has a unique identifier unless testing duplication logic.
