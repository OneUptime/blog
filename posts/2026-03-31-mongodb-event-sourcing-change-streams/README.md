# How to Build Event Sourcing with MongoDB Change Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Event Sourcing, Change Stream, CQRS, Architecture

Description: Implement an event sourcing pattern using MongoDB Change Streams to build an audit log, derive read models, and publish domain events to downstream services.

---

Event sourcing stores state as a sequence of immutable events rather than mutable records. MongoDB Change Streams provide a natural mechanism for capturing those events and propagating them to read models, caches, and external services without tight coupling.

## Event Store Collection Design

```javascript
// Each document in the event store is an immutable event
db.createCollection("orderEvents", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["aggregateId", "eventType", "payload", "version", "occurredAt"],
      properties: {
        aggregateId: { bsonType: "string" },
        eventType: { bsonType: "string" },
        version: { bsonType: "number" },
        payload: { bsonType: "object" },
        occurredAt: { bsonType: "date" }
      }
    }
  }
});

db.orderEvents.createIndex({ aggregateId: 1, version: 1 }, { unique: true });
```

## Appending Events

```javascript
async function appendEvent(db, aggregateId, eventType, payload, expectedVersion) {
  const event = {
    aggregateId,
    eventType,
    payload,
    version: expectedVersion + 1,
    occurredAt: new Date()
  };

  try {
    await db.collection("orderEvents").insertOne(event);
  } catch (err) {
    if (err.code === 11000) {
      throw new Error(`Optimistic concurrency conflict on aggregate ${aggregateId}`);
    }
    throw err;
  }
}
```

## Rebuilding Aggregate State

```javascript
async function loadOrder(db, orderId) {
  const events = await db.collection("orderEvents")
    .find({ aggregateId: orderId })
    .sort({ version: 1 })
    .toArray();

  return events.reduce(applyEvent, null);
}

function applyEvent(state, event) {
  switch (event.eventType) {
    case "OrderPlaced":
      return { id: event.aggregateId, status: "placed", items: event.payload.items, total: event.payload.total };
    case "OrderShipped":
      return { ...state, status: "shipped", trackingNumber: event.payload.trackingNumber };
    case "OrderCancelled":
      return { ...state, status: "cancelled", reason: event.payload.reason };
    default:
      return state;
  }
}
```

## Building a Read Model with Change Streams

```javascript
const { MongoClient } = require("mongodb");

async function buildOrderReadModel() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db("shop");
  const eventStream = db.collection("orderEvents").watch([], {
    fullDocument: "updateLookup"
  });

  for await (const change of eventStream) {
    if (change.operationType !== "insert") continue;

    const event = change.fullDocument;
    const orders = db.collection("ordersReadModel");

    switch (event.eventType) {
      case "OrderPlaced":
        await orders.insertOne({
          _id: event.aggregateId,
          status: "placed",
          items: event.payload.items,
          total: event.payload.total,
          updatedAt: event.occurredAt
        });
        break;

      case "OrderShipped":
        await orders.updateOne(
          { _id: event.aggregateId },
          { $set: { status: "shipped", trackingNumber: event.payload.trackingNumber, updatedAt: event.occurredAt } }
        );
        break;
    }
  }
}
```

## Publishing to External Services

```javascript
const Kafka = require("kafkajs").Kafka;

const kafka = new Kafka({ brokers: ["broker:9092"] });
const producer = kafka.producer();
await producer.connect();

eventStream.on("change", async (change) => {
  if (change.operationType !== "insert") return;
  const event = change.fullDocument;

  await producer.send({
    topic: `order-events`,
    messages: [
      {
        key: event.aggregateId,
        value: JSON.stringify(event)
      }
    ]
  });
});
```

## Snapshotting for Performance

When an aggregate has many events, rebuilding state from scratch is slow. Store periodic snapshots:

```javascript
async function saveSnapshot(db, aggregateId, state, version) {
  await db.collection("orderSnapshots").replaceOne(
    { aggregateId },
    { aggregateId, state, version, savedAt: new Date() },
    { upsert: true }
  );
}

async function loadOrderFromSnapshot(db, orderId) {
  const snapshot = await db.collection("orderSnapshots").findOne({ aggregateId: orderId });
  const fromVersion = snapshot ? snapshot.version : 0;

  const events = await db.collection("orderEvents")
    .find({ aggregateId: orderId, version: { $gt: fromVersion } })
    .sort({ version: 1 })
    .toArray();

  return events.reduce(applyEvent, snapshot?.state ?? null);
}
```

## Summary

MongoDB Change Streams integrate naturally with event sourcing by providing a push-based mechanism to project events into read models and publish them to external services. Combine an append-only event store collection, optimistic concurrency via unique version indexes, Change Stream projectors, and periodic snapshots to build a production-grade event-sourced system on MongoDB.
