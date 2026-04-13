# How to Query a Capped Collection with Tailable Cursors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Tailable Cursor, Change Streaming, Real-Time

Description: Learn how to use tailable cursors on MongoDB capped collections to receive new documents in real time, similar to Unix tail -f behavior.

---

## Overview

A tailable cursor is a special cursor that remains open after exhausting its initial results and continues to return new documents as they are inserted into a capped collection. This behavior is similar to the Unix `tail -f` command and is useful for real-time log streaming, event processing, and message queues.

## Prerequisites

Tailable cursors only work on capped collections. Create one first:

```javascript
db.createCollection("events", {
  capped: true,
  size: 10485760,  // 10 MB
  max: 10000
});
```

## Opening a Tailable Cursor (mongo Shell)

```javascript
// Opens a tailable, awaitData cursor that waits for new documents
var cursor = db.events.find({}).addOption(DBQuery.Option.tailable).addOption(DBQuery.Option.awaitData);

while (cursor.hasNext()) {
  printjson(cursor.next());
}
```

## Using Tailable Cursors in Node.js

```javascript
const { MongoClient } = require("mongodb");

async function tailCollection() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();
  const collection = client.db("myapp").collection("events");

  // Ensure the collection has at least one document before opening the cursor
  const cursor = collection.find(
    {},
    { tailable: true, awaitData: true }
  );

  for await (const doc of cursor) {
    console.log("New event:", doc);
  }
}

tailCollection().catch(console.error);
```

The `awaitData` option makes the server wait up to 1 second for new data before returning an empty batch, reducing CPU usage from polling.

## Tailable Cursor with a Filter

You can apply a filter to receive only matching documents:

```javascript
const cursor = collection.find(
  { level: "ERROR" },
  { tailable: true, awaitData: true }
);

for await (const doc of cursor) {
  console.log("Error event:", doc);
  await alertTeam(doc);
}
```

## Handling Cursor Invalidation

A tailable cursor becomes invalid if:

- The capped collection is dropped or re-created.
- The cursor falls too far behind and documents are overwritten before being read.

Always implement reconnection logic:

```javascript
async function watchEvents(collection) {
  while (true) {
    try {
      const cursor = collection.find(
        {},
        { tailable: true, awaitData: true }
      );

      for await (const doc of cursor) {
        processEvent(doc);
      }
    } catch (err) {
      console.error("Cursor error, reconnecting:", err.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
```

## Difference Between tailable and awaitData

| Option | Behavior |
|---|---|
| `tailable: true` | Cursor stays open after last document |
| `awaitData: true` | Server waits briefly for new data before returning empty batch |

Using both together is the recommended pattern for low-latency, low-CPU polling.

## Using Tailable Cursors in PyMongo

```python
import pymongo
import time

client = pymongo.MongoClient("mongodb://localhost:27017/")
collection = client["myapp"]["events"]

cursor = collection.find(
    {},
    cursor_type=pymongo.CursorType.TAILABLE_AWAIT
)

while cursor.alive:
    try:
        doc = next(cursor)
        print("New doc:", doc)
    except StopIteration:
        time.sleep(0.1)
```

## Practical Use Case: Real-Time Log Consumer

```javascript
const { MongoClient } = require("mongodb");

async function streamLogs() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const logs = client.db("app").collection("logs");

  // Insert a seed document if empty (required for tailable cursors)
  const count = await logs.countDocuments();
  if (count === 0) {
    await logs.insertOne({ init: true, timestamp: new Date() });
  }

  const cursor = logs.find(
    { init: { $exists: false } },
    { tailable: true, awaitData: true }
  );

  console.log("Streaming logs...");
  for await (const log of cursor) {
    console.log(`[${log.level}] ${log.timestamp.toISOString()} - ${log.message}`);
  }
}

streamLogs();
```

## Summary

Tailable cursors allow applications to receive new documents from capped collections as they are inserted, without polling. By combining `tailable: true` with `awaitData: true`, you get an efficient real-time stream that reduces both latency and server load. Always handle cursor invalidation with reconnection logic to make your consumer resilient to collection resets and data overruns.
