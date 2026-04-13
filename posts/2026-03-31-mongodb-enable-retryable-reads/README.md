# How to Enable Retryable Reads in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Retryable Read, Driver, Resilience, Connection

Description: Learn how to enable retryable reads in MongoDB to automatically retry read operations on transient network errors, improving application resilience.

---

## What Are Retryable Reads?

Retryable reads allow MongoDB drivers to automatically retry certain read operations when they encounter transient errors such as network hiccups, primary elections, or brief connection drops. Introduced with MongoDB 4.2-compatible drivers and enabled by default, retryable reads reduce the need for manual error handling in read-heavy workloads.

## Enabling Retryable Reads in the Connection String

The simplest way to enable retryable reads is via the connection string using the `retryReads` parameter:

```text
mongodb://user:password@host:27017/mydb?retryReads=true
```

By default, modern drivers (Mongo Node.js 3.3+, PyMongo 3.9+, Java 3.11+) already set `retryReads=true`. You can explicitly disable it with `retryReads=false` if needed.

## Enabling in Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017', {
  retryReads: true,
});

async function run() {
  await client.connect();
  const db = client.db('shop');
  const collection = db.collection('products');

  // This read will be retried once if a retryable error occurs
  const product = await collection.findOne({ sku: 'ABC123' });
  console.log(product);

  await client.close();
}

run();
```

## Enabling in PyMongo

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    retryReads=True
)

db = client["shop"]
collection = db["products"]

# Retryable read - automatically retried on transient errors
product = collection.find_one({"sku": "ABC123"})
print(product)
```

## Which Errors Are Retryable?

MongoDB drivers retry reads only on specific error categories:

```text
- Network errors (connection reset, timeout during handshake)
- NotWritablePrimary errors during primary elections
- Node shutdown or state change errors (ShutdownInProgress, InterruptedAtShutdown, InterruptedDueToReplStateChange)
- ExceededTimeLimit (only in some driver versions)
```

Errors such as command failures (`OperationFailed`) or `CursorNotFound` are NOT retried automatically.

## When Retryable Reads Help

Retryable reads are most effective in replica set deployments where primaries can step down during elections. Without retryable reads, a brief election can cause a wave of read errors. With retryable reads enabled, the driver waits briefly and retries the operation against the new primary or a secondary.

```javascript
// Without retryable reads - this may fail during an election
const doc1 = await collection.findOne({ _id: userId });

// With retryable reads - transparently retried once
const doc2 = await collection.findOne({ _id: userId });
// No code change needed - behavior controlled by client config
```

## Checking Driver Support

Not all operations are retryable. Supported operations include `find`, `aggregate` (without `$out` or `$merge`), `distinct`, `count`, `countDocuments`, `estimatedDocumentCount`, `listCollections`, `listDatabases`, and `listIndexes`. Getmore operations on cursors are not retried.

```javascript
// Check MongoDB driver version in package.json
// "mongodb": "^5.0.0" - retryReads=true by default

const client = new MongoClient(uri, {
  retryReads: true,
  serverSelectionTimeoutMS: 5000, // max time to select a server
});
```

## Summary

Retryable reads are a low-cost resilience feature that should be enabled in all production MongoDB deployments. Modern drivers enable it by default, but you can explicitly configure it via the connection string or driver options. It protects against transient network errors and replica set elections without requiring any application-level retry logic.
