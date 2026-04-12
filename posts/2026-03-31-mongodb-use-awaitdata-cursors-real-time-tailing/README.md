# How to Use Awaitdata Cursors for Real-Time Tailing in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, Capped Collection, Real-Time, Streaming

Description: Learn how to use awaitData tailable cursors in MongoDB to efficiently tail capped collections in real time without busy-waiting loops.

---

## What Is the awaitData Option

When a tailable cursor reaches the end of a capped collection, it returns an empty result. Without any wait mechanism, your application must immediately retry the cursor in a tight loop, burning CPU cycles checking for new data.

The `awaitData` option solves this by telling MongoDB to block the cursor on the server side when no new documents are available. The server returns to the client only when new documents arrive or a configurable timeout (set via `maxAwaitTimeMS`) expires. This eliminates busy-waiting and makes real-time tailing efficient.

## How awaitData Differs from a Plain Tailable Cursor

```text
Tailable cursor only:  Returns empty immediately when no new docs are available.
                       Client must sleep/retry in a loop.

Tailable + awaitData:  Server blocks up to maxTimeMS waiting for new docs.
                       Client only wakes up when data arrives or timeout expires.
```

## Using awaitData in Node.js

Pass both `tailable: true` and `awaitData: true` in the cursor options:

```javascript
const { MongoClient } = require("mongodb");

async function tailWithAwaitData() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const collection = client.db("metrics").collection("sensorReadings");

  const cursor = collection.find(
    {},
    {
      tailable: true,
      awaitData: true,
      maxAwaitTimeMS: 2000   // Block up to 2 seconds per batch
    }
  );

  for await (const doc of cursor) {
    console.log(`Sensor ${doc.sensorId}: ${doc.value} at ${doc.timestamp}`);
  }

  await client.close();
}

tailWithAwaitData().catch(console.error);
```

## Using awaitData in Python (PyMongo)

```python
import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017")
collection = client["metrics"]["sensorReadings"]

cursor = collection.find(
    {},
    cursor_type=pymongo.CursorType.TAILABLE_AWAIT
).max_await_time_ms(2000)   # Wait up to 2 seconds for new data

for doc in cursor:
    print(f"Sensor {doc['sensorId']}: {doc['value']}")
```

## Using awaitData in Java

```java
MongoCollection<Document> collection = db.getCollection("sensorReadings");

MongoCursor<Document> cursor = collection
    .find()
    .cursorType(CursorType.TailableAwait)
    .maxAwaitTime(2, TimeUnit.SECONDS)
    .iterator();

while (cursor.hasNext()) {
    Document doc = cursor.next();
    System.out.println("Sensor: " + doc.getString("sensorId"));
}
```

## Setting Up the Capped Collection

The `awaitData` option requires a capped collection:

```javascript
db.createCollection("sensorReadings", {
  capped: true,
  size: 52428800,   // 50 MB
  max: 100000       // Max 100,000 documents
});

// Insert test data
db.sensorReadings.insertOne({
  sensorId: "temp-01",
  value: 22.5,
  timestamp: new Date()
});
```

## Handling Cursor Expiry

An `awaitData` cursor can still expire if the client is idle for too long or the connection is interrupted. Always wrap tailing logic in a reconnect loop for production systems.

```javascript
async function tailReliably(collection) {
  while (true) {
    try {
      const cursor = collection.find({}, { tailable: true, awaitData: true });
      for await (const doc of cursor) {
        processDocument(doc);
      }
    } catch (err) {
      console.error("Cursor error, reconnecting:", err.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Summary

The `awaitData` option transforms a tailable cursor into an efficient real-time streaming mechanism by blocking on the server when no new documents are available. This eliminates the busy-waiting loops required by plain tailable cursors, reduces client-side CPU usage, and provides lower-latency notification when new data arrives. Use it with a `maxAwaitTimeMS` setting (or the equivalent in your driver) to control how long the server blocks per batch and always implement reconnection logic for production tailing applications.
