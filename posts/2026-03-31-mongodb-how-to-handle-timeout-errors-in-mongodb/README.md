# How to Handle Timeout Errors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Timeout, Error Handling, Performance, Connection Pooling

Description: Learn how to configure and handle MongoDB timeout errors including connection timeouts, socket timeouts, and operation maxTimeMS to build resilient applications.

---

## Types of MongoDB Timeouts

MongoDB has several distinct timeout settings, each covering a different phase of the operation lifecycle:

| Timeout | Covers | Default |
|---|---|---|
| `connectTimeoutMS` | Time to establish a TCP connection | 30000ms |
| `socketTimeoutMS` | Time waiting for a response on an open socket | 0 (no limit) |
| `serverSelectionTimeoutMS` | Time to select a suitable server | 30000ms |
| `waitQueueTimeoutMS` | Time to wait for a connection from the pool | Not set |
| `maxTimeMS` | Maximum execution time for a single operation | Not set |

## Setting Timeouts in Connection String

```javascript
const uri = "mongodb://localhost:27017/mydb" +
  "?connectTimeoutMS=5000" +
  "&socketTimeoutMS=10000" +
  "&serverSelectionTimeoutMS=5000";
```

In the MongoClient options:

```javascript
const client = new MongoClient("mongodb://localhost:27017", {
  connectTimeoutMS: 5000,
  socketTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000
});
```

## Using maxTimeMS for Query Timeouts

`maxTimeMS` limits how long a single operation may run on the server. This is the most useful timeout for preventing runaway queries:

```javascript
// Find with 2 second limit
const results = await db.collection("products").find(
  { category: "electronics" },
  { maxTimeMS: 2000 }
).toArray();
```

Aggregation with timeout:

```javascript
const results = await db.collection("orders").aggregate(
  [
    { $match: { status: "completed" } },
    { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
    { $limit: 100 }
  ],
  { maxTimeMS: 5000 }
).toArray();
```

## Catching Timeout Errors in Node.js

```javascript
const { MongoClient, MongoServerError } = require("mongodb");

async function safeQuery(collection, filter, options = {}) {
  try {
    return await collection.find(filter, {
      maxTimeMS: 3000,
      ...options
    }).toArray();
  } catch (err) {
    if (err.code === 50) {
      // MaxTimeMSExpired
      console.error("Query exceeded time limit:", err.message);
      return { error: "query_timeout", message: "Operation timed out" };
    }
    if (err.name === "MongoServerSelectionError") {
      console.error("Cannot reach MongoDB server:", err.message);
      return { error: "connection_failed", message: "Database unavailable" };
    }
    throw err;
  }
}
```

Common error codes:
- `50` - `MaxTimeMSExpired` (maxTimeMS exceeded)
- `89` - Network timeout
- `91` - Interrupted at shutdown
- Server selection errors indicate cluster connectivity issues

## Catching Timeout Errors in Python

```python
from pymongo import MongoClient
from pymongo.errors import ExecutionTimeout, ServerSelectionTimeoutError, NetworkTimeout

client = MongoClient(
    "mongodb://localhost:27017",
    serverSelectionTimeoutMS=5000,
    socketTimeoutMS=10000
)
db = client["mydb"]

def safe_query(collection_name, filter_doc):
    try:
        return list(db[collection_name].find(filter_doc, max_time_ms=3000))
    except ExecutionTimeout:
        print("Query timed out (maxTimeMS)")
        return []
    except ServerSelectionTimeoutError as e:
        print(f"Cannot select server: {e}")
        return []
    except NetworkTimeout as e:
        print(f"Network timeout: {e}")
        return []
```

## Setting a Default maxTimeMS for All Operations

In Node.js with the driver:

```javascript
// Override the cursor's default maxTimeMS via a utility wrapper
function timedCollection(db, name, defaultMaxTimeMS = 5000) {
  const coll = db.collection(name);
  return {
    find: (filter, opts) => coll.find(filter, { maxTimeMS: defaultMaxTimeMS, ...opts }),
    findOne: (filter, opts) => coll.findOne(filter, { maxTimeMS: defaultMaxTimeMS, ...opts }),
    aggregate: (pipeline, opts) => coll.aggregate(pipeline, { maxTimeMS: defaultMaxTimeMS, ...opts }),
    // ...other methods
    raw: coll
  };
}
```

## Distinguishing Client vs Server Timeouts

Client-side timeouts (`connectTimeoutMS`, `socketTimeoutMS`) are enforced by the driver, not the server. `connectTimeoutMS` fires during the initial TCP handshake before any operation is sent. `socketTimeoutMS` fires while waiting for a response on an established connection—the operation has already reached the server, which may still be executing it in the background.

Server-side timeouts (`maxTimeMS`) are enforced by MongoDB and abort the operation on the server.

For long-running operations where you want guaranteed server-side termination, always set `maxTimeMS` in addition to client-side timeouts.

## Retrying After Timeout

Only retry operations that are idempotent (reads, upserts) or inside a transaction:

```javascript
async function withRetry(fn, maxAttempts = 3, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = err.code === 50 || err.name === "MongoServerSelectionError";
      if (isRetryable && i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}
```

## Summary

MongoDB timeout errors are categorized into connection/selection timeouts (client-side configuration) and operation timeouts (`maxTimeMS`, server-side enforcement). Always set `maxTimeMS` on queries that touch large collections to prevent runaway operations. Catch error code 50 for `MaxTimeMSExpired` and `MongoServerSelectionError` for connectivity failures, and implement retry logic only for idempotent operations with backoff.
