# How to Use bulkWrite() with Mixed Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, BulkWrite, Performance, Database, Node.js

Description: Learn how to use MongoDB bulkWrite() with mixed operation types to batch inserts, updates, replaces, and deletes in a single efficient database call.

---

## Overview of bulkWrite() with Mixed Operations

MongoDB's `bulkWrite()` supports six operation types in a single call: `insertOne`, `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, and `deleteMany`. Mixing these operations in one batch minimizes network round trips and is particularly useful in ETL pipelines, data migrations, and batch processing jobs.

## Full Operation Type Reference

```javascript
const operations = [
  // Insert a new document
  { insertOne: { document: { name: 'Alice', score: 95 } } },

  // Update one matching document
  { updateOne: { filter: { name: 'Bob' }, update: { $inc: { score: 5 } } } },

  // Update all matching documents
  { updateMany: { filter: { score: { $lt: 50 } }, update: { $set: { status: 'failing' } } } },

  // Replace an entire document
  { replaceOne: { filter: { name: 'Carol' }, replacement: { name: 'Carol', score: 88, updated: true } } },

  // Delete one document
  { deleteOne: { filter: { name: 'Dave', status: 'inactive' } } },

  // Delete all matching documents
  { deleteMany: { filter: { status: 'archived' } } }
];

const result = await db.collection('students').bulkWrite(operations);
```

## Ordered vs. Unordered Execution

By default, `bulkWrite()` processes operations in order and stops on the first error. Use `ordered: false` to process all operations regardless of intermediate failures:

```javascript
const result = await collection.bulkWrite(operations, { ordered: false });
console.log(`Inserted: ${result.insertedCount}`);
console.log(`Modified: ${result.modifiedCount}`);
console.log(`Deleted:  ${result.deletedCount}`);
```

Unordered mode is faster for independent operations but requires your application to handle partial failures by catching the `MongoBulkWriteError` and inspecting `err.writeErrors`.

## Batching Large Operation Sets

The Node.js driver automatically splits operations into server batches of 100,000, but chunking large sets yourself is still useful for controlling memory usage and tracking progress:

```javascript
async function batchedBulkWrite(collection, operations, batchSize = 1000) {
  const results = [];
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const result = await collection.bulkWrite(batch, { ordered: false });
    results.push(result);
  }
  return results;
}
```

## ETL Use Case: Sync External Data

A common pattern syncs records from an external API into MongoDB using upserts and deletes:

```javascript
async function syncRecords(externalRecords, collection) {
  const ops = externalRecords.map(record => ({
    updateOne: {
      filter: { externalId: record.id },
      update: { $set: { ...record, updatedAt: new Date() } },
      upsert: true
    }
  }));

  // Delete records no longer in the external source
  const externalIds = externalRecords.map(r => r.id);
  ops.push({
    deleteMany: {
      filter: { externalId: { $nin: externalIds } }
    }
  });

  return collection.bulkWrite(ops, { ordered: false });
}
```

## Checking for Write Errors

```javascript
try {
  await collection.bulkWrite(operations, { ordered: false });
} catch (err) {
  if (err.writeErrors && err.writeErrors.length > 0) {
    err.writeErrors.forEach(e => {
      console.error(`Op index ${e.index}: ${e.errmsg}`);
    });
  }
}
```

## Summary

`bulkWrite()` with mixed operations is a powerful pattern for high-throughput MongoDB workloads. It reduces network overhead by combining inserts, updates, replaces, and deletes into a single call. Use ordered mode when operations depend on each other and unordered mode for maximum throughput with independent operations. Always handle `writeErrors` when using unordered mode to detect and recover from partial failures.
