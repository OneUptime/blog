# How to Query Documents Updated After a Specific Time in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Timestamp, Index, Change Stream

Description: Learn how to query MongoDB documents modified after a specific timestamp using updatedAt fields, ObjectId ranges, and change streams.

---

Querying for recently modified documents is a common pattern for synchronization, auditing, and incremental data processing. MongoDB offers several approaches depending on how your schema tracks modification time.

## Using a Dedicated updatedAt Field

The most explicit and reliable approach is maintaining an `updatedAt` timestamp on every document:

```javascript
// Insert with timestamps
db.products.insertOne({
  name: "Widget",
  price: 29.99,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Update with timestamp refresh
db.products.updateOne(
  { _id: productId },
  {
    $set: {
      price: 34.99,
      updatedAt: new Date()
    }
  }
)

// Query: find products updated after a specific time
const since = new Date("2024-06-01T00:00:00Z");

db.products.find({
  updatedAt: { $gt: since }
})
```

## Creating an Index on updatedAt

Always index the field used in time-range queries:

```javascript
db.products.createIndex({ updatedAt: 1 })

// Compound index if filtering by additional fields
db.products.createIndex({ category: 1, updatedAt: 1 })
```

## Querying with ISO String vs Date Object

MongoDB stores dates as BSON Date type. Always use `new Date()` or `ISODate()` rather than string comparisons:

```javascript
// CORRECT - uses BSON Date comparison
db.events.find({
  updatedAt: { $gt: new Date("2024-06-01T00:00:00Z") }
})

// WRONG - string comparison, unreliable
db.events.find({
  updatedAt: { $gt: "2024-06-01T00:00:00Z" }
})
```

## Querying Between Two Times

```javascript
db.orders.find({
  updatedAt: {
    $gte: new Date("2024-06-01T00:00:00Z"),
    $lt: new Date("2024-07-01T00:00:00Z")
  }
})
```

## Using ObjectId for Creation Time (Not Update Time)

ObjectId encodes creation time only - it does not reflect updates. Use it only when querying documents created after a time, not modified:

```javascript
function objectIdAfter(date) {
  return ObjectId.createFromTime(Math.floor(date.getTime() / 1000));
}

// Documents CREATED after a date
db.users.find({
  _id: { $gt: objectIdAfter(new Date("2024-06-01")) }
})
```

## Using Change Streams for Real-Time Updates

For real-time notification of changes, use change streams instead of polling:

```javascript
const changeStream = db.collection("products").watch([
  { $match: { operationType: { $in: ["update", "replace"] } } }
]);

changeStream.on("change", (event) => {
  console.log("Document updated:", event.documentKey._id);
  console.log("Updated fields:", event.updateDescription?.updatedFields);
});
```

## Reliable Incremental Sync

An `updatedAt` range is useful for ad hoc or best-effort polling, but it is not a lossless sync cursor. BSON dates have millisecond precision, so multiple documents can have the same timestamp. More importantly, a concurrent write can become visible after a scan even though its application-supplied `updatedAt` value is less than or equal to the scan's new checkpoint. The next query's `$gt` filter would skip that write permanently.

No read and write concern combination fixes this multi-document watermark. A [`"majority"` read](https://www.mongodb.com/docs/manual/reference/read-concern-majority/) returns durable data, but MongoDB notes that it may not reflect the most recent data. [`"linearizable"` read concern](https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/) is also not a solution: its guarantees apply to queries that uniquely identify a single document, not a range scan over many documents.

For reliable incremental processing on a replica set or sharded cluster, use a [change stream](https://www.mongodb.com/docs/manual/changestreams/) and persist its resume token:

```javascript
async function consumeChanges(resumeToken) {
  const products = db.collection("products");
  const options = resumeToken ? { startAfter: resumeToken } : {};
  const changeStream = products.watch([], options);

  try {
    for await (const change of changeStream) {
      // Make this operation idempotent because an event can be replayed if
      // processing succeeds but saving the resume token fails.
      await applyChangeIdempotently(change);

      // Every change event's _id is its resume token. Save it only after the
      // destination has accepted the event.
      await saveResumeToken(change._id);
    }
  } finally {
    await changeStream.close();
  }
}

await consumeChanges(await loadResumeToken());
```

Change streams emit only majority-committed, durable changes and can restart after the saved event with `startAfter`. Unlike `resumeAfter`, `startAfter` also accepts an `invalidate` event's token after a collection is dropped or renamed. The consumer must still handle that invalidation explicitly, which commonly means resetting the destination and performing a new initial sync. The oplog must contain the event represented by any saved token; if it does not, perform a new initial sync. Opening a stream without a token watches future changes only, so coordinate the initial data copy with creation of the first change-stream checkpoint.

## Summary

For querying documents updated after a specific time, maintain an explicit `updatedAt` field that your application updates on every write. Always use BSON `Date` objects in comparisons and index the `updatedAt` field. For reliable incremental processing, use change streams with persisted resume tokens instead of treating an `updatedAt` polling watermark as lossless.
