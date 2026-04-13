# How to Use forEach, toArray, and map with Cursors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, JavaScript, Driver, Collection

Description: Learn how to use forEach, toArray, and map iteration methods with MongoDB cursors and understand when to choose each approach for processing query results.

---

## MongoDB Cursor Iteration Methods

MongoDB drivers provide several methods for iterating over cursor results. Each has different memory characteristics and use cases. Choosing the right method for your workload affects both performance and resource consumption.

## toArray() - Load All Results into Memory

`toArray()` fetches all documents matching the query into a JavaScript array. It is simple but loads the entire result set into memory at once.

```javascript
const { MongoClient } = require("mongodb");

async function getAllOrders() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const collection = client.db("store").collection("orders");

  // All documents loaded into memory at once
  const orders = await collection
    .find({ status: "completed" })
    .toArray();

  console.log(`Loaded ${orders.length} orders`);
  await client.close();
  return orders;
}
```

Use `toArray()` only for small result sets where you need random access to all documents simultaneously.

## forEach() - Stream Documents One by One

`forEach()` iterates over documents as they arrive from the server, processing each one without loading the full result set into memory. This is ideal for large collections.

```javascript
async function processOrdersForEach() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const collection = client.db("store").collection("orders");

  await collection.find({ status: "pending" }).forEach(async (doc) => {
    await sendNotification(doc.customerId, doc._id);
  });

  await client.close();
}
```

Note that in the Node.js driver, the callback passed to `forEach()` may not handle async operations properly in all versions. Use `for await...of` as the preferred async iteration pattern.

## for await...of - Preferred Async Iteration

The `for await...of` loop is the recommended way to iterate over cursor results asynchronously in modern Node.js applications.

```javascript
async function processWithForAwait() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const collection = client.db("store").collection("orders");
  const cursor = collection.find({ year: 2025 });

  for await (const doc of cursor) {
    await processOrder(doc);
  }

  await client.close();
}
```

## map() - Transform Documents While Iterating

Both the MongoDB shell and the Node.js driver provide a `map()` method on cursor objects that transforms documents while streaming them.

```javascript
// Shell: transform while iterating
const summaries = db.orders.find({ status: "completed" }).map(doc => ({
  id: doc._id,
  customer: doc.customerId,
  total: doc.total
}));
```

In the Node.js driver, cursors also have a `map()` method. It returns a mapped cursor that applies the transform as documents are iterated:

```javascript
const summaries = await collection.find({ status: "completed" })
  .map(doc => ({
    id: doc._id,
    customer: doc.customerId,
    total: doc.total
  }))
  .toArray();
```

For large collections, use a streaming approach with a transform function instead:

```javascript
async function* mapCursor(cursor, transform) {
  for await (const doc of cursor) {
    yield transform(doc);
  }
}

const cursor = collection.find({ status: "completed" });
for await (const summary of mapCursor(cursor, doc => ({ id: doc._id, total: doc.total }))) {
  await writeSummary(summary);
}
```

## Comparing the Methods

```text
toArray()       - Simple, loads all docs into memory, use for small result sets
forEach()       - Streams documents, lower memory, synchronous-style callback
for await...of  - Streams documents, full async/await support, preferred method
map()           - Transforms while streaming, available in both shell and Node.js driver
```

## Summary

MongoDB provides multiple ways to iterate over cursor results. Use `toArray()` only for small result sets where you need all documents at once. Use `for await...of` as the standard approach for large collections in async Node.js applications - it streams documents, supports proper async operations, and handles cursor cleanup automatically on completion. Avoid loading large collections with `toArray()` as it can exhaust available memory.
