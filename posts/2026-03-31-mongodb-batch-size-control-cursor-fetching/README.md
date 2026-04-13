# How to Use Batch Size to Control Cursor Fetching in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, Performance, Batch Processing, Memory

Description: Learn how to configure batch size on MongoDB cursors to control memory usage, network overhead, and throughput when fetching large result sets.

---

## How MongoDB Cursors Fetch Documents

MongoDB cursors do not retrieve all matching documents in a single network round trip. Instead, they use a `getMore` command to fetch documents in batches. The default initial batch size is 101 documents for the first response and then 16 MB per `getMore` request for subsequent batches.

Controlling batch size gives you a balance between memory usage (smaller batches) and network efficiency (fewer round trips with larger batches).

## Setting Batch Size in the Shell

Use the `batchSize()` cursor method to set how many documents are returned per `getMore` call:

```javascript
// Fetch 500 documents per round trip
const cursor = db.products.find({ inStock: true }).batchSize(500);

while (cursor.hasNext()) {
  const doc = cursor.next();
  processProduct(doc);
}
```

## Setting Batch Size in Node.js

```javascript
const { MongoClient } = require("mongodb");

async function fetchProducts() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const collection = client.db("store").collection("products");

  // Process 200 documents per getMore
  const cursor = collection.find({ category: "electronics" }).batchSize(200);

  for await (const doc of cursor) {
    await processProduct(doc);
  }

  await client.close();
}
```

## Setting Batch Size in Python

```python
import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017")
collection = client["store"]["products"]

cursor = collection.find({"category": "electronics"}).batch_size(200)

for doc in cursor:
    process_product(doc)

cursor.close()
```

## Choosing the Right Batch Size

The optimal batch size depends on document size and processing characteristics:

```text
Small batch size (50-200):
  - Large documents (embedded arrays, blobs)
  - Slow per-document processing
  - Memory-constrained environments
  - Reduces peak memory usage

Large batch size (500-2000):
  - Small documents
  - Fast per-document processing
  - High-throughput bulk operations
  - Reduces round-trip count
```

## Batch Size vs. limit()

`batchSize()` controls how many documents are fetched per network round trip. `limit()` controls the total number of documents the cursor returns. They work independently.

```javascript
// Fetch up to 1000 total documents, 100 at a time
const cursor = db.logs.find({ level: "error" })
  .limit(1000)
  .batchSize(100);
```

## Monitoring Batch Fetch Behavior

Use `db.currentOp()` to observe active cursors and how many documents they have fetched:

```javascript
db.adminCommand({
  currentOp: true,
  "command.getMore": { $exists: true }
});
```

This shows active `getMore` operations, their collection, and how long they have been running.

## Summary

MongoDB cursor batch size controls how many documents are transferred per network round trip between the server and client. Smaller batch sizes reduce peak memory usage and are appropriate for large documents or slow processing. Larger batch sizes reduce round-trip overhead and improve throughput for small, fast-to-process documents. Always tune batch size based on your document size, processing speed, and available memory rather than relying on the default.
