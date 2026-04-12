# How to Use MongoDB as an Event Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Event Sourcing, Event Store, Architecture, CQRS

Description: Use MongoDB as an event store for event sourcing architectures, storing immutable domain events as the source of truth for application state.

---

## What is an Event Store

An event store records all state changes as a sequence of immutable events rather than storing only current state. MongoDB is well-suited as an event store because:
- Documents map naturally to events (schema-flexible)
- Atomic appends with optimistic concurrency control
- Change streams enable reactive projections
- TTL indexes can automatically expire old events

## Event Document Schema

Design events with these fields for a practical event store:

```javascript
{
  _id: ObjectId(),
  streamId: "order:ORD-001",       // Aggregate identifier
  streamVersion: 5,                 // Position within the stream
  eventType: "OrderShipped",        // Domain event type
  occurredAt: ISODate("2026-03-31T10:00:00Z"),
  data: {                           // Event payload
    orderId: "ORD-001",
    carrier: "FedEx",
    trackingNumber: "FX123456789"
  },
  metadata: {
    correlationId: "req-abc-123",
    causationId: "cmd-xyz-456",
    userId: "user-789"
  }
}
```

## Creating the Events Collection

```javascript
db.createCollection("events")

// Unique index prevents duplicate stream versions (optimistic concurrency)
db.events.createIndex(
  { streamId: 1, streamVersion: 1 },
  { unique: true }
)

// Index for reading all events of a type
db.events.createIndex({ eventType: 1, occurredAt: 1 })
```

## Appending Events with Optimistic Concurrency

```javascript
async function appendEvent(streamId, expectedVersion, eventType, data) {
  const nextVersion = expectedVersion + 1;

  try {
    await db.collection("events").insertOne({
      streamId,
      streamVersion: nextVersion,
      eventType,
      occurredAt: new Date(),
      data,
      metadata: { correlationId: generateId() }
    });
    return nextVersion;
  } catch (err) {
    if (err.code === 11000) {
      throw new Error(`Concurrency conflict on stream ${streamId}`);
    }
    throw err;
  }
}
```

The unique index on `(streamId, streamVersion)` ensures that two concurrent writers cannot insert the same version - the second one receives a duplicate key error.

## Reading an Event Stream

```javascript
async function loadStream(streamId, fromVersion = 0) {
  return db.collection("events")
    .find({ streamId, streamVersion: { $gte: fromVersion } })
    .sort({ streamVersion: 1 })
    .toArray();
}

// Reconstruct aggregate state by replaying events
async function rebuildOrderState(orderId) {
  const events = await loadStream(`order:${orderId}`);
  return events.reduce(applyEvent, initialOrderState());
}
```

## Building Projections with Change Streams

Keep read-model collections in sync:

```javascript
const changeStream = db.collection("events").watch([
  { $match: { "fullDocument.eventType": { $in: ["OrderPlaced", "OrderShipped"] } } }
], { fullDocument: "updateLookup" });

changeStream.on("change", async ({ fullDocument }) => {
  if (fullDocument.eventType === "OrderShipped") {
    await db.collection("order_summary").updateOne(
      { orderId: fullDocument.data.orderId },
      { $set: { status: "shipped", carrier: fullDocument.data.carrier } }
    );
  }
});
```

## Summary

MongoDB serves as an effective event store by treating each domain event as an immutable document in an `events` collection. A unique compound index on `(streamId, streamVersion)` provides optimistic concurrency control, preventing concurrent writers from inserting conflicting versions. Load and replay events ordered by `streamVersion` to rebuild aggregate state. Use change streams to maintain eventually consistent read-model projections, completing the CQRS pattern.
