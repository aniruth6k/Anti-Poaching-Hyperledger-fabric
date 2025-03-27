const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { getContract } = require('./fabric/network');
require('dotenv').config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// POST /api/events - Record an event
app.post('/api/events', async (req, res) => {
    const { eventId, eventType, description, location, metadata, latitude, longitude } = req.body;

    try {
        // Connect to the Fabric network
        const { contract, gateway } = await getContract();

        // Submit transaction to blockchain
        const result = await contract.submitTransaction(
            'recordEvent',
            eventId,
            eventType,
            description,
            location,
            JSON.stringify(metadata || {})
        );

        const blockchainResponse = JSON.parse(result.toString());
        const txId = blockchainResponse.txId || `tx_${Date.now()}`;

        // Check if an event with this transaction ID already exists
        const { data: existingData, error: existingError } = await supabase
            .from('events')
            .select('id')
            .eq('blockchain_tx_id', txId)
            .maybeSingle();

        if (existingError) {
            gateway.disconnect();
            console.error('Supabase duplicate check error:', existingError);
            return res.status(500).json({
                error: 'Failed to check database for duplicates',
                details: existingError.message
            });
        }

        if (existingData) {
            gateway.disconnect();
            return res.status(200).json({
                message: 'Event already recorded',
                blockchain: blockchainResponse,
                database: existingData
            });
        }

        // Insert into Supabase
        const { data, error } = await supabase
            .from('events')
            .insert({
                event_type: eventType,
                latitude: parseFloat(latitude) || null,
                longitude: parseFloat(longitude) || null,
                blockchain_tx_id: txId
            })
            .select();

        gateway.disconnect();

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({
                error: 'Failed to store event in database',
                details: error.message,
                code: error.code
            });
        }

        res.status(201).json({
            message: 'Event recorded successfully',
            blockchain: blockchainResponse,
            database: data
        });

    } catch (error) {
        console.error('Error recording event:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/events/type/:eventType - Query events by type
app.get('/api/events/type/:eventType', async (req, res) => {
    const { eventType } = req.params;

    try {
        const { contract, gateway } = await getContract();

        const result = await contract.evaluateTransaction('queryEventsByType', eventType);
        const blockchainEvents = JSON.parse(result.toString());

        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('event_type', eventType);

        gateway.disconnect();

        if (error) {
            console.error('Supabase query error:', error);
            return res.status(500).json({ error: 'Failed to query events from database' });
        }

        res.status(200).json({
            blockchain: blockchainEvents,
            database: data
        });
    } catch (error) {
        console.error('Error querying events:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/events/coordinates - Fetch all coordinates from Supabase
app.get('/api/events/coordinates', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('event_type, latitude, longitude');

        if (error) {
            console.error('Supabase query error:', error);
            return res.status(500).json({ error: 'Failed to query coordinates from database' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error getting coordinates:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/supabase-status - Diagnostic endpoint
app.get('/api/supabase-status', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .limit(5);

        if (error) {
            return res.status(500).json({
                status: 'error',
                message: 'Supabase connection failed',
                error
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Supabase connection successful',
            recordCount: data.length,
            data
        });
    } catch (e) {
        res.status(500).json({
            status: 'error',
            message: 'Server error',
            error: e.message
        });
    }
});

// POST /api/test-supabase - Simple Supabase insert test
app.post('/api/test-supabase', async (req, res) => {
    try {
        const testId = "test_tx_" + Date.now();

        const { data: existingData, error: checkError } = await supabase
            .from('events')
            .select('id')
            .eq('blockchain_tx_id', testId)
            .limit(1);

        if (checkError) {
            return res.status(500).json({
                error: 'Failed to check for duplicates',
                details: checkError
            });
        }

        if (!existingData || existingData.length === 0) {
            const { data, error } = await supabase
                .from('events')
                .insert({
                    event_type: "test",
                    latitude: 10.0,
                    longitude: 20.0,
                    blockchain_tx_id: testId
                })
                .select();

            if (error) {
                console.error('Supabase test error:', error);
                return res.status(500).json({
                    error: 'Supabase test failed',
                    details: error
                });
            }

            res.status(200).json({
                message: 'Supabase test successful',
                data
            });
        } else {
            res.status(200).json({
                message: 'Duplicate detected (this should not happen for a timestamp-based ID)',
                duplicate: true
            });
        }
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Supabase URL: ${supabaseUrl ? 'Configured' : 'Missing'}`);
    console.log(`Supabase Key: ${supabaseKey ? 'Configured' : 'Missing'}`);
});
