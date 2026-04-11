# How to Build a CQRS Read Model with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CQRS, Read Model, Event Sourcing, Architecture, Node.js

Description: Learn how to build a fast CQRS read model using Redis as the query-side store, projecting events from the write side into denormalized, query-optimized data structures.

---

## CQRS and Read Models Explained

Command Query Responsibility Segregation (CQRS) separates write operations (commands) from read operations (queries). The read model is a denormalized, query-optimized projection of the application state built from domain events published by the write side.

Redis is an excellent read model store because:
- Sub-millisecond reads for UI queries
- Flexible data structures (Hashes, Sorted Sets, Sets) for different query patterns
- Easy to rebuild by replaying events
- Scales horizontally with Redis Cluster

## Architecture

```text
Write Side                   Read Side
----------                   ---------
Command --> Aggregate --> Event --> Projector --> Redis Read Model
              (DB)       (Stream)               (Hashes, ZSets, Sets)
                                                       |
                                                  Query Handler
                                                       |
                                                    Client
```

## Defining Read Model Projections

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Project order events into a Redis Hash read model
async function projectOrderEvent(event) {
  const { type, payload } = event;

  if (type === 'OrderCreated') {
    const { orderId, userId, items, total, createdAt } = payload;

    // Store order summary as a Hash
    await redis.hset(`order:${orderId}`, {
      id: orderId,
      userId,
      status: 'pending',
      total: String(total),
      itemCount: String(items.length),
      createdAt,
    });

    // Add to user's order index
    await redis.zadd(`user:${userId}:orders`, Date.parse(createdAt), orderId);

    // Add to global orders sorted by time
    await redis.zadd('orders:by_date', Date.parse(createdAt), orderId);

    // Add to pending orders set
    await redis.sadd('orders:pending', orderId);

    // Update order count per user
    await redis.hincrby(`user:${userId}:stats`, 'orderCount', 1);
    await redis.hincrbyfloat(`user:${userId}:stats`, 'totalSpend', total);
  }

  if (type === 'OrderPaid') {
    const { orderId } = payload;
    await redis.hset(`order:${orderId}`, 'status', 'paid');
    await redis.sadd('orders:paid', orderId);
    await redis.srem('orders:pending', orderId);
  }

  if (type === 'OrderShipped') {
    const { orderId, trackingNumber } = payload;
    await redis.hset(`order:${orderId}`, {
      status: 'shipped',
      trackingNumber,
    });
  }

  if (type === 'OrderCancelled') {
    const { orderId, userId } = payload;
    await redis.hset(`order:${orderId}`, 'status', 'cancelled');
    await redis.sadd('orders:cancelled', orderId);
    await redis.srem('orders:pending', orderId);
    await redis.hincrby(`user:${userId}:stats`, 'cancelledOrders', 1);
  }
}
```

## Query Handlers for the Read Side

```javascript
// Query: Get order by ID
async function getOrder(orderId) {
  const order = await redis.hgetall(`order:${orderId}`);
  return Object.keys(order).length > 0 ? order : null;
}

// Query: Get recent orders for a user
async function getUserOrders(userId, page = 0, pageSize = 20) {
  const start = page * pageSize;
  const end = start + pageSize - 1;

  // Get order IDs sorted by date descending
  const orderIds = await redis.zrevrange(`user:${userId}:orders`, start, end);

  // Fetch all orders in parallel
  const pipeline = redis.pipeline();
  orderIds.forEach(id => pipeline.hgetall(`order:${id}`));
  const results = await pipeline.exec();

  return results.map(([err, order]) => (err ? null : order)).filter(Boolean);
}

// Query: Get user stats
async function getUserStats(userId) {
  return redis.hgetall(`user:${userId}:stats`);
}

// Query: Get all paid orders (paginated)
async function getPaidOrders(cursor = 0, count = 20) {
  const [nextCursor, members] = await redis.sscan('orders:paid', cursor, 'COUNT', count);

  const pipeline = redis.pipeline();
  members.forEach(id => pipeline.hgetall(`order:${id}`));
  const results = await pipeline.exec();

  return {
    orders: results.map(([, order]) => order).filter(Boolean),
    nextCursor,
  };
}
```

## Consuming Events to Update the Read Model

```javascript
async function startProjector() {
  const STREAM = 'domain:events';
  const GROUP = 'read_model_projector';

  // Create consumer group
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM');
  } catch (e) {
    if (!e.message.includes('BUSYGROUP')) throw e;
  }

  console.log('Read model projector started');

  while (true) {
    const messages = await redis.xreadgroup(
      'GROUP', GROUP, 'projector-1',
      'COUNT', '50', 'BLOCK', '5000',
      'STREAMS', STREAM, '>'
    );

    if (!messages) continue;

    for (const [, entries] of messages) {
      for (const [id, fields] of entries) {
        const event = {
          type: fields[1],         // value of the 'type' field (index 0=key, 1=value)
          payload: JSON.parse(fields[3]), // value of the 'payload' field (index 2=key, 3=value)
        };

        try {
          await projectOrderEvent(event);
          await redis.xack(STREAM, GROUP, id);
        } catch (err) {
          console.error(`Failed to project event ${id}:`, err.message);
        }
      }
    }
  }
}
```

## Rebuilding the Read Model

When you need to rebuild the read model (e.g., after schema changes), clear and replay:

```javascript
async function rebuildReadModel() {
  console.log('Clearing read model...');

  // Delete all read model keys
  const keys = await redis.keys('order:*');
  const userOrderKeys = await redis.keys('user:*:orders');
  const userStatKeys = await redis.keys('user:*:stats');

  const allKeys = [...keys, ...userOrderKeys, ...userStatKeys,
    'orders:by_date', 'orders:paid', 'orders:pending', 'orders:cancelled'];

  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }

  // Reset consumer group to replay from beginning
  await redis.xgroup('DESTROY', 'domain:events', 'read_model_projector');
  await redis.xgroup('CREATE', 'domain:events', 'read_model_projector', '0');

  console.log('Read model cleared, replay will start automatically');
}
```

## Summary

Building a CQRS read model with Redis involves projecting domain events into denormalized Redis data structures optimized for specific query patterns. Hashes store entity state, Sorted Sets enable time-based and ranked queries, and Sets support membership queries. The projector consumes events from a Redis Stream, and the read model can be fully rebuilt at any time by replaying from the beginning of the event log.
