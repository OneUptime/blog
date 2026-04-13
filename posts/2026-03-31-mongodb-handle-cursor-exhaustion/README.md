# How to Handle Cursor Exhaustion in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, Error Handling, Driver, Connection

Description: Learn how to detect and handle cursor exhaustion in MongoDB, including CursorNotFound errors, network failures, and strategies for safe cursor recovery.

---

## What Is Cursor Exhaustion

A MongoDB cursor becomes exhausted in two ways. In the normal case, it has returned all matching documents and is closed by the driver automatically. In the abnormal case, the server-side cursor is destroyed before the client has finished consuming it - due to timeout, server restart, replica set failover, or cursor limits being exceeded.

Distinguishing between these two cases and handling abnormal exhaustion gracefully is critical for reliable data processing.

## Normal Cursor Exhaustion

When all documents have been returned, `hasNext()` returns `false` and iteration ends cleanly.

```javascript
const cursor = db.orders.find({ status: "pending" });

while (cursor.hasNext()) {
  const doc = cursor.next();
  processOrder(doc);
}
// Cursor is fully consumed - no error
```

## CursorNotFound: Abnormal Exhaustion

When the server closes a cursor before the client finishes reading it, subsequent `getMore` calls fail with a `CursorNotFound` error (error code 43). This commonly happens when:
- The cursor has been idle for more than 10 minutes
- The server was restarted
- A replica set failover occurred
- The cursor limit was exceeded

```javascript
// Node.js: catching CursorNotFound errors
const { MongoClient } = require("mongodb");

async function processWithRecovery() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const collection = client.db("warehouse").collection("items");
  let lastProcessedId = null;

  let shouldContinue = true;
  while (shouldContinue) {
    const query = lastProcessedId ? { _id: { $gt: lastProcessedId } } : {};
    const cursor = collection.find(query).sort({ _id: 1 });

    try {
      for await (const doc of cursor) {
        await processItem(doc);
        lastProcessedId = doc._id;
      }
      shouldContinue = false;   // Fully consumed, exit loop
    } catch (err) {
      if (err.code === 43 || err.message.includes("cursor id")) {
        console.log("Cursor lost, resuming from last processed ID...");
        // Loop will re-create cursor from lastProcessedId
      } else {
        throw err;   // Re-throw unexpected errors
      }
    } finally {
      await cursor.close();
    }
  }

  await client.close();
}
```

## Python: Handling CursorNotFound

```python
import pymongo
from pymongo.errors import CursorNotFound

client = pymongo.MongoClient("mongodb://localhost:27017")
collection = client["warehouse"]["items"]

last_id = None

while True:
    query = {"_id": {"$gt": last_id}} if last_id else {}
    cursor = collection.find(query).sort("_id", 1)

    try:
        for doc in cursor:
            process_item(doc)
            last_id = doc["_id"]
        break   # Fully consumed
    except CursorNotFound:
        print(f"Cursor lost, resuming from {last_id}")
    finally:
        cursor.close()
```

## Checking cursor.closed Before Iteration

Before iterating a stored cursor reference, check whether it is still alive:

```javascript
if (!cursor.closed) {
  for await (const doc of cursor) {
    processDoc(doc);
  }
} else {
  console.warn("Cursor was already closed");
}
```

## Prevention: Use noCursorTimeout for Slow Iterators

For batch jobs that process documents slowly, prevent premature cursor closure with `noCursorTimeout`:

```javascript
const cursor = collection.find({ needsProcessing: true }, { noCursorTimeout: true });
try {
  for await (const doc of cursor) {
    await slowProcess(doc);
  }
} finally {
  await cursor.close();
}
```

## Summary

Handling MongoDB cursor exhaustion requires differentiating between normal completion (all documents returned) and abnormal termination (`CursorNotFound` error). The most resilient pattern is checkpoint-based pagination using sorted `_id`-range queries, which allows processing to resume from the last successfully processed document without relying on keeping a server-side cursor alive. For slower workloads, `noCursorTimeout` prevents premature closure but must always be paired with explicit `cursor.close()` in a `finally` block.
