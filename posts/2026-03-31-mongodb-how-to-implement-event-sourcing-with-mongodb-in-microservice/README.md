# How to Implement Event Sourcing with MongoDB in Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Event Sourcing, Microservice, Architecture, Node.js

Description: Learn how to implement event sourcing in a microservices architecture using MongoDB as the event store for reliable, auditable state management.

---

## What Is Event Sourcing

Event sourcing is a pattern where application state is derived by replaying a sequence of immutable events stored in an event store. Instead of persisting current state, you store every state-changing event. MongoDB is well-suited for this because of its flexible document model, change streams, and efficient write performance.

In a microservices context, each service owns its own event store collection and publishes domain events that other services can consume.

## Event Store Schema

```javascript
// events collection schema
{
  _id: ObjectId,
  aggregateId: "order-123",        // domain object ID
  aggregateType: "Order",          // domain type
  eventType: "OrderPlaced",        // event name
  eventVersion: 1,                 // schema version
  sequenceNumber: 42,              // monotonic per-aggregate sequence
  occurredAt: ISODate("2026-03-31T12:00:00Z"),
  payload: {                       // event-specific data
    customerId: "cust-456",
    items: [{ sku: "PROD-789", qty: 2, price: 29.99 }],
    total: 59.98
  },
  metadata: {
    correlationId: "req-abc",
    causationId: "cmd-xyz",
    userId: "user-001"
  }
}
```

## Setting Up the Event Store

```javascript
// eventStore.js
const { MongoClient } = require('mongodb');

class MongoEventStore {
  constructor(db) {
    this.events = db.collection('events');
  }

  async initialize() {
    // Ensure unique sequence numbers per aggregate
    await this.events.createIndex(
      { aggregateId: 1, sequenceNumber: 1 },
      { unique: true }
    );
    await this.events.createIndex({ aggregateType: 1, occurredAt: -1 });
    await this.events.createIndex({ eventType: 1 });
  }

  async appendEvent(aggregateId, aggregateType, eventType, payload, metadata = {}) {
    const lastEvent = await this.events.findOne(
      { aggregateId },
      { sort: { sequenceNumber: -1 }, projection: { sequenceNumber: 1 } }
    );

    const sequenceNumber = lastEvent ? lastEvent.sequenceNumber + 1 : 1;

    const event = {
      aggregateId,
      aggregateType,
      eventType,
      eventVersion: 1,
      sequenceNumber,
      occurredAt: new Date(),
      payload,
      metadata
    };

    try {
      await this.events.insertOne(event);
      return event;
    } catch (err) {
      if (err.code === 11000) {
        throw new Error(`Concurrency conflict for aggregate ${aggregateId}`);
      }
      throw err;
    }
  }

  async getEvents(aggregateId, fromSequence = 1) {
    return this.events
      .find({ aggregateId, sequenceNumber: { $gte: fromSequence } })
      .sort({ sequenceNumber: 1 })
      .toArray();
  }

  async getEventsByType(eventType, since) {
    const query = { eventType };
    if (since) query.occurredAt = { $gt: since };
    return this.events.find(query).sort({ occurredAt: 1 }).toArray();
  }
}

module.exports = MongoEventStore;
```

## Aggregate with Event Sourcing

```javascript
// OrderAggregate.js
class Order {
  constructor() {
    this.id = null;
    this.status = null;
    this.items = [];
    this.total = 0;
    this.customerId = null;
    this._version = 0;
    this._pendingEvents = [];
  }

  // Replay events to reconstruct state
  static fromEvents(events) {
    const order = new Order();
    for (const event of events) {
      order._apply(event);
      order._version = event.sequenceNumber;
    }
    return order;
  }

  // Command: place order
  place(id, customerId, items) {
    if (this.status) throw new Error('Order already exists');
    const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
    this._raise('OrderPlaced', { id, customerId, items, total });
  }

  // Command: confirm order
  confirm() {
    if (this.status !== 'pending') throw new Error('Order is not pending');
    this._raise('OrderConfirmed', { confirmedAt: new Date() });
  }

  // Command: cancel order
  cancel(reason) {
    if (this.status === 'cancelled') throw new Error('Already cancelled');
    this._raise('OrderCancelled', { reason, cancelledAt: new Date() });
  }

  _raise(eventType, payload) {
    const event = { eventType, payload };
    this._apply(event);
    this._pendingEvents.push(event);
  }

  _apply(event) {
    switch (event.eventType) {
      case 'OrderPlaced':
        this.id = event.payload.id;
        this.customerId = event.payload.customerId;
        this.items = event.payload.items;
        this.total = event.payload.total;
        this.status = 'pending';
        break;
      case 'OrderConfirmed':
        this.status = 'confirmed';
        break;
      case 'OrderCancelled':
        this.status = 'cancelled';
        break;
    }
  }

  popPendingEvents() {
    const events = [...this._pendingEvents];
    this._pendingEvents = [];
    return events;
  }
}

module.exports = Order;
```

## Order Service with Event Store

```javascript
// orderService.js
const Order = require('./OrderAggregate');

class OrderService {
  constructor(eventStore) {
    this.eventStore = eventStore;
  }

  async placeOrder(orderId, customerId, items) {
    const order = new Order();
    order.place(orderId, customerId, items);

    for (const event of order.popPendingEvents()) {
      await this.eventStore.appendEvent(
        orderId,
        'Order',
        event.eventType,
        event.payload,
        { userId: customerId }
      );
    }

    return order;
  }

  async confirmOrder(orderId) {
    const events = await this.eventStore.getEvents(orderId);
    if (!events.length) throw new Error('Order not found');

    const order = Order.fromEvents(events);
    order.confirm();

    for (const event of order.popPendingEvents()) {
      await this.eventStore.appendEvent(
        orderId,
        'Order',
        event.eventType,
        event.payload
      );
    }

    return order;
  }

  async getOrder(orderId) {
    const events = await this.eventStore.getEvents(orderId);
    if (!events.length) return null;
    return Order.fromEvents(events);
  }
}

module.exports = OrderService;
```

## Projections Using Change Streams

```javascript
// orderProjection.js - maintains a read model
class OrderProjection {
  constructor(db, eventStore) {
    this.readModel = db.collection('orders_read_model');
    this.eventStore = eventStore;
  }

  async startWatching() {
    const pipeline = [
      { $match: { 'fullDocument.aggregateType': 'Order' } }
    ];

    const changeStream = this.eventStore.events.watch(pipeline, {
      fullDocument: 'updateLookup'
    });

    changeStream.on('change', async (change) => {
      if (change.operationType === 'insert') {
        await this._handleEvent(change.fullDocument);
      }
    });

    return changeStream;
  }

  async _handleEvent(event) {
    const { aggregateId, eventType, payload } = event;

    switch (eventType) {
      case 'OrderPlaced':
        await this.readModel.insertOne({
          _id: aggregateId,
          customerId: payload.customerId,
          items: payload.items,
          total: payload.total,
          status: 'pending',
          placedAt: event.occurredAt
        });
        break;

      case 'OrderConfirmed':
        await this.readModel.updateOne(
          { _id: aggregateId },
          { $set: { status: 'confirmed', confirmedAt: payload.confirmedAt } }
        );
        break;

      case 'OrderCancelled':
        await this.readModel.updateOne(
          { _id: aggregateId },
          { $set: { status: 'cancelled', cancelReason: payload.reason } }
        );
        break;
    }
  }
}

module.exports = OrderProjection;
```

## Snapshots for Performance

```javascript
// snapshotStore.js
class SnapshotStore {
  constructor(db) {
    this.snapshots = db.collection('snapshots');
  }

  async saveSnapshot(aggregateId, state, version) {
    await this.snapshots.replaceOne(
      { aggregateId },
      { aggregateId, state, version, savedAt: new Date() },
      { upsert: true }
    );
  }

  async getSnapshot(aggregateId) {
    return this.snapshots.findOne({ aggregateId });
  }
}

// Usage in service: load from snapshot + newer events
async function loadOrderWithSnapshot(aggregateId, eventStore, snapshotStore) {
  const snapshot = await snapshotStore.getSnapshot(aggregateId);
  const fromSequence = snapshot ? snapshot.version + 1 : 1;
  const events = await eventStore.getEvents(aggregateId, fromSequence);

  const order = new Order();
  if (snapshot) Object.assign(order, snapshot.state, { _version: snapshot.version });
  for (const event of events) {
    order._apply(event);
    order._version = event.sequenceNumber;
  }

  // Save new snapshot every 50 events
  if (events.length >= 50) {
    await snapshotStore.saveSnapshot(aggregateId, { ...order }, order._version);
  }

  return order;
}
```

## Summary

Event sourcing with MongoDB in microservices gives you a complete audit trail, time-travel debugging, and the ability to rebuild read models from scratch. By using MongoDB as the event store, you leverage change streams for real-time projections, unique indexes for optimistic concurrency control, and the flexible document schema for varied event payloads. Snapshots keep replay performance manageable as aggregate event counts grow.
