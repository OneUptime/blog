# How to Use bulkWrite() for Efficient Batch Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, BulkWrite, Batch Operation, Performance, Write Operation

Description: Learn how to use MongoDB's bulkWrite() to execute multiple insert, update, and delete operations in a single round trip for maximum efficiency.

---

## What Is bulkWrite()

`bulkWrite()` lets you send a list of write operations - inserts, updates, and deletes - to MongoDB in a single network round trip. This is far more efficient than issuing individual operations in a loop, especially when processing hundreds or thousands of records.

Supported operation types:
- `insertOne`
- `updateOne`
- `updateMany`
- `replaceOne`
- `deleteOne`
- `deleteMany`

## Basic Example

```javascript
const result = await db.collection("inventory").bulkWrite([
  {
    insertOne: {
      document: { sku: "ABC123", qty: 100, warehouse: "east" }
    }
  },
  {
    updateOne: {
      filter: { sku: "XYZ789" },
      update: { $inc: { qty: -5 } }
    }
  },
  {
    deleteOne: {
      filter: { sku: "OLD001", qty: 0 }
    }
  }
]);

console.log("Inserted:", result.insertedCount);
console.log("Modified:", result.modifiedCount);
console.log("Deleted:", result.deletedCount);
```

## Ordered vs Unordered Bulk Writes

By default, `bulkWrite()` runs operations in order (`ordered: true`). If one fails, MongoDB stops and does not execute subsequent operations.

```javascript
// Ordered (default) - stops on first error
await collection.bulkWrite(operations, { ordered: true });

// Unordered - continues after errors, processes faster in parallel
await collection.bulkWrite(operations, { ordered: false });
```

Use `ordered: false` for independent operations where partial success is acceptable. MongoDB can parallelize these writes.

## Upserts in bulkWrite()

```javascript
await db.collection("products").bulkWrite([
  {
    updateOne: {
      filter: { sku: "SKU001" },
      update: { $set: { price: 29.99 } },
      upsert: true
    }
  },
  {
    updateOne: {
      filter: { sku: "SKU002" },
      update: { $set: { price: 49.99 } },
      upsert: true
    }
  }
]);
```

## Processing Large Datasets in Chunks

Avoid sending all operations in one giant call. Batch them into chunks of 500-1000:

```javascript
async function bulkWriteInChunks(collection, operations, chunkSize = 500) {
  const results = [];
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const result = await collection.bulkWrite(chunk, { ordered: false });
    results.push(result);
  }
  return results;
}
```

## Reading the BulkWriteResult

```javascript
const result = await collection.bulkWrite(ops);

console.log(result.insertedCount);   // documents inserted
console.log(result.matchedCount);    // documents matched by updates
console.log(result.modifiedCount);   // documents actually changed
console.log(result.deletedCount);    // documents removed
console.log(result.upsertedCount);   // documents upserted
console.log(result.upsertedIds);     // map of index -> upsertedId
```

## Common Mistakes

- Sending thousands of operations in a single call - chunk them to avoid memory issues.
- Using `ordered: true` for independent operations, which prevents parallelism.
- Not catching `MongoBulkWriteError` in unordered mode - the error is thrown and contains both the write errors and partial success results that you need to inspect.

## Summary

`bulkWrite()` consolidates multiple MongoDB write operations into one efficient round trip. Use it when processing batches of inserts, updates, and deletes. Choose `ordered: false` for independent operations to improve throughput, and chunk large operation sets to manage memory and network payload size.
