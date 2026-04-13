# How to Handle Event Ordering with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Event Ordering, Event Sourcing, Concurrency, Architecture

Description: Implement correct event ordering in MongoDB event-sourced systems using stream versioning, optimistic concurrency, and ordering guarantees from change streams.

---

## Why Event Ordering is Critical

Out-of-order events cause incorrect state reconstruction. For example, processing `OrderCancelled` before `OrderPlaced` would produce invalid state. MongoDB provides several mechanisms to enforce ordering:

- **Stream versioning**: sequential version numbers per aggregate
- **Optimistic concurrency control**: unique index prevents concurrent writes at the same position
- **Change stream ordering**: events from a single shard are delivered in oplog order

## Strategy 1: Per-Stream Sequential Versioning

Assign a monotonically increasing version to each event within a stream:

```javascript
async function appendEvent(streamId, eventType, data, expectedVersion) {
  const nextVersion = expectedVersion + 1;

  // The unique index (streamId, streamVersion) enforces ordering
  await db.collection("events").insertOne({
    streamId,
    streamVersion: nextVersion,
    eventType,
    data,
    occurredAt: new Date()
  });

  return nextVersion;
}

// Caller provides expected version - concurrency conflict if wrong
try {
  const currentVersion = await getStreamVersion("order:ORD-001");
  await appendEvent("order:ORD-001", "OrderPaid", { amount: 99 }, currentVersion);
} catch (err) {
  if (err.code === 11000) {
    // Another writer appended concurrently - retry with updated version
    throw new ConcurrencyError("Stream was modified concurrently");
  }
}
```

## Strategy 2: Using findOneAndUpdate for Atomic Version Increment

Avoid reading the current version separately by using an atomic update:

```javascript
async function appendEventAtomic(streamId, eventType, data) {
  // Get and increment version atomically
  const streamMeta = await db.collection("stream_meta").findOneAndUpdate(
    { streamId },
    { $inc: { version: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  await db.collection("events").insertOne({
    streamId,
    streamVersion: streamMeta.version,
    eventType,
    data,
    occurredAt: new Date()
  });

  return streamMeta.version;
}
```

## Strategy 3: Global Ordering with a Sequence Generator

For global event ordering across all streams, use a sequence counter:

```javascript
async function getNextGlobalSequence() {
  const result = await db.collection("sequences").findOneAndUpdate(
    { _id: "global_event_sequence" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return result.value;
}

async function appendGlobalEvent(streamId, eventType, data) {
  const globalSeq = await getNextGlobalSequence();
  await db.collection("events").insertOne({
    streamId,
    globalSequence: globalSeq,
    eventType,
    data,
    occurredAt: new Date()
  });
}
```

## Reading Events in Order

Always sort explicitly by `streamVersion` for aggregate-scoped reads:

```javascript
const events = await db.collection("events")
  .find({ streamId: "order:ORD-001" })
  .sort({ streamVersion: 1 })  // Critical: never rely on insertion order
  .toArray();
```

For global ordering across all streams:

```javascript
const allEvents = await db.collection("events")
  .find({})
  .sort({ globalSequence: 1 })
  .toArray();
```

## Change Stream Ordering Guarantees

Change streams deliver events in oplog order, which is consistent with causal ordering within a single shard:

```javascript
const changeStream = db.collection("events").watch([], {
  fullDocument: "updateLookup"
});

// Events arrive in oplog order - safe to process sequentially
changeStream.on("change", async (event) => {
  // Process in received order, no sorting needed
  await handleEvent(event.fullDocument);
});
```

Note: On sharded clusters, change streams provide a total ordering across shards using cluster time (since MongoDB 4.0). However, cross-shard ordering is based on cluster time rather than strict causality, so use `globalSequence` if your application requires causal ordering across different streams on different shards.

## Summary

Event ordering in MongoDB is enforced through per-stream version numbers backed by a unique compound index that prevents concurrent appends at the same position. For global ordering across streams, use an atomic counter collection. Always read events with explicit sort on version fields rather than relying on natural insertion order. Change streams deliver events in oplog order within a shard, making them reliable for reactive projections without additional sorting.
