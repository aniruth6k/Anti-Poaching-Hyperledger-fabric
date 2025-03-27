const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupWallet() {
    try {
        // Create a new wallet for identity storage
        const walletPath = path.resolve(process.env.WALLET_PATH);
        console.log(`Initializing wallet at path: ${walletPath}`);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet initialized successfully at: ${walletPath}`);

        // Check if admin identity exists in the wallet
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('An identity for the admin user already exists in the wallet');
            return wallet;
        }

        console.log('Admin identity not found, enrolling new admin...');

        // Load the org1 admin credentials
        const credPath = path.resolve(__dirname, '..', '..', 'test-network', 
            'organizations', 'peerOrganizations', 'org1.example.com', 'users', 
            'Admin@org1.example.com', 'msp');
        console.log(`Loading admin credentials from: ${credPath}`);

        // Verify the credential path exists
        if (!fs.existsSync(credPath)) {
            throw new Error(`Credential path does not exist: ${credPath}`);
        }

        const signcertsPath = path.join(credPath, 'signcerts');
        const keystorePath = path.join(credPath, 'keystore');

        console.log(`Signcerts path: ${signcertsPath}`);
        console.log(`Keystore path: ${keystorePath}`);

        if (!fs.existsSync(signcertsPath) || !fs.existsSync(keystorePath)) {
            throw new Error(`Signcerts or keystore directory missing in: ${credPath}`);
        }

        const certFiles = fs.readdirSync(signcertsPath);
        const keyFiles = fs.readdirSync(keystorePath);

        if (certFiles.length === 0 || keyFiles.length === 0) {
            throw new Error('No certificate or key files found in signcerts or keystore directories');
        }

        const cert = fs.readFileSync(path.join(signcertsPath, certFiles[0])).toString();
        const key = fs.readFileSync(path.join(keystorePath, keyFiles[0])).toString();

        console.log('Admin certificate loaded successfully');
        console.log('Admin private key loaded successfully');

        // Create the admin identity
        const adminIdentity = {
            credentials: {
                certificate: cert,
                privateKey: key,
            },
            mspId: process.env.ORG_MSP,
            type: 'X.509',
        };
        console.log(`Admin identity created with MSP ID: ${process.env.ORG_MSP}`);

        // Import the admin identity to the wallet
        await wallet.put('admin', adminIdentity);
        console.log('Successfully enrolled admin user and imported it into the wallet');

        return wallet;
    } catch (error) {
        console.error(`Failed to import admin identity: ${error.message}`);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

module.exports = { setupWallet };
