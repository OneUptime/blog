# How to Implement Event Store with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Event Store, Event Sourcing, CQRS

Description: Learn how to implement an event store using Dapr state management to persist domain events as the system of record and derive current state by replaying events.

---

## What Is Event Sourcing?

Event sourcing stores every state change as an immutable event rather than overwriting current state. The current state is derived by replaying events in order. Dapr state management provides the persistence layer for this pattern.

## Data Model

Each aggregate (e.g., an order) stores two keys:
- `{aggregate}:{id}:events` - the list of events
- `{aggregate}:{id}:snapshot` - a periodic snapshot to speed up replay

## Configure the State Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: event-store
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Appending an Event

```javascript
const { DaprClient, StateConcurrencyEnum } = require('@dapr/dapr');
const client = new DaprClient();

async function appendEvent(aggregateId, event) {
  const eventsKey = `order:${aggregateId}:events`;

  // Use getBulk to retrieve the value along with its ETag for optimistic concurrency
  const items = await client.state.getBulk('event-store', [eventsKey]);
  const entry = items.find(i => i.key === eventsKey);
  const currentEvents = entry?.data || [];

  await client.state.save('event-store', [
    {
      key: eventsKey,
      value: [...currentEvents, { ...event, timestamp: Date.now() }],
      etag: entry?.etag,
      options: { concurrency: StateConcurrencyEnum.CONCURRENCY_FIRST_WRITE }
    }
  ]);
}
```

## Replaying Events to Rebuild State

```javascript
function applyEvent(state, event) {
  switch (event.type) {
    case 'OrderCreated':
      return { ...state, status: 'created', items: event.items, total: event.total };
    case 'OrderPaid':
      return { ...state, status: 'paid', paidAt: event.timestamp };
    case 'OrderShipped':
      return { ...state, status: 'shipped', trackingNumber: event.trackingNumber };
    case 'OrderCancelled':
      return { ...state, status: 'cancelled', reason: event.reason };
    default:
      return state;
  }
}

async function getOrderState(orderId) {
  const eventsKey = `order:${orderId}:events`;
  const events = await client.state.get('event-store', eventsKey);
  return (events || []).reduce(applyEvent, {});
}
```

## Writing Snapshots for Performance

```javascript
async function snapshotOrder(orderId) {
  const currentState = await getOrderState(orderId);
  const events = await client.state.get('event-store', `order:${orderId}:events`);

  await client.state.save('event-store', [
    {
      key: `order:${orderId}:snapshot`,
      value: { state: currentState, eventCount: events.length }
    }
  ]);
}

async function getOrderStateWithSnapshot(orderId) {
  const snapshot = await client.state.get('event-store', `order:${orderId}:snapshot`);
  const allEvents = await client.state.get('event-store', `order:${orderId}:events`);

  if (snapshot) {
    const newEvents = allEvents.slice(snapshot.eventCount);
    return newEvents.reduce(applyEvent, snapshot.state);
  }
  return (allEvents || []).reduce(applyEvent, {});
}
```

## Projecting Events for Queries

```javascript
async function getOrderHistory(orderId) {
  const events = await client.state.get('event-store', `order:${orderId}:events`);
  return events || [];
}
```

## Summary

Dapr state management provides a straightforward event store with optimistic concurrency via ETags. By storing events as immutable arrays and replaying them to reconstruct state, you gain a full audit trail, time-travel debugging, and the ability to build new projections from historical data without migrating existing records.
