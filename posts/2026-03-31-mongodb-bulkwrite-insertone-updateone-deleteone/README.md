# How to Use bulkWrite with insertOne, updateOne, and deleteOne in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, BulkWrite, Performance, Database, Node.js

Description: Learn how to combine insertOne, updateOne, and deleteOne operations in a single MongoDB bulkWrite call to reduce round trips and improve throughput.

---

## Why Mix Operations in bulkWrite

MongoDB's `bulkWrite()` method lets you send multiple write operations to the server in a single network round trip. Mixing `insertOne`, `updateOne`, and `deleteOne` in one call is useful when a single business action requires different types of writes across documents, such as creating a new record, updating a related record, and archiving an old one simultaneously.

## Basic Syntax

```javascript
const result = await db.collection('inventory').bulkWrite([
  {
    insertOne: {
      document: { sku: 'ABC123', qty: 50, status: 'available' }
    }
  },
  {
    updateOne: {
      filter: { sku: 'XYZ789' },
      update: { $inc: { qty: -1 } }
    }
  },
  {
    deleteOne: {
      filter: { sku: 'OLD001', status: 'discontinued' }
    }
  }
]);
```

## Understanding the Result Object

The returned object contains counts for each operation type:

```javascript
console.log(result.insertedCount);   // 1
console.log(result.modifiedCount);   // 1
console.log(result.deletedCount);    // 1
console.log(result.upsertedCount);   // 0
```

If an operation fails in ordered mode, the remaining operations are skipped. In unordered mode, all operations are attempted regardless of failures.

## Using upsert with updateOne

You can combine `updateOne` with `upsert: true` to insert if the document does not exist:

```javascript
await db.collection('products').bulkWrite([
  {
    updateOne: {
      filter: { sku: 'NEW999' },
      update: { $set: { name: 'New Product', qty: 100 } },
      upsert: true
    }
  },
  {
    deleteOne: {
      filter: { sku: 'OLD888' }
    }
  }
]);
```

## Handling Partial Failures

Wrap `bulkWrite` in a try/catch and inspect `BulkWriteError` for per-operation results:

```javascript
try {
  const result = await collection.bulkWrite(operations, { ordered: false });
  console.log(`Inserted: ${result.insertedCount}, Updated: ${result.modifiedCount}`);
} catch (err) {
  if (err.name === 'MongoBulkWriteError') {
    console.error('Write errors:', err.writeErrors);
    console.error('Partial result:', err.result);
  } else {
    throw err;
  }
}
```

Setting `ordered: false` allows partial success when some operations fail while others succeed.

## Real-World Example: Order Processing

A typical e-commerce order placement might insert the order, update stock, and delete a cart. Since `bulkWrite` operates on a single collection, you need a separate call for each collection:

```javascript
await db.collection('orders').bulkWrite([
  {
    insertOne: {
      document: {
        orderId: 'ORD-001',
        customerId: 'C-42',
        items: [{ sku: 'WIDGET', qty: 2 }],
        status: 'pending',
        createdAt: new Date()
      }
    }
  }
]);

await db.collection('inventory').bulkWrite([
  {
    updateOne: {
      filter: { sku: 'WIDGET' },
      update: { $inc: { qty: -2 } }
    }
  }
]);

await db.collection('carts').bulkWrite([
  {
    deleteOne: { filter: { customerId: 'C-42' } }
  }
]);
```

For true atomicity across collections, wrap all operations in a multi-document transaction.

## Summary

MongoDB's `bulkWrite()` with mixed operation types reduces round trips when a single action requires inserts, updates, and deletes together. Use `ordered: false` for maximum throughput when operation independence allows, and always handle `BulkWriteError` to capture partial failures. For atomicity guarantees across multiple collections, combine `bulkWrite` with transactions.
