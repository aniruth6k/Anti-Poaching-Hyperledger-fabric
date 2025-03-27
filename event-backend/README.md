Ensure the Fabric network is running:
- docker ps

cd ~/fabric-samples/test-network
./network.sh down
./network.sh up -ca
./network.sh createChannel -c eventchannel
./network.sh deployCC -ccn eventtracker -ccp ../chaincode/eventtracker -ccl javascript -c eventchannel

cd ~/fabric-samples/event-backend
node server.js




List channels on the peer:
- docker exec -it peer0.org1.example.com peer channel list


curl -X POST http://localhost:3000/api/events -H "Content-Type: application/json" -d '{"eventId": "event_same_id", "eventType": "gun-shot", "description": "forst shooting detedcted", "location": "Test Location", "metadata": {"test": true, "purpose": "deduplication"}, "latitude": 35.6895, "longitude": 139.6917}'
