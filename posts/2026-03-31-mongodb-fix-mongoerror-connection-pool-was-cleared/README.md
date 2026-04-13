# How to Fix MongoError: Connection Pool Was Cleared in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection Pool, Error, Troubleshooting, Network

Description: Learn why the MongoDB connection pool is cleared and how to fix it by tuning pool settings, handling transient network errors, and configuring retryable writes.

---

## Understanding the Error

`MongoPoolClearedError: Connection pool for ... was cleared because another operation failed with: ...` means the driver detected a network error or server state change and invalidated all connections in the pool to prevent stale connections from being used.

```text
MongoPoolClearedError: Connection pool for localhost:27017 was cleared because
another operation failed with: MongoNetworkError: connection timed out
```

The pool clearing is a safety mechanism - it is the effect of another error, not the root cause itself.

## Step 1: Find the Root Cause

The pool is cleared in response to a triggering error. Look in your application logs for the error that preceded the pool clear:

- `MongoNetworkError: connection timed out` - network timeout
- `MongoNetworkError: socket hang up` - TCP connection dropped
- `MongoServerError: not primary` - primary failover in progress
- `MongoNetworkError: failed to connect` - server unreachable

Fix the root cause, and the pool clearing will stop.

## Step 2: Enable Retryable Writes and Reads

The driver can automatically retry once after a pool-clearing event if retryable writes are enabled (they are by default in drivers compatible with MongoDB 4.2+):

```javascript
const client = new MongoClient(uri, {
  retryWrites: true,
  retryReads: true
});
```

This transparently handles transient failures caused by primary elections or brief network hiccups.

## Step 3: Tune Connection Pool Settings

A pool that is too small may saturate under load, causing operations to time out and trigger a clear. Configure the pool to match your workload:

```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 50,       // max connections (default: 100)
  minPoolSize: 5,        // keep alive minimum connections
  maxIdleTimeMS: 30000,  // close connections idle for 30s
  waitQueueTimeoutMS: 10000 // fail if no connection available in 10s
});
```

## Step 4: Increase Socket and Connection Timeouts

For applications with slow queries or high-latency connections:

```javascript
const client = new MongoClient(uri, {
  connectTimeoutMS: 10000,  // time to establish connection
  socketTimeoutMS: 45000,   // time for a socket operation
  serverSelectionTimeoutMS: 30000
});
```

## Step 5: Handle the Error Gracefully

When pool clearing is unavoidable (e.g., during a primary election), implement retry logic:

```javascript
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const isTransient = err.name === 'MongoPoolClearedError' ||
                          err.message.includes('pool was cleared') ||
                          err.hasErrorLabel('RetryableWriteError');

      if (isTransient && attempt < maxRetries) {
        const delay = attempt * 500;
        console.warn(`Transient error, retrying in ${delay}ms...`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

// Usage
const result = await withRetry(() =>
  db.collection('orders').insertOne({ total: 99.99 })
);
```

## Step 6: Monitor Pool Events

```javascript
client.on('connectionPoolCleared', (event) => {
  console.error('Pool cleared:', event.address);
});

client.on('connectionCheckOutFailed', (event) => {
  console.error('Checkout failed:', event.reason);
});
```

## Summary

Connection pool clearing is a symptom, not a root cause. Identify the triggering error (network timeout, failover, server restart), enable retryable writes, tune pool size for your workload, and implement retry logic for transient failures. For replica sets, pool clearing during elections is normal and handled automatically with `retryWrites: true`.
