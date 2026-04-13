# How to Close Cursors Properly in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, Resource Management, Connection, Performance

Description: Learn how to properly close MongoDB cursors to prevent resource leaks, free server memory, and avoid hitting cursor limits in production applications.

---

## Why Cursor Cleanup Matters

Every open cursor in MongoDB consumes server-side memory and holds a reference to query state. In high-throughput applications that open many cursors without closing them explicitly, server memory can be exhausted quickly, causing new queries to fail with errors like `cannot open a new cursor since too many cursors are already opened`.

Proper cursor management is fundamental to application stability.

## How Cursors Are Closed Automatically

MongoDB closes a cursor automatically in three situations:
1. The cursor is fully exhausted - all documents have been returned
2. The cursor is idle for more than 10 minutes (configurable)
3. The client session or connection closes

However, relying on automatic timeout is not sufficient for high-volume applications. Always close cursors explicitly.

## Closing Cursors in Node.js

Use the `close()` method inside a `finally` block to ensure cleanup regardless of errors.

```javascript
const { MongoClient } = require("mongodb");

async function processOrders() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const collection = client.db("sales").collection("orders");
  const cursor = collection.find({ status: "pending" });

  try {
    for await (const doc of cursor) {
      await processOrder(doc);
    }
  } finally {
    await cursor.close();
    await client.close();
  }
}
```

Using `for await...of` will automatically close the cursor when the loop completes normally or throws. Calling `cursor.close()` explicitly in `finally` ensures cleanup even when breaking out of the loop early.

## Closing Cursors in Python

```python
import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017")
collection = client["sales"]["orders"]

cursor = collection.find({"status": "pending"})

try:
    for doc in cursor:
        process_order(doc)
finally:
    cursor.close()
```

Use Python's context manager syntax for cleaner cursor management:

```python
with collection.find({"status": "pending"}) as cursor:
    for doc in cursor:
        process_order(doc)
# Cursor is automatically closed when the with block exits
```

## Closing Cursors in Java

```java
MongoCollection<Document> collection = db.getCollection("orders");

try (MongoCursor<Document> cursor = collection.find(
    Filters.eq("status", "pending")).iterator()) {

    while (cursor.hasNext()) {
        Document doc = cursor.next();
        processOrder(doc);
    }
}
// try-with-resources automatically calls cursor.close()
```

## Handling Early Exit

When you exit a cursor loop early with `break` or `return`, the cursor is not automatically closed in some drivers. Always use `finally` or resource management patterns.

```javascript
async function findFirstMatch(collection, criteria) {
  const cursor = collection.find(criteria);

  try {
    for await (const doc of cursor) {
      if (matchesCondition(doc)) {
        return doc;   // Early return - cursor must still be closed
      }
    }
  } finally {
    await cursor.close();   // This runs even after return
  }

  return null;
}
```

## Monitoring Open Cursors

Check the number of open cursors on the server using serverStatus:

```javascript
const status = db.serverStatus();
printjson(status.metrics.cursor);
// Shows: open.total, timedOut, totalOpened
```

## Summary

Properly closing MongoDB cursors prevents resource leaks that can crash production applications by exhausting the server's cursor limit. Always use `finally` blocks, `try-with-resources` patterns, or language-specific context managers to guarantee cursor cleanup. Do not rely on the 10-minute idle timeout as your primary cleanup mechanism. Monitor open cursor counts using `serverStatus()` to detect leaks before they cause failures.
