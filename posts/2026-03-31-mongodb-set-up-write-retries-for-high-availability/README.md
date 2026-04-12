# How to Set Up Write Retries for High Availability in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, High Availability, Retry, Write Concern, Resilience

Description: Learn how to configure retryable writes, write concern, and custom retry logic in MongoDB to ensure high availability during failovers and transient errors.

---

Write retries in MongoDB allow your application to automatically recover from transient errors such as primary failovers, network interruptions, and server restarts. Configuring retryable writes correctly at the driver level - combined with appropriate write concern - prevents data loss while keeping your application resilient.

## Enable Retryable Writes in the Connection String

The simplest way to enable retryable writes is via the connection string. This applies to all write operations that use the client.

```text
mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0&retryWrites=true
```

Or via the client options object:

```javascript
const { MongoClient } = require("mongodb");
const client = new MongoClient(uri, {
  retryWrites: true
});
await client.connect();
```

Retryable writes are enabled by default in official MongoDB drivers compatible with MongoDB 4.2 and above.

## Understand What Operations Are Retryable

Not all write operations support automatic retry. The following are retryable:

```text
insertOne, insertMany (unordered)
updateOne, replaceOne
deleteOne
findOneAndUpdate, findOneAndReplace, findOneAndDelete
bulkWrite (with retryable individual ops)
```

Operations that are NOT automatically retried:
- `insertMany` in ordered mode (after a partial insert)
- Multi-document transactions (require manual retry)
- `updateMany`, `deleteMany`

## Set Write Concern for Safe Acknowledged Writes

Combine retryable writes with majority write concern to ensure each retried write is safely committed before acknowledgment.

```javascript
const db = client.db("myapp");
const users = db.collection("users", {
  writeConcern: { w: "majority", wtimeoutMS: 5000 }
});

await users.insertOne({ name: "Alice", createdAt: new Date() });
```

With `w: "majority"`, MongoDB waits until the write is replicated to a majority of voting members before returning success.

## Implement Manual Retry for Non-Retryable Operations

For `updateMany`, `deleteMany`, or ordered `insertMany`, implement manual retry logic with exponential backoff.

```javascript
async function writeWithRetry(operation, maxAttempts = 3) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (err) {
      const isTransient =
        err.code === 91 ||      // ShutdownInProgress
        err.code === 189 ||     // PrimarySteppedDown
        err.code === 10107 ||   // NotWritablePrimary
        err.message?.includes("not primary") ||
        err.message?.includes("not master");

      if (isTransient && attempt < maxAttempts - 1) {
        const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        continue;
      }
      throw err;
    }
  }
}

// Usage
await writeWithRetry(() =>
  db.collection("orders").updateMany(
    { status: "pending" },
    { $set: { processedAt: new Date() } }
  )
);
```

## Use Idempotent Operations to Prevent Duplicate Data

When retrying writes, ensure your operations are idempotent - running the same operation twice produces the same result.

```javascript
// Use $set instead of $inc for idempotent updates
await db.collection("users").updateOne(
  { _id: userId },
  {
    $set: { lastLoginAt: new Date(), status: "active" }
    // Do NOT use $inc: { loginCount: 1 } - this would double-count on retry
  }
);
```

For inserts, use a natural unique ID or an idempotency key to prevent duplicate documents.

```javascript
await db.collection("events").updateOne(
  { idempotencyKey: "evt-abc-123" },
  { $setOnInsert: { payload: eventData, createdAt: new Date() } },
  { upsert: true }
);
```

## Summary

Setting up write retries for high availability in MongoDB involves enabling `retryWrites: true` in the driver, using `w: "majority"` write concern to ensure acknowledged writes are durable, and implementing manual retry loops with exponential backoff for non-retryable operations. Always design write operations to be idempotent so that retries do not produce duplicate or inconsistent data.
