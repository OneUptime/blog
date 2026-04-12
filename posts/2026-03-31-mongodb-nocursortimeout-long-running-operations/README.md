# How to Use noCursorTimeout for Long-Running Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, Timeout, Batch Processing, Performance

Description: Learn when and how to use noCursorTimeout in MongoDB to prevent cursor expiry during long-running batch operations, and understand the associated risks.

---

## The Problem: Cursor Expiry During Long Batch Jobs

MongoDB automatically closes idle cursors after 10 minutes by default. For batch processing jobs that read large collections slowly - performing complex transformations, calling external APIs, or writing to slow storage - this timeout can kill the cursor mid-operation, causing failures and incomplete processing.

The `noCursorTimeout` option disables this automatic cleanup for a specific cursor, allowing it to remain open indefinitely.

## When to Use noCursorTimeout

Use `noCursorTimeout` only when:
- Processing a large result set takes longer than 10 minutes
- Each document requires significant time to process
- You cannot break the work into smaller batches

Do not use it as a default setting for all cursors. Cursors that are never closed leak memory and file descriptors on the server.

## Using noCursorTimeout in the MongoDB Shell

```javascript
// Open a cursor that will not time out
const cursor = db.largeDataset.find({ processed: false }).noCursorTimeout();

try {
  while (cursor.hasNext()) {
    const doc = cursor.next();
    // Slow processing - could take many minutes total
    processDocument(doc);
  }
} finally {
  cursor.close();   // Always close manually
}
```

## Using noCursorTimeout in Node.js

```javascript
const { MongoClient } = require("mongodb");

async function processLargeCollection() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const collection = client.db("warehouse").collection("inventory");

  const cursor = collection.find(
    { needsReview: true },
    { noCursorTimeout: true }
  );

  try {
    for await (const doc of cursor) {
      await slowExternalApiCall(doc);
      await collection.updateOne(
        { _id: doc._id },
        { $set: { needsReview: false } }
      );
    }
  } finally {
    await cursor.close();
    await client.close();
  }
}
```

## Using noCursorTimeout in Python

```python
import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017")
collection = client["warehouse"]["inventory"]

cursor = collection.find(
    {"needsReview": True},
    no_cursor_timeout=True
)

try:
    for doc in cursor:
        slow_processing(doc)
finally:
    cursor.close()   # Critical: always close explicitly
```

## Safer Alternative: Using Pagination

A safer alternative to `noCursorTimeout` is processing data in pages using `_id`-based pagination. This avoids holding an open cursor entirely.

```javascript
let lastId = null;
const batchSize = 1000;

while (true) {
  const query = lastId ? { _id: { $gt: lastId }, processed: false } : { processed: false };
  const batch = await collection
    .find(query)
    .sort({ _id: 1 })
    .limit(batchSize)
    .toArray();

  if (batch.length === 0) break;

  for (const doc of batch) {
    await processDocument(doc);
  }

  lastId = batch[batch.length - 1]._id;
}
```

This approach is resumable, does not hold server resources between batches, and is safer for production workloads.

## Required Privilege

Using `noCursorTimeout` does not require any special privilege beyond the standard `find` privilege needed to query the collection. Note that the separate `killCursors` privilege controls the ability to terminate cursors, not to set timeout behavior.

## Summary

The `noCursorTimeout` option prevents cursor expiry during long-running batch operations in MongoDB. While useful, it must be used carefully - always close the cursor explicitly in a `finally` block to avoid resource leaks. For most production batch jobs, pagination using `_id`-based range queries is a safer and more resumable alternative that does not hold open server-side cursors across slow processing steps.
