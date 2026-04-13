# How to Handle Transient Errors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Error Handling, Retry, Resilience, Node.js

Description: Learn how to identify and handle transient MongoDB errors using retry logic, exponential backoff, and retryable writes to build resilient applications.

---

## What Are Transient Errors in MongoDB

Transient errors are temporary failures that are expected to resolve without any code change - network hiccups, primary elections, connection pool exhaustion during traffic spikes, and cursor timeouts on slow queries. They differ from persistent errors (authentication failures, schema validation errors) which require code or configuration changes to fix.

MongoDB 3.6+ introduced retryable writes, and MongoDB 4.2+ added retryable reads, which handle some transient failures automatically, but application-level retry logic is still needed for others.

## Enabling MongoDB's Built-In Retryable Writes

The MongoDB driver retries single write operations once on a network error if `retryWrites=true`. Enable this in your connection string:

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI, {
  retryWrites: true,
  retryReads: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000
});
```

Retryable writes cover `insertOne`, `insertMany`, `updateOne`, `deleteOne`, `findOneAndUpdate`, and `findOneAndDelete`. Multi-document transactions are not automatically retried.

## Identifying Transient vs Persistent Errors

```javascript
const { MongoError, MongoNetworkError, MongoServerError } = require('mongodb');

function isTransient(error) {
  // Network-level errors are always transient
  if (error instanceof MongoNetworkError) return true;

  // Check MongoDB error codes for known transient conditions
  const transientCodes = new Set([
    6,      // HostUnreachable
    7,      // HostNotFound
    89,     // NetworkTimeout
    91,     // ShutdownInProgress
    189,    // PrimarySteppedDown
    216,    // ElectionInProgress
    262,    // ExceededTimeLimit
    9001,   // SocketException
    10107,  // NotWritablePrimary
    11600,  // InterruptedAtShutdown
    11602,  // InterruptedDueToReplStateChange
    13435,  // NotPrimaryNoSecondaryOk
    13436,  // NotPrimaryOrSecondary
    16500,  // RateLimitExceeded (Atlas)
  ]);

  return error.code !== undefined && transientCodes.has(error.code);
}
```

## Retry with Exponential Backoff

Implement a generic retry wrapper for MongoDB operations:

```javascript
async function withRetry(operation, options = {}) {
  const {
    maxAttempts = 5,
    baseDelayMs = 100,
    maxDelayMs = 30000,
    jitterFactor = 0.2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      if (!isTransient(err) || attempt === maxAttempts) {
        throw err;
      }

      // Exponential backoff with jitter
      const exponentialDelay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs
      );
      const jitter = exponentialDelay * jitterFactor * Math.random();
      const delay = exponentialDelay + jitter;

      console.warn(
        `MongoDB transient error (attempt ${attempt}/${maxAttempts}): ${err.message}. Retrying in ${Math.round(delay)}ms`
      );

      onRetry?.({ attempt, error: err, delay });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
const user = await withRetry(
  () => db.collection('users').findOne({ email: 'alice@example.com' }),
  { maxAttempts: 5, baseDelayMs: 200 }
);
```

## Handling Write Concern Errors

Write concern errors indicate the write did not replicate to the required number of nodes but may have been applied to the primary. Always check before retrying:

```javascript
async function safeUpsert(collection, filter, update, idempotencyKey) {
  return await withRetry(async () => {
    return await collection.findOneAndUpdate(
      { ...filter, idempotencyKey },  // idempotency prevents double-write
      {
        $set: { ...update, idempotencyKey },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, returnDocument: 'after' }
    );
  });
}
```

## Transaction Retry Pattern

MongoDB transactions require explicit retry at the transaction level:

```javascript
async function withTransactionRetry(session, txnFunc, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await session.withTransaction(txnFunc);
    } catch (err) {
      if (err.hasErrorLabel('TransientTransactionError') && i < maxRetries - 1) {
        console.warn(`Transient transaction error, retrying (${i + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, 100 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}
```

## Summary

Transient MongoDB errors are temporary failures that include network issues, primary elections, and connection pool saturation. Enable `retryWrites: true` in your connection string for automatic single-write retries, classify errors as transient using MongoDB error codes, and wrap operations with exponential backoff retry logic. For transactions, check the `TransientTransactionError` label and retry the entire transaction. Use idempotent write patterns to safely retry writes without duplicating data.
