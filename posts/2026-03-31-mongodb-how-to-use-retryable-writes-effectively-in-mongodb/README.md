# How to Use Retryable Writes Effectively in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Retryable Write, Reliability, Failover, Driver

Description: Learn how MongoDB retryable writes work, when they protect against failures, and how to configure and verify them in your application.

---

## What Are Retryable Writes?

Retryable writes allow MongoDB drivers to automatically retry a write operation once if a transient network error or primary failover is detected. This prevents data loss and eliminates the need for manual retry logic in your application code for common failure scenarios.

Retryable writes use a server-side mechanism (lsid + txnNumber) to guarantee idempotency - the server can detect and ignore a duplicate retry.

## Enabling Retryable Writes

Retryable writes are enabled by default in MongoDB drivers 4.x and later. Verify your connection string:

```javascript
// Node.js - retryWrites=true is the default
const client = new MongoClient("mongodb://localhost:27017", {
  retryWrites: true  // default, can be omitted
})

// Explicit connection string parameter
const client = new MongoClient(
  "mongodb+srv://cluster.mongodb.net/mydb?retryWrites=true"
)
```

```python
# Python/PyMongo
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017", retryWrites=True)
# or via connection string
client = MongoClient("mongodb://localhost:27017/?retryWrites=true")
```

```java
// Java
MongoClientSettings settings = MongoClientSettings.builder()
    .retryWrites(true)
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .build();
MongoClient client = MongoClients.create(settings);
```

## What Retryable Writes Protect Against

Retryable writes handle these failure scenarios automatically:

```text
Scenario 1: Network blip during write
- Driver sends insert, network drops before ACK arrives
- Without retryable writes: application must decide if insert happened
- With retryable writes: driver retries, server deduplicates, returns success

Scenario 2: Primary election during write
- Driver sends update, primary steps down mid-operation
- New primary is elected
- Driver retries on new primary, succeeds

Scenario 3: Server restart during maintenance
- Writes during rolling restart are retried automatically
```

## Supported Operations

Not all write operations are retryable:

```javascript
// RETRYABLE: these are automatically retried
db.collection.insertOne()
db.collection.insertMany()
db.collection.updateOne()
db.collection.replaceOne()
db.collection.deleteOne()
db.collection.findOneAndUpdate()
db.collection.findOneAndReplace()
db.collection.findOneAndDelete()
db.collection.bulkWrite()         // individual retryable ops within

// NOT RETRYABLE: these require manual retry logic
db.collection.updateMany()
db.collection.deleteMany()
// Multi-document operations could partially apply and are not idempotent
```

## Verifying Retryable Writes Are Working

Enable MongoDB driver logging to see retry behavior:

```javascript
const { MongoClient } = require("mongodb")

const client = new MongoClient("mongodb://localhost:27017", {
  retryWrites: true,
  monitorCommands: true
})

client.on("commandStarted", event => {
  if (event.commandName === "insert") {
    // Check for lsid (session id) - required for retryable writes
    console.log("Session ID present:", !!event.command.lsid)
    // Check txnNumber - must be present for retryable ops
    console.log("txnNumber:", event.command.txnNumber)
  }
})
```

## Manual Retry for Non-Retryable Operations

For `updateMany` and `deleteMany`, implement manual idempotent retry logic:

```javascript
async function updateManyWithRetry(collection, filter, update, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await collection.updateMany(filter, update)
      return result
    } catch (err) {
      const isTransient = err.code === 91 || err.code === 189 ||
                          err.message.includes("not primary") ||
                          err.message.includes("network error")

      if (isTransient && attempt < maxRetries) {
        console.warn(`Attempt ${attempt} failed, retrying in ${attempt * 500}ms`)
        await new Promise(r => setTimeout(r, attempt * 500))
        continue
      }
      throw err
    }
  }
}
```

## Retryable Writes with Transactions

Inside a transaction, retryable writes use the transaction's session. The entire transaction (not individual operations) is retried:

```javascript
const session = client.startSession()

try {
  // withTransaction() automatically retries on TransientTransactionError
  await session.withTransaction(async () => {
    await ordersCollection.insertOne({ item: "abc", qty: 5 }, { session })
    await inventoryCollection.updateOne(
      { item: "abc" },
      { $inc: { qty: -5 } },
      { session }
    )
  })
} finally {
  await session.endSession()
}
```

## Disabling Retryable Writes

Sometimes you may want to disable retryable writes - for example, during debugging or when using a custom retry framework:

```javascript
const client = new MongoClient("mongodb://localhost:27017", {
  retryWrites: false
})
```

## Summary

Retryable writes in MongoDB automatically re-issue certain write operations once after transient failures like network interruptions or primary elections, using server-side session tracking to prevent duplicate writes. They are enabled by default in modern drivers and protect `insertOne`, `updateOne`, `deleteOne`, and similar single-document operations. For multi-document operations like `updateMany`, implement your own idempotent retry logic.
