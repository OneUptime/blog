# How to Use Tailable Cursors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, Capped Collection, Real-Time, Streaming

Description: Learn how to use tailable cursors in MongoDB to stream new documents from capped collections in real time without polling or re-querying.

---

## What Are Tailable Cursors

A standard MongoDB cursor exhausts itself once all matching documents have been returned. A tailable cursor, by contrast, does not close when it reaches the end of the result set. Instead, it waits for new documents to be inserted into the collection and continues to return them as they arrive.

Tailable cursors only work on capped collections - fixed-size collections that maintain insertion order and automatically remove the oldest documents when full.

## Creating a Capped Collection

Before using a tailable cursor, create a capped collection to hold your streaming data.

```javascript
db.createCollection("applicationLogs", {
  capped: true,
  size: 10485760,   // 10 MB max size
  max: 50000        // max 50,000 documents
});
```

## Opening a Tailable Cursor in the Shell

In the MongoDB shell, use the `tailable()` cursor modifier:

```javascript
const cursor = db.applicationLogs.find().tailable();

while (true) {
  if (cursor.hasNext()) {
    const doc = cursor.next();
    print(`[${doc.level}] ${doc.message}`);
  } else {
    sleep(100);   // Brief pause before checking again
  }
}
```

## Using a Tailable Cursor in Node.js

With the official MongoDB Node.js driver, pass `tailable: true` in the find options.

```javascript
const { MongoClient } = require("mongodb");

async function tailLogs() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const collection = client.db("appdb").collection("applicationLogs");

  const cursor = collection.find(
    {},
    { tailable: true, awaitData: true }
  );

  for await (const doc of cursor) {
    console.log(`[${doc.level}] ${doc.message}`);
  }

  await client.close();
}

tailLogs().catch(console.error);
```

## Using a Tailable Cursor with Python (PyMongo)

```python
import pymongo
import time

client = pymongo.MongoClient("mongodb://localhost:27017")
collection = client["appdb"]["applicationLogs"]

cursor = collection.find(
    {},
    cursor_type=pymongo.CursorType.TAILABLE
)

while cursor.alive:
    try:
        doc = next(cursor)
        print(f"[{doc['level']}] {doc['message']}")
    except StopIteration:
        time.sleep(0.1)   # Wait for new documents
```

## Cursor Invalidation

A tailable cursor becomes invalid (dead) when:
- The capped collection is dropped or recreated
- The cursor falls off the end of the capped collection because documents were inserted faster than they were consumed

When a cursor is invalidated, your application must create a new cursor from the last processed document's position.

```javascript
// Track the last seen _id to re-create the cursor after invalidation
let lastId = null;

function createCursor(collection, lastId) {
  const query = lastId ? { _id: { $gt: lastId } } : {};
  return collection.find(query, { tailable: true });
}
```

## Summary

Tailable cursors provide an efficient way to stream data from MongoDB capped collections without polling. They are ideal for log tailing, activity feeds, and lightweight message queues. Remember that tailable cursors require capped collections, do not close when the end of the collection is reached, and must be re-created if invalidated. For production use, combine tailable cursors with the `awaitData` option to avoid busy-waiting loops.
