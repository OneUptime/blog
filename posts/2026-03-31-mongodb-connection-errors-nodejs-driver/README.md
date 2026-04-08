# How to Handle Connection Errors in the MongoDB Node.js Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Node.js, Error Handling, Connection, Driver

Description: Learn how to detect, handle, and recover from MongoDB connection errors in Node.js applications using the official driver's built-in retry and event APIs.

---

## Overview

MongoDB connection errors can occur during initial connect, mid-operation network failures, or server failovers. The Node.js driver provides built-in retry logic and topology events to help you build resilient applications.

## Common Connection Error Types

```text
MongoNetworkError      - Network-level failure (TCP reset, timeout)
MongoServerSelectionError - No suitable server found in the topology
MongoExpiredSessionError  - Session expired (replica set failover)
MongoNotConnectedError    - Operation attempted before connection
```

## Catching Errors on Connect

Wrap `client.connect()` in a try-catch and use a retry loop for startup resilience:

```javascript
const { MongoClient, MongoServerSelectionError } = require('mongodb');

async function connectWithRetry(uri, retries = 5, delayMs = 2000) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.connect();
      console.log('Connected to MongoDB');
      return client;
    } catch (err) {
      if (err instanceof MongoServerSelectionError) {
        console.warn(`Attempt ${attempt} failed: ${err.message}`);
        if (attempt < retries) await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Could not connect to MongoDB after retries');
}
```

## Listening to Topology Events

Monitor connection state changes with topology events:

```javascript
client.on('serverOpening', (event) => {
  console.log('Server opening:', event.address);
});

client.on('serverClosed', (event) => {
  console.log('Server closed:', event.address);
});

client.on('topologyOpening', () => console.log('Topology opened'));
client.on('topologyClosed', () => console.log('Topology closed'));
```

## Handling Errors During Operations

Network errors mid-operation should be caught at the operation level:

```javascript
const { MongoNetworkError } = require('mongodb');

async function safeFind(collection, filter) {
  try {
    return await collection.find(filter).toArray();
  } catch (err) {
    if (err instanceof MongoNetworkError) {
      console.error('Network error during find, retrying...');
      // implement retry or circuit breaker here
    }
    throw err;
  }
}
```

## Using retryWrites and retryReads

Enable automatic driver-level retry for eligible operations:

```javascript
const client = new MongoClient(uri, {
  retryWrites: true,   // retry write operations once on network error (default: true)
  retryReads: true     // retry read operations once on network error (default: true)
});
```

## Graceful Shutdown

Always close the client cleanly to flush the connection pool:

```javascript
process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed on app termination');
  process.exit(0);
});
```

## Summary

The MongoDB Node.js driver provides `MongoNetworkError` and `MongoServerSelectionError` for detecting connection failures, plus `retryWrites` and `retryReads` for automatic retries. Use topology events for observability, implement a retry loop at startup, and always close the client gracefully on shutdown to avoid connection leaks.
