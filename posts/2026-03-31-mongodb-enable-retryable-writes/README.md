# How to Enable Retryable Writes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write, Replica Set, Resilience, Driver

Description: Learn how to enable retryable writes in MongoDB to automatically retry write operations that fail due to transient network errors or primary failovers.

---

## What Are Retryable Writes?

Retryable writes is a MongoDB feature (available since 3.6) that automatically retries certain write operations exactly once when they fail due to transient errors - such as network interruptions, primary stepdowns during elections, or mongos connection drops. The retry is transparent to the application.

Without retryable writes, applications must implement their own retry logic for every write operation, which is error-prone and complex.

## Enabling Retryable Writes

Retryable writes are enabled by default in MongoDB 4.2-compatible drivers and later. To be explicit or to enable them on older driver versions:

In the connection string:

```text
mongodb://mongo1:27017,mongo2:27017,mongo3:27017/myapp?retryWrites=true&replicaSet=rs0
```

In the Node.js driver:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(
  "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0",
  { retryWrites: true }
);
```

In Python (pymongo):

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0",
    retryWrites=True
)
```

## Which Operations Are Retryable?

Not all write operations support retryable writes. Retryable operations include:

```text
Retryable                          Not Retryable
---------                          -------------
insertOne                          updateMany
insertMany                         deleteMany
updateOne                          mapReduce
replaceOne                         aggregate with $out or $merge
deleteOne
findOneAndUpdate
findOneAndDelete
findOneAndReplace
bulkWrite (single-document ops only)
```

Multi-document updates (`updateMany`) and deletes (`deleteMany`) are excluded because retrying them without idempotency could result in duplicating the effect. `bulkWrite` is retryable only when it contains single-document operations (e.g., `insertOne`, `updateOne`, `replaceOne`, `deleteOne`).

## How Retryable Writes Work

When a retryable write fails with a transient error:

1. The driver detects the error is transient (network error, `NotWritablePrimary`, `NotPrimaryOrSecondary`, etc.)
2. The driver waits for a new primary to be elected (using server monitoring)
3. The driver retries the operation **exactly once** against the new primary
4. If the second attempt also fails, the error is returned to the application

The driver uses a unique transaction ID attached to each write to ensure the operation is only applied once, even if the server received the first attempt before failing.

## Idempotency and the Transaction ID

MongoDB tracks each retryable write with a `lsid` (logical session ID) and `txnNumber`. If the server already applied the write but failed to respond, the retry is recognized as a duplicate and the server returns the original result without applying the write again:

```text
Client sends insertOne (lsid:abc, txn:1)
Server applies write
Server crashes before sending response
Client detects timeout (retryable error)
Client retries insertOne (lsid:abc, txn:1) against new primary
New primary sees (lsid:abc, txn:1) already in oplog
New primary returns original result (no duplicate insert)
```

## Disabling Retryable Writes

In rare cases you may want to disable them - for example, if your application performs writes inside loops that should not be retried:

```text
mongodb://mongo1:27017/myapp?retryWrites=false&replicaSet=rs0
```

Or in the Python driver constructor:

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0",
    retryWrites=False
)
```

Note: retryable writes can only be disabled at the client level, not per-collection.

## Requirements

Retryable writes require:

- A replica set or sharded cluster (not available on standalone)
- MongoDB 3.6+ server
- A driver that supports sessions (MongoDB 3.6+ compatible driver)
- `w: 1` or higher write concern (not `w: 0`)

## Error Types That Trigger a Retry

```text
Retryable Error Types
- Network timeout / socket closed
- NotWritablePrimary (primary stepped down)
- NotPrimaryOrSecondary
- PrimarySteppedDown
- ShutdownInProgress
- HostUnreachable / HostNotFound
- ConnectionReset
```

Non-transient errors (duplicate key, validation failure, etc.) are NOT retried.

## Monitoring Retries

Log retried writes for visibility:

```javascript
const client = new MongoClient(uri, {
  retryWrites: true,
  monitorCommands: true
});

client.on("commandFailed", (event) => {
  console.log(
    `Command failed: ${event.commandName} on ${event.address} - ${event.failure.message}`
  );
});

client.on("commandSucceeded", (event) => {
  console.log(`Command succeeded: ${event.commandName} on ${event.address}`);
});
```

## Summary

Retryable writes protect applications from transient write failures caused by network issues and primary elections by automatically retrying eligible operations exactly once. They are enabled by default in modern MongoDB drivers and require a replica set or sharded cluster. Use them in all production deployments to build resilient applications without complex custom retry logic. Verify that the operations you use are on the retryable list, and keep `w: 1` or higher write concern to ensure the retry mechanism functions correctly.
