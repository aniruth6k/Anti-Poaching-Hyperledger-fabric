'use strict';

const { Contract } = require('fabric-contract-api');

class EventTracker extends Contract {
    // Initialize the chaincode
    async InitLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('Chaincode initialized');
        console.info('============= END : Initialize Ledger ===========');
        return 'Chaincode initialized successfully';
    }

    // Record a new event
    async recordEvent(ctx, eventId, eventType, timestamp, description, metadata) {
        console.info('============= START : Record Event ===========');
        
        // Create event object
        const event = {
            eventId,
            eventType,
            timestamp,
            description,
            metadata: JSON.parse(metadata),
            docType: 'event'
        };
        
        // Store event in state database
        await ctx.stub.putState(eventId, Buffer.from(JSON.stringify(event)));
        
        // Emit an event to notify listeners
        await ctx.stub.setEvent('EventRecorded', Buffer.from(JSON.stringify({
            eventId,
            eventType,
            timestamp
        })));
        
        console.info('============= END : Record Event ===========');
        return JSON.stringify(event);
    }

    // Get event by ID
    async getEvent(ctx, eventId) {
        console.info('============= START : Get Event ===========');
        const eventAsBytes = await ctx.stub.getState(eventId);
        
        if (!eventAsBytes || eventAsBytes.length === 0) {
            throw new Error(`Event ${eventId} does not exist`);
        }
        
        console.info('============= END : Get Event ===========');
        return eventAsBytes.toString();
    }

    // Query events by type
    async queryEventsByType(ctx, eventType) {
        console.info('============= START : Query Events By Type ===========');
        
        const queryString = {
            selector: {
                docType: 'event',
                eventType: eventType
            }
        };
        
        const queryResults = await this.getQueryResults(ctx, JSON.stringify(queryString));
        console.info('============= END : Query Events By Type ===========');
        return queryResults;
    }

    // Helper function to get query results
    async getQueryResults(ctx, queryString) {
        let resultsIterator = await ctx.stub.getQueryResult(queryString);
        let results = [];
        
        let result = await resultsIterator.next();
        while (!result.done) {
            let resultItem = {};
            
            resultItem.Key = result.value.key;
            resultItem.Record = JSON.parse(result.value.value.toString('utf8'));
            results.push(resultItem);
            
            result = await resultsIterator.next();
        }
        
        await resultsIterator.close();
        return JSON.stringify(results);
    }
}

module.exports = EventTracker;
