# How to Handle Errors in Bulk Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Operation, Error Handling, Node.js, Driver

Description: Learn how to detect, inspect, and recover from errors in MongoDB bulk write operations using BulkWriteError and partial result inspection.

---

## Overview

MongoDB bulk operations batch multiple writes into a single network round trip. When errors occur, the behavior differs between ordered and unordered batches. Understanding `BulkWriteError` and the result object is essential for building resilient data pipelines.

## Error Types in Bulk Operations

MongoDB bulk operations can encounter two categories of errors:

- **Write errors** - individual document-level failures such as duplicate key violations or validation errors.
- **Write concern errors** - failures at the replica set level, for example not enough nodes acknowledged the write.

## Handling Errors in Ordered Bulk Operations

Ordered operations stop on the first error. Use the `getWriteErrors()` method to inspect failures.

```javascript
const { MongoClient, MongoBulkWriteError } = require('mongodb');

async function orderedBulkWithErrorHandling(col, documents) {
  const bulk = col.initializeOrderedBulkOp();

  documents.forEach((doc) => bulk.insert(doc));

  try {
    const result = await bulk.execute();
    console.log(`Inserted ${result.insertedCount} documents`);
  } catch (err) {
    if (err instanceof MongoBulkWriteError) {
      console.error('Bulk write failed');
      console.log(`Inserted before failure: ${err.result.insertedCount}`);

      err.result.getWriteErrors().forEach((e) => {
        console.error(`Index ${e.index}: code=${e.code} message=${e.errmsg}`);
      });

      if (err.result.hasWriteConcernError()) {
        const wce = err.result.getWriteConcernError();
        console.error('Write concern error:', wce.errmsg);
      }
    } else {
      throw err;
    }
  }
}
```

## Handling Errors in Unordered Bulk Operations

Unordered operations continue past errors. Every failing document is recorded.

```javascript
async function unorderedBulkWithErrorHandling(col, documents) {
  const bulk = col.initializeUnorderedBulkOp();

  documents.forEach((doc) => {
    bulk.find({ _id: doc._id }).upsert().updateOne({ $set: doc });
  });

  try {
    const result = await bulk.execute();
    console.log(`Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}`);
  } catch (err) {
    if (err instanceof MongoBulkWriteError) {
      const errors = err.result.getWriteErrors();
      console.warn(`${errors.length} write errors out of ${documents.length} operations`);

      const failedIds = errors.map((e) => documents[e.index]._id);
      console.log('Failed IDs:', failedIds);

      // Retry or store failed IDs for later processing
      return { succeeded: documents.length - errors.length, failed: failedIds };
    }
    throw err;
  }
}
```

## Separating Duplicate Key Errors

Duplicate key errors (code 11000) are common and often expected. Filter them out from unexpected errors.

```javascript
function classifyErrors(bulkWriteError) {
  const duplicates = [];
  const others = [];

  bulkWriteError.result.getWriteErrors().forEach((e) => {
    if (e.code === 11000) {
      duplicates.push(e.index);
    } else {
      others.push({ index: e.index, code: e.code, message: e.errmsg });
    }
  });

  return { duplicates, others };
}
```

## Building a Retry Strategy

```javascript
async function bulkWithRetry(col, docs, maxRetries = 3) {
  let pending = docs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const bulk = col.initializeUnorderedBulkOp();
    pending.forEach((doc) => bulk.insert(doc));

    try {
      await bulk.execute();
      console.log('All documents inserted');
      return;
    } catch (err) {
      if (err instanceof MongoBulkWriteError) {
        const errors = err.result.getWriteErrors();
        const transient = errors.filter((e) => e.code !== 11000);
        pending = transient.map((e) => docs[e.index]);
        console.warn(`Attempt ${attempt}: ${transient.length} transient errors, retrying`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        throw err;
      }
    }
  }

  console.error(`Failed after ${maxRetries} attempts. ${pending.length} docs not inserted.`);
}
```

## Summary

MongoDB bulk operation errors surface through `MongoBulkWriteError`. Ordered batches stop at the first failure while unordered batches collect all errors. Use `getWriteErrors()` to inspect individual failures, filter by error code to separate expected duplicates from unexpected failures, and build retry logic that re-submits only the documents that failed for transient reasons.
