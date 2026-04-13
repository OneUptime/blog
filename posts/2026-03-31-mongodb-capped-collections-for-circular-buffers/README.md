# How to Use Capped Collections for Circular Buffers in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Circular Buffer, Performance, Storage

Description: Learn how MongoDB capped collections act as circular buffers, automatically overwriting the oldest documents when the collection reaches its maximum size.

---

## What Is a Circular Buffer in MongoDB?

A circular buffer is a fixed-size data structure that overwrites the oldest entries when it fills up. MongoDB capped collections implement this behavior natively. When you define a maximum size (and optionally a maximum document count), MongoDB automatically removes the oldest documents to make room for new ones.

This makes capped collections ideal for use cases like rolling log windows, event queues, and metric streams where you only care about recent data.

## Creating a Capped Collection as a Circular Buffer

Create a capped collection with a fixed byte size:

```javascript
db.createCollection("recentEvents", {
  capped: true,
  size: 10485760  // 10 MB circular buffer
});
```

You can also set a maximum document count alongside the size limit:

```javascript
db.createCollection("recentEvents", {
  capped: true,
  size: 10485760,
  max: 10000        // never exceed 10,000 documents
});
```

Both limits are enforced simultaneously. Documents are removed when either limit is exceeded.

## Inserting Data into the Circular Buffer

Inserts work the same as on any collection:

```javascript
db.recentEvents.insertOne({
  eventType: "pageView",
  userId: "user_123",
  timestamp: new Date()
});
```

Once the collection reaches its size or count limit, MongoDB automatically removes the oldest document before inserting the new one - no application-level cleanup needed.

## Reading Data in Insertion Order

Capped collections preserve insertion order, making them efficient to scan sequentially:

```javascript
// Read the most recent 100 events
db.recentEvents.find().sort({ $natural: -1 }).limit(100);
```

The `$natural` sort reads documents in their natural insertion order. Reverse natural order gives you the newest documents first.

## Using Tailable Cursors to Stream New Data

A key feature of capped collections is that they support tailable cursors, which wait for new documents instead of closing when the result set is exhausted:

```javascript
const cursor = db.recentEvents.find().tailable().awaitData();

while (cursor.hasNext() || cursor.isExhausted() === false) {
  if (cursor.hasNext()) {
    printjson(cursor.next());
  }
}
```

This makes capped collections a lightweight pub/sub mechanism for real-time data pipelines.

## Converting a Regular Collection to a Capped Collection

You can convert an existing collection to a capped collection using `convertToCapped`. Note that this removes insertion order guarantees for existing documents:

```javascript
db.runCommand({
  convertToCapped: "recentEvents",
  size: 10485760
});
```

## Checking Collection Stats

To verify that your capped collection is operating as expected:

```javascript
db.recentEvents.stats();
```

Look for `"capped": true` and the `maxSize` and `count` fields in the output to confirm the circular buffer configuration.

## Limitations to Keep in Mind

- You cannot update a document in a way that changes its size (updates that grow a document are rejected).
- Capped collections do not support sharding.
- Deleting individual documents is not allowed; the entire collection can be dropped but not partially cleared.

## Summary

MongoDB capped collections are built-in circular buffers that automatically expire the oldest data as new documents are inserted. By setting a size limit (and optionally a max document count), you get a predictable, fixed-footprint store ideal for recent event logs, metrics, and real-time streaming. Pair them with tailable cursors for a lightweight, serverless-style data stream.
