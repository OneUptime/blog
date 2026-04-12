# How to Use initializeOrderedBulkOp() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Operation, Performance, Node.js, Driver

Description: Learn how to use initializeOrderedBulkOp() in the MongoDB Node.js driver to batch multiple write operations that execute sequentially and stop on first error.

---

## Overview

`initializeOrderedBulkOp()` is a method on the MongoDB Node.js driver collection object that creates a bulk operations builder. Operations added to the batch execute in order, and MongoDB stops processing on the first error. This makes it the right choice when the sequence of operations matters or when subsequent operations depend on earlier ones.

## Basic Usage

```javascript
const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const col = client.db('store').collection('inventory');
  const bulk = col.initializeOrderedBulkOp();

  // Insert a new product
  bulk.insert({ sku: 'ABC123', name: 'Widget', qty: 0 });

  // Increment quantity for an existing product
  bulk.find({ sku: 'XYZ789' }).updateOne({ $inc: { qty: 50 } });

  // Replace a document entirely
  bulk.find({ sku: 'DEF456' }).replaceOne({ sku: 'DEF456', name: 'Gadget Pro', qty: 200 });

  // Delete discontinued items
  bulk.find({ discontinued: true }).delete();

  const result = await bulk.execute();
  console.log('Inserted:', result.nInserted);
  console.log('Modified:', result.nModified);
  console.log('Deleted:', result.nRemoved);

  await client.close();
}

run().catch(console.error);
```

## Understanding the Execution Model

Ordered bulk operations execute in the exact sequence they were declared. The driver batches consecutive operations of the same type into a single request for wire protocol efficiency, but these batches are sent to the server in the declared order. If any operation fails (for example, a duplicate key on insert), the entire bulk operation halts at that point and no subsequent operations are executed.

```javascript
const bulk = col.initializeOrderedBulkOp();

// These are processed before the update below
bulk.insert({ _id: 1, name: 'Alpha' });
bulk.insert({ _id: 2, name: 'Beta' });

// This update runs after both inserts succeed
bulk.find({ _id: 1 }).updateOne({ $set: { active: true } });

try {
  const result = await bulk.execute();
  console.log(result);
} catch (err) {
  // BulkWriteError contains partial results
  console.error('Bulk error at index:', err.result.getWriteErrorAt(0));
}
```

## Upserting in an Ordered Batch

```javascript
const bulk = col.initializeOrderedBulkOp();

const products = [
  { sku: 'A1', price: 9.99 },
  { sku: 'A2', price: 14.99 },
  { sku: 'A3', price: 4.99 }
];

for (const p of products) {
  bulk.find({ sku: p.sku }).upsert().updateOne({ $set: p });
}

const result = await bulk.execute();
console.log('Upserted:', result.nUpserted);
console.log('Modified:', result.nModified);
```

## Handling Errors

```javascript
try {
  await bulk.execute();
} catch (err) {
  if (err.name === 'MongoBulkWriteError') {
    const errors = err.result.getWriteErrors();
    errors.forEach((e) => {
      console.error(`Error at index ${e.index}: ${e.errmsg}`);
    });
    // Successful operations before the error
    console.log('Inserted before error:', err.result.nInserted);
  }
}
```

## When to Use Ordered vs Unordered

Use `initializeOrderedBulkOp()` when:
- You need strict sequencing (insert then update the same document).
- You want processing to stop on first failure for safety.
- Operations have logical dependencies on one another.

Use `initializeUnorderedBulkOp()` when operations are independent and you want maximum throughput even if some fail.

## Summary

`initializeOrderedBulkOp()` is the right tool when you need sequential execution with fail-fast behavior. Build the operation batch, call `execute()`, and inspect the returned `BulkWriteResult` for counts of inserted, modified, and deleted documents. Catch `BulkWriteError` to identify which operation in the sequence failed and how many operations completed successfully before the halt.
