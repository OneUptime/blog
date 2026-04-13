# How to Handle Network Errors in MongoDB Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Error Handling, Network, Node.js, Resilience

Description: Learn how to detect, categorize, and recover from network errors in MongoDB applications using retryable writes, reconnect logic, and proper error handling.

---

## Types of Network Errors in MongoDB

MongoDB applications can encounter several classes of network errors:

- **Connection refused** - MongoDB is not reachable at the configured host/port
- **Network timeout** - A read or write exceeded the configured timeout
- **Socket closed** - The connection was dropped mid-operation
- **Transient network error** - A temporary blip that self-resolves

MongoDB drivers classify errors as retryable or non-retryable. Understanding this distinction lets you build appropriate recovery logic.

## Enabling Retryable Writes and Reads

MongoDB 3.6+ supports retryable writes, which the driver automatically retries once on network failures. Enable this in your connection string:

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017/mydb', {
  retryWrites: true,
  retryReads: true
});
```

Retryable writes cover single-statement operations like `insertOne`, `updateOne`, and `deleteOne`. Multi-document transactions are not covered by this setting.

## Catching and Classifying Network Errors

Use the driver's error hierarchy to handle errors appropriately:

```javascript
const { MongoNetworkError, MongoNetworkTimeoutError } = require('mongodb');

async function findWithRetry(collection, filter) {
  try {
    return await collection.findOne(filter);
  } catch (err) {
    if (err instanceof MongoNetworkTimeoutError) {
      console.error('Query timed out, retrying...', err.message);
      // implement backoff retry
    } else if (err instanceof MongoNetworkError) {
      console.error('Network error, checking connection...', err.message);
      // attempt reconnect
    } else {
      throw err;
    }
  }
}
```

## Implementing Exponential Backoff

For transient errors, retry with increasing delays to avoid overwhelming a recovering server:

```javascript
async function retryOperation(operation, maxRetries = 3) {
  let delay = 100;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const isRetryable = err instanceof MongoNetworkError ||
        err.hasErrorLabel('RetryableWriteError');
      if (!isRetryable || attempt === maxRetries) throw err;
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// Usage
const doc = await retryOperation(() => collection.findOne({ _id: someId }));
```

## Setting Connection and Socket Timeouts

Configure timeouts to avoid hanging indefinitely on network issues:

```javascript
const client = new MongoClient(uri, {
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000
});
```

- `connectTimeoutMS` - time to establish the initial connection
- `socketTimeoutMS` - time to wait for a send or receive on a socket before timing out
- `serverSelectionTimeoutMS` - how long the driver tries to find a suitable server

## Monitoring Connection Events

Listen to connection pool events to detect and log network issues:

```javascript
client.on('connectionClosed', (event) => {
  console.warn('Connection closed:', event.reason);
});

client.on('serverHeartbeatFailed', (event) => {
  console.error('Heartbeat failed for:', event.connectionId);
});
```

These events can feed into your monitoring system (such as OneUptime) to trigger alerts when connection health degrades.

## Summary

Handling network errors in MongoDB applications requires a combination of retryable writes, structured error classification, exponential backoff retries, and appropriate timeout configuration. Monitor connection pool events to detect degradation early and use external observability tools to correlate network error spikes with infrastructure changes.
