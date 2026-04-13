# How to Avoid Creating Too Many Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Anti-Pattern, Schema Design, Performance

Description: Learn why creating too many MongoDB collections causes memory and performance problems, and how to consolidate using discriminator fields.

---

A common anti-pattern in MongoDB schema design is creating one collection per category, tenant, or time period - resulting in hundreds or thousands of collections. MongoDB tracks metadata for every collection in memory, so excessive collections drain RAM, slow startup, and complicate query routing.

## Why Too Many Collections Is a Problem

Each MongoDB collection consumes resources regardless of size:

- **WiredTiger file handles** - each collection has its own data file
- **Namespace memory** - collection metadata is held in memory
- **Index overhead** - each collection's indexes add to the total index count
- **Replication** - more collections increases initial sync time and namespace management overhead

The practical limit varies by deployment, but systems with thousands of collections regularly experience degraded performance and harder-to-manage schemas.

## Anti-Pattern: Per-Tenant Collections

```javascript
// BAD - creates a new collection for every customer
const collection = db.collection(`orders_customer_${customerId}`);
await collection.insertOne(orderData);

// After 1000 customers: 1000 collections
// After 10000 customers: 10000 collections - serious problems
```

## Solution: Discriminator Field with a Single Collection

Use a single collection with a discriminator field (like `tenantId` or `type`) and a compound index:

```javascript
// GOOD - single collection with tenant discriminator
await db.collection('orders').insertOne({
  ...orderData,
  tenantId: customerId
});

// Create compound index for efficient per-tenant queries
await db.collection('orders').createIndex({ tenantId: 1, createdAt: -1 });

// Query is fast and indexed
const tenantOrders = await db.collection('orders')
  .find({ tenantId: customerId })
  .sort({ createdAt: -1 })
  .toArray();
```

## Anti-Pattern: Per-Category Collections

```javascript
// BAD - separate collection per event type
await db.collection(`events_${eventType}`).insertOne(event);
// Results in: events_click, events_pageview, events_purchase, events_signup...
```

```javascript
// GOOD - single events collection with type field
await db.collection('events').insertOne({
  ...event,
  type: eventType
});

await db.collection('events').createIndex({ type: 1, timestamp: -1 });
```

## Anti-Pattern: Per-Month Collections for Time-Series Data

```javascript
// BAD - monthly partitioning via collection names
const monthKey = new Date().toISOString().slice(0, 7).replace('-', '_');
await db.collection(`metrics_${monthKey}`).insertOne(metric);
// After 2 years: 24 collections

// Querying across months requires multiple queries:
const jan = await db.collection('metrics_2025_01').find(filter).toArray();
const feb = await db.collection('metrics_2025_02').find(filter).toArray();
const combined = [...jan, ...feb];
```

For time-series data, use MongoDB's native Time Series Collections instead:

```javascript
// GOOD - MongoDB Time Series Collection
await db.createCollection('metrics', {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'hours'
  }
});

// Cross-time queries are simple and fast
const metrics = await db.collection('metrics')
  .find({ timestamp: { $gte: startDate, $lte: endDate } })
  .toArray();
```

## How Many Collections Is Too Many?

As a rule of thumb:
- Under 100 collections: no concern
- 100-1000 collections: review whether consolidation is possible
- Over 1000 collections: actively problematic, consolidate

## Summary

Avoid creating collections dynamically based on tenant IDs, categories, or time periods. Use a single collection with a discriminator field and compound indexes instead. For time-series scenarios, use MongoDB's native Time Series Collections. This approach keeps your schema manageable, reduces memory overhead, and enables cross-partition queries with a single `find` command.
