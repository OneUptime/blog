# How to Batch Large Write Operations for Better Performance in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Write, Batch Operation, Performance, insertMany

Description: Learn how to use MongoDB's bulk write and insertMany operations to batch large write workloads for significantly better throughput and reduced network overhead.

---

## Overview

Writing documents one at a time in a loop is the slowest way to insert data into MongoDB. Each individual write incurs a network round-trip and write journal overhead. Batching writes using `insertMany()` or `bulkWrite()` dramatically reduces this overhead and increases throughput.

## insertMany vs Individual Inserts

```javascript
// Slow: one round-trip per document
for (const item of items) {
  await collection.insertOne(item);
}

// Fast: one round-trip for 1000 documents
await collection.insertMany(items.slice(0, 1000));
```

`insertMany()` can accept any number of documents. The driver automatically splits the request into batches of up to 100,000 operations (the server's `maxWriteBatchSize` limit) if needed, so you do not have to manage this split yourself. It is the fastest way to insert large datasets.

## Splitting Large Datasets into Batches

For very large arrays, split into chunks to avoid exceeding memory or MongoDB's limits:

```javascript
async function batchInsert(collection, documents, batchSize = 1000) {
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await collection.insertMany(batch, { ordered: false });
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}`);
  }
}

// Usage
await batchInsert(db.collection("products"), largeProductArray, 500);
```

The `ordered: false` option allows MongoDB to continue inserting other documents in the batch even if one fails, maximizing throughput.

## Using bulkWrite for Mixed Operations

When you need to mix inserts, updates, and deletes, use `bulkWrite()`:

```javascript
const operations = [
  {
    insertOne: {
      document: { sku: "ABC123", name: "Widget", price: 9.99 }
    }
  },
  {
    updateOne: {
      filter: { sku: "XYZ789" },
      update: { $set: { price: 14.99 } },
      upsert: true
    }
  },
  {
    deleteMany: {
      filter: { discontinued: true }
    }
  },
  {
    replaceOne: {
      filter: { sku: "DEF456" },
      replacement: { sku: "DEF456", name: "Updated Widget", price: 12.99 }
    }
  }
];

const result = await collection.bulkWrite(operations, { ordered: false });
console.log(result.insertedCount, result.modifiedCount, result.deletedCount);
```

## Ordered vs Unordered Bulk Writes

| Mode | Behavior | Use When |
|---|---|---|
| `ordered: true` (default) | Stops on first error | Order matters, errors should halt |
| `ordered: false` | Continues past errors | Maximum throughput, errors OK |

```javascript
// Unordered for maximum throughput
await collection.bulkWrite(ops, { ordered: false });

// Ordered when sequence matters (e.g., financial transactions)
await collection.bulkWrite(transactionOps, { ordered: true });
```

## Batching Updates Efficiently

When updating many documents with different values, use `bulkWrite()` with multiple `updateOne` operations:

```javascript
async function batchPriceUpdate(collection, priceUpdates, batchSize = 500) {
  for (let i = 0; i < priceUpdates.length; i += batchSize) {
    const batch = priceUpdates.slice(i, i + batchSize);
    const ops = batch.map(({ sku, newPrice }) => ({
      updateOne: {
        filter: { sku },
        update: { $set: { price: newPrice, updatedAt: new Date() } }
      }
    }));
    await collection.bulkWrite(ops, { ordered: false });
  }
}

await batchPriceUpdate(db.collection("products"), updates, 500);
```

## Monitoring Bulk Write Results

```javascript
try {
  const result = await collection.bulkWrite(operations, { ordered: false });
  console.log({
    inserted: result.insertedCount,
    matched: result.matchedCount,
    modified: result.modifiedCount,
    deleted: result.deletedCount,
    upserted: result.upsertedCount
  });
} catch (error) {
  if (error.code === 65) { // MongoBulkWriteError
    console.log("Partial result:", error.result);
    console.log("Write errors:", error.writeErrors);
  } else {
    throw error;
  }
}
```

## Choosing the Right Batch Size

Batch size affects both throughput and memory usage:

- Too small (e.g., 10): too many round-trips, poor throughput.
- Too large (e.g., 100,000): large memory footprint, risk of timeouts.
- Recommended: 500 to 2,000 documents per batch for most workloads.

```javascript
// Benchmark helper
async function benchmarkBatchSize(collection, documents) {
  for (const size of [100, 500, 1000, 2000, 5000]) {
    const start = Date.now();
    await batchInsert(collection, documents, size);
    console.log(`Batch size ${size}: ${Date.now() - start}ms`);
    await collection.deleteMany({});  // reset
  }
}
```

## Summary

Batching write operations with `insertMany()` and `bulkWrite()` is the most impactful optimization for high-throughput MongoDB writes. Use `insertMany()` for bulk inserts, `bulkWrite()` for mixed operation sets, and set `ordered: false` when you can tolerate individual failures in exchange for higher throughput. A batch size of 500 to 2,000 documents per call offers a good balance between network efficiency and memory usage.
