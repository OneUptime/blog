# What Is a Covered Query in MongoDB and How to Achieve It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Covered Query, Index, Performance, Optimization

Description: Learn what a covered query is in MongoDB, why it is the fastest possible query execution path, and how to design indexes to achieve it.

---

## What Is a Covered Query

A covered query is a query where MongoDB can satisfy the entire request using only the index - without reading any documents from the collection. All fields in the query filter and projection must be included in the index.

## Why Covered Queries Are Fast

Normal queries: index lookup -> document fetch -> return fields
Covered queries: index lookup -> return fields (no document fetch)

Eliminating document fetches reduces disk I/O and significantly improves throughput, especially on frequently executed queries.

## Requirements for a Covered Query

1. All fields in the query filter must be in the index
2. All fields in the projection must be in the index
3. The projection must exclude `_id` (unless `_id` is in the index)
4. The index must not be a multikey index (no indexed field contains an array)

## Simple Covered Query Example

```javascript
// Create compound index on email and name
db.users.createIndex({ email: 1, name: 1 })

// Covered query: filter on email, project only name (exclude _id)
db.users.find(
  { email: "alice@example.com" },
  { name: 1, _id: 0 }
)
```

Both `email` (filter) and `name` (projection) are in the index, and `_id` is excluded.

## Verifying with explain()

```javascript
db.users.find(
  { email: "alice@example.com" },
  { name: 1, _id: 0 }
).explain("executionStats")
```

In the output, look for:

```json
"totalDocsExamined": 0,
"stage": "PROJECTION_COVERED"
```

`totalDocsExamined: 0` confirms the query never touched the collection.

## Common Pitfall: Forgetting to Exclude _id

```javascript
// This is NOT covered because _id is returned by default
db.users.find(
  { email: "alice@example.com" },
  { name: 1 }  // _id is implicitly included
)

// This IS covered
db.users.find(
  { email: "alice@example.com" },
  { name: 1, _id: 0 }  // explicitly exclude _id
)
```

Unless the index includes `_id`.

## Designing Indexes for Coverage

For a query that filters on `status` and returns `userId` and `createdAt`:

```javascript
// Index covering the query
db.orders.createIndex({ status: 1, userId: 1, createdAt: 1 })

// Covered query
db.orders.find(
  { status: "pending" },
  { userId: 1, createdAt: 1, _id: 0 }
)
```

## Covered Queries in High-Throughput APIs

```javascript
// API endpoint returning paginated order summaries
const orders = await db.collection("orders").find(
  { customerId: req.params.customerId, status: "completed" },
  { projection: { orderId: 1, total: 1, completedAt: 1, _id: 0 } }
).sort({ completedAt: -1 }).limit(20).toArray()

// Index to cover this:
db.orders.createIndex({ customerId: 1, status: 1, completedAt: -1, orderId: 1, total: 1 })
```

## Summary

A covered query satisfies the entire query from the index alone, with zero document reads. Achieve it by including all filter and projection fields in the index and explicitly excluding `_id`. Verify coverage with `explain()` and look for `totalDocsExamined: 0`. Covered queries are particularly valuable for high-frequency lookup patterns.
