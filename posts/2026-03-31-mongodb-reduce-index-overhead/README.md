# How to Reduce Index Overhead in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Performance, Write Optimization, Database Administration

Description: Learn how excessive indexes slow MongoDB writes and how to identify and remove unused or redundant indexes to reduce write amplification and memory pressure.

---

Every index in MongoDB must be maintained on every write operation (insert, update, delete). Each additional index adds latency to writes and consumes RAM. Reducing index overhead is one of the highest-impact ways to improve write performance.

## Why Indexes Hurt Write Performance

When you insert a document, MongoDB updates every index defined on that collection. A collection with 10 indexes performs 10 index B-tree operations per insert, versus 1 for a collection with one index.

```text
Write cost = document write + (N indexes x index update cost)
```

## Step 1 - Identify Unused Indexes with $indexStats

```javascript
db.orders.aggregate([{ $indexStats: {} }])
```

Sample output:

```json
[
  { "name": "status_1",          "accesses": { "ops": 0,      "since": "2026-01-01" } },
  { "name": "createdAt_1",       "accesses": { "ops": 45230,  "since": "2026-01-01" } },
  { "name": "legacyField_1",     "accesses": { "ops": 0,      "since": "2026-01-01" } }
]
```

Indexes with `ops: 0` over a representative period are candidates for removal.

## Step 2 - Check for Redundant Compound Indexes

An index `{ a: 1 }` is redundant if `{ a: 1, b: 1 }` already exists, because any query on `a` alone can use the compound index via prefix matching.

```javascript
// Redundant pair - the compound index covers the single-field index
db.orders.createIndex({ userId: 1 })              // redundant
db.orders.createIndex({ userId: 1, status: 1 })   // covers userId queries too

// Drop the redundant one
db.orders.dropIndex("userId_1")
```

## Step 3 - Use Hidden Indexes for Safe Removal Testing

Before dropping, hide an index to stop the query planner from using it without removing it:

```javascript
db.orders.hideIndex("status_1")

// Monitor for a few days - if no queries break, drop it
db.orders.dropIndex("status_1")
```

Unhide to restore:

```javascript
db.orders.unhideIndex("status_1")
```

## Step 4 - Use Sparse Indexes for Optional Fields

If an optional field is only present in a small fraction of documents, a sparse index is smaller and faster to maintain:

```javascript
// Only indexes documents where "referralCode" exists
db.users.createIndex(
  { referralCode: 1 },
  { sparse: true }
)
```

## Step 5 - Use Partial Indexes Instead of Full Indexes

A partial index covers only the subset of documents matching a filter expression:

```javascript
// Only index active orders - reduces index size dramatically
db.orders.createIndex(
  { customerId: 1, createdAt: -1 },
  { partialFilterExpression: { status: "active" } }
)
```

## Step 6 - Check Index Memory Usage

```javascript
db.orders.stats({ indexDetails: true }).indexSizes
```

Large indexes that see few queries are good candidates for removal.

## Step 7 - Build Indexes Without Blocking (Rolling)

Since MongoDB 4.2, all index builds use an optimized process that only holds an exclusive lock at the start and end of the build. The `background` option is deprecated and ignored.

For large collections on replica sets, use a rolling index build to limit impact to one member at a time:

```javascript
// Runs an optimized build automatically in MongoDB 4.2+
db.orders.createIndex({ region: 1 })
```

For a rolling build: remove one secondary from the replica set, build the index on it as a standalone instance, rejoin it, and repeat for each member. Step down the primary last.

## Summary

Reduce MongoDB index overhead by auditing usage with `$indexStats`, dropping indexes with zero accesses, eliminating redundant indexes covered by compound index prefixes, and using sparse or partial indexes where appropriate. Use hidden indexes to safely test removal before committing.
