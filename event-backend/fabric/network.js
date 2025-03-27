const { Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const { setupWallet } = require('./wallet');
require('dotenv').config();

async function getContract() {
    let gateway;
    try {
        console.log('Starting getContract...');

        // Log environment variables for debugging
        console.log('Network Connection Details:');
        console.log(`Connection Profile Path: ${process.env.CONNECTION_PROFILE_PATH}`);
        console.log(`Channel Name: ${process.env.CHANNEL_NAME}`);
        console.log(`Chaincode Name: ${process.env.CHAINCODE_NAME}`);

        // Validate required environment variables
        if (!process.env.CONNECTION_PROFILE_PATH) {
            throw new Error('CONNECTION_PROFILE_PATH is not defined in .env');
        }
        if (!process.env.CHANNEL_NAME) {
            throw new Error('CHANNEL_NAME is not defined in .env');
        }
        if (!process.env.CHAINCODE_NAME) {
            throw new Error('CHAINCODE_NAME is not defined in .env');
        }

        // Set up the wallet
        console.log('Setting up wallet...');
        const wallet = await setupWallet();
        console.log('Wallet setup complete:', wallet ? 'Wallet exists' : 'Wallet failed');

        // Create a gateway instance for interacting with the Fabric network
        gateway = new Gateway();

        // Resolve and validate connection profile path
        const connectionProfilePath = path.resolve(process.env.CONNECTION_PROFILE_PATH);
        console.log(`Resolved connection profile path: ${connectionProfilePath}`);

        // Check if connection profile file exists
        if (!fs.existsSync(connectionProfilePath)) {
            throw new Error(`Connection profile not found at: ${connectionProfilePath}`);
        }

        // Load connection profile
        let connectionProfile;
        try {
            connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
            console.log('Connection profile loaded successfully');
        } catch (parseError) {
            throw new Error(`Failed to parse connection profile: ${parseError.message}`);
        }

        // Validate connection profile
        if (!connectionProfile.channels) {
            throw new Error('Invalid connection profile: No channels defined');
        }

        // Connection options
        const connectionOptions = {
            wallet,
            identity: 'admin',
            discovery: { enabled: false } // Disabled discovery to bypass access denied error
        };
        console.log('Connection options:', connectionOptions);

        // Connect to the gateway
        try {
            await gateway.connect(connectionProfile, connectionOptions);
            console.log('Gateway connected successfully');
        } catch (connectError) {
            console.error('Gateway connection failed:', connectError);
            throw new Error(`Failed to connect to gateway: ${connectError.message}`);
        }

        // Access the channel
        let network;
        try {
            network = await gateway.getNetwork(process.env.CHANNEL_NAME);
            console.log(`Network accessed: ${process.env.CHANNEL_NAME}`);
        } catch (networkError) {
            console.error('Failed to get network:', networkError);
            throw new Error(`Unable to access channel ${process.env.CHANNEL_NAME}: ${networkError.message}`);
        }

        // Access the contract
        let contract;
        try {
            contract = network.getContract(process.env.CHAINCODE_NAME);
            console.log(`Contract accessed: ${process.env.CHAINCODE_NAME}`);
        } catch (contractError) {
            console.error('Failed to get contract:', contractError);
            throw new Error(`Unable to access chaincode ${process.env.CHAINCODE_NAME}: ${contractError.message}`);
        }

        // Return both the contract and gateway for proper disconnection later
        return { contract, gateway };
    } catch (error) {
        // Ensure gateway is disconnected in case of any error
        if (gateway) {
            try {
                gateway.disconnect();
                console.log('Gateway disconnected due to error');
            } catch (disconnectError) {
                console.error('Error during gateway disconnection:', disconnectError);
            }
        }

        // Log the full error for debugging
        console.error('Comprehensive Network Connection Error:', error);

        // Rethrow the error for upstream handling
        throw error;
    }
}

module.exports = { getContract };
