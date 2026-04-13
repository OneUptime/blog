# How to Use hint() to Force Index Usage in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Hint, Query Optimization, Query Planner

Description: Learn how to use hint() in MongoDB to override the query planner and force a specific index for a query, with when and why to use it.

---

## Overview

MongoDB's query planner automatically selects the best index for a query. However, the planner sometimes makes suboptimal choices, especially on complex queries or when collection statistics are stale. The `hint()` method lets you override the planner and force MongoDB to use a specific index.

## Basic hint() Usage

Pass either the index name or the index key specification to `hint()`:

```javascript
// Force a specific index by key specification
db.orders.find({ status: "pending", customerId: "c123" })
  .hint({ customerId: 1, status: 1 })

// Force a specific index by name
db.orders.find({ status: "pending" })
  .hint("status_1")

// Force a collection scan (no index) using $natural
db.orders.find({ status: "pending" })
  .hint({ $natural: 1 })
```

## hint() in Aggregation Pipelines

Use `hint` as an aggregation option:

```javascript
db.orders.aggregate(
  [
    { $match: { status: "pending", customerId: "c123" } },
    { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
  ],
  { hint: { customerId: 1, status: 1 } }
)
```

## When to Use hint()

```text
Legitimate use cases for hint():
1. Query planner chooses the wrong index (verify with explain())
2. Stale collection statistics causing poor plan selection
3. Performance testing - comparing different indexes explicitly
4. Forcing a collection scan for debugging purposes
5. Complex queries where planner consistently picks a suboptimal plan

Do not use hint() as a first resort:
- Always verify with explain() first
- Consider creating a better-suited compound index instead
- Hardcoding hints in application code is a maintenance burden
```

## Verifying hint() Effect with explain()

```javascript
// Without hint - see what planner chooses
db.orders.find({ status: "pending", amount: { $gt: 100 } })
  .explain("executionStats")

// With hint - see execution with forced index
db.orders.find({ status: "pending", amount: { $gt: 100 } })
  .hint({ status: 1 })
  .explain("executionStats")

// Compare:
// - totalDocsExamined
// - executionTimeMillis
// - nReturned
// Choose the index with lower docs examined and execution time
```

## Practical Example - Comparing Two Indexes

```javascript
db.events.createIndex({ userId: 1, createdAt: -1 })
db.events.createIndex({ createdAt: -1, type: 1 })
db.events.createIndex({ type: 1, userId: 1 })

// Test query
const query = { userId: "u123", type: "purchase", createdAt: { $gte: ISODate("2024-01-01") } };

// Test each index
const result1 = db.events.find(query).hint({ userId: 1, createdAt: -1 }).explain("executionStats");
const result2 = db.events.find(query).hint({ createdAt: -1, type: 1 }).explain("executionStats");
const result3 = db.events.find(query).hint({ type: 1, userId: 1 }).explain("executionStats");

// Compare executionStats.totalDocsExamined and executionTimeMillis
print("Index 1 docs examined:", result1.executionStats.totalDocsExamined);
print("Index 2 docs examined:", result2.executionStats.totalDocsExamined);
print("Index 3 docs examined:", result3.executionStats.totalDocsExamined);
```

## hint() in Update and Delete Operations

```javascript
// hint() on updateOne/updateMany
db.orders.updateMany(
  { status: "pending", updatedAt: { $lt: cutoffDate } },
  { $set: { status: "expired" } },
  { hint: { status: 1 } }
)

// hint() on deleteMany
db.sessions.deleteMany(
  { expiresAt: { $lt: new Date() } },
  { hint: { expiresAt: 1 } }
)

// hint() on findOneAndUpdate
db.inventory.findOneAndUpdate(
  { sku: "ABC123", qty: { $gt: 0 } },
  { $inc: { qty: -1 } },
  { hint: { sku: 1 } }
)
```

## Forcing a Collection Scan

Sometimes useful for benchmarking the value of an index:

```javascript
// Force full collection scan
db.orders.find({ status: "pending" })
  .hint({ $natural: 1 })
  .explain("executionStats")
// Compares against indexed query to quantify index benefit
```

## hint() Precautions

```text
- If the specified index does not exist, the query throws an error
- hint() bypasses the query planner's automatic optimization
- Hardcoded hints in application code must be updated if indexes change
- On sharded clusters, hint() applies to each shard independently
- Hinting an index incompatible with special query operators (e.g., a non-text index for $text queries) causes an error
```

## Summary

`hint()` overrides MongoDB's query planner to force use of a specified index, identified by key specification or index name. It is primarily useful when the planner makes suboptimal choices that can be confirmed with `explain()`, or during performance testing to compare different index strategies. Always verify the benefit using `explain("executionStats")` and compare `totalDocsExamined` and `executionTimeMillis`. For production code, prefer creating a better-suited index over hardcoding hints.
