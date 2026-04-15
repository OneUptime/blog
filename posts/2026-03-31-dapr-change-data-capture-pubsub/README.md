# How to Implement Change Data Capture with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Change Data Capture, CDC, Event-Driven

Description: Learn how to implement change data capture using Dapr pub/sub to propagate database changes as events to downstream consumers in real time.

---

## What Is Change Data Capture?

Change Data Capture (CDC) turns database mutations (inserts, updates, deletes) into a stream of events that downstream services can consume. Dapr pub/sub acts as the delivery mechanism for these change events, decoupling producers from consumers.

## Architecture

1. A database trigger or outbox table detects changes.
2. A CDC publisher service reads changes and publishes events via Dapr.
3. Consumer services subscribe and react to changes.

## Configure Pub/Sub

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cdc-pubsub
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: consumerGroup
      value: "cdc-consumers"
    - name: authType
      value: "none"
```

## Outbox Pattern Publisher

Use the transactional outbox to guarantee at-least-once publishing:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Step 1: Write to DB and outbox in the same transaction
async function updateCustomer(customerId, changes) {
  await db.transaction(async (trx) => {
    await trx('customers').update(changes).where({ id: customerId });
    await trx('outbox').insert({
      id: generateId(),
      topic: 'customer.updated',
      payload: JSON.stringify({ customerId, changes, changedAt: Date.now() }),
      published: false
    });
  });
}

// Step 2: Poll outbox and publish unpublished events
async function flushOutbox() {
  const pending = await db('outbox').where({ published: false }).limit(100);

  for (const event of pending) {
    await client.pubsub.publish('cdc-pubsub', event.topic, JSON.parse(event.payload));
    await db('outbox').update({ published: true }).where({ id: event.id });
  }
}

// Run flush every second
setInterval(flushOutbox, 1000);
```

## Consumer: Sync to Search Index

```javascript
const { DaprServer } = require('@dapr/dapr');
const server = new DaprServer();

await server.pubsub.subscribe('cdc-pubsub', 'customer.updated', async (event) => {
  await searchIndex.upsert({
    id: event.customerId,
    ...event.changes
  });
  console.log(`Search index updated for customer ${event.customerId}`);
});
```

## Consumer: Invalidate Cache

```javascript
await server.pubsub.subscribe('cdc-pubsub', 'customer.updated', async (event) => {
  await client.state.delete('cache-store', `customer:${event.customerId}`);
  console.log(`Cache invalidated for customer ${event.customerId}`);
});
```

## Consumer: Sync to Analytics Warehouse

```javascript
await server.pubsub.subscribe('cdc-pubsub', 'customer.updated', async (event) => {
  await analyticsWarehouse.upsert('customers_dim', {
    customer_id: event.customerId,
    ...event.changes,
    updated_at: event.changedAt
  });
});
```

## Dead Letter Handling

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: cdc-subscription
spec:
  topic: customer.updated
  routes:
    default: /cdc/customer-updated
  pubsubname: cdc-pubsub
  deadLetterTopic: cdc-dead-letter
```

## Summary

CDC with Dapr pub/sub and the outbox pattern ensures database changes are reliably propagated as events without dual-write race conditions. Multiple consumer services can independently react to the same change stream - updating caches, search indexes, and analytics warehouses in parallel.
