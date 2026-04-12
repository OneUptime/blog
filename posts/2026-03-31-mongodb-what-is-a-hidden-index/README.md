# What Is a Hidden Index in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Hidden Index, Index, Query Optimization, Performance

Description: A hidden index in MongoDB is maintained by the server but invisible to the query planner, letting you test index removal impact before permanently dropping an index.

---

## Overview

A hidden index is a MongoDB index that continues to be maintained (kept up-to-date on writes) but is not visible to the query planner, so it is never used to serve queries. This gives you a safe way to evaluate the impact of removing an index before actually dropping it. If performance suffers after hiding an index, you can unhide it instantly without the time and overhead of rebuilding it from scratch.

Hidden indexes were introduced in MongoDB 4.4.

## Why Hidden Indexes Matter

Dropping an index is irreversible - to get it back, you must rebuild it, which takes time and resources on a large collection. Hidden indexes let you:

1. Hide the index so the planner no longer uses it
2. Monitor query performance to confirm the index was actually needed
3. Either unhide it (instant) or drop it permanently

This is especially valuable for large collections where an index rebuild could take hours.

## Creating a Hidden Index

```javascript
// Create a new index already in hidden state
db.orders.createIndex(
  { userId: 1 },
  { hidden: true }
)
```

## Hiding an Existing Index

```javascript
// Hide an existing index using collMod
db.runCommand({
  collMod: "orders",
  index: {
    name: "userId_1",
    hidden: true
  }
})
```

## Unhiding an Index

```javascript
// Unhide - the index is immediately available to the query planner
db.runCommand({
  collMod: "orders",
  index: {
    name: "userId_1",
    hidden: false
  }
})
```

## Listing Hidden Indexes

```javascript
// View all indexes including hidden ones
db.orders.getIndexes()
// Hidden indexes have: "hidden": true in the output

// Using explain - hidden indexes will NOT appear in winning plan
db.orders.find({ userId: "abc" }).explain("executionStats")
```

## Hidden Indexes and $hint

You cannot use `hint()` to force the query planner to use a hidden index. If you try, MongoDB returns an error, the same as if you hinted a nonexistent index:

```javascript
// This will return an error - hint does not work on hidden indexes
db.orders.find({ userId: "abc" }).hint({ userId: 1 }).explain("executionStats")
// Error: hint provided does not correspond to an existing index
```

To test whether the index would improve a query, temporarily unhide it, run your explain, and then hide it again.

## Hidden Indexes and Write Overhead

Even when hidden, the index is still updated on every insert, update, and delete. This means you still pay the write overhead for maintaining it. Hiding an index only removes its read-side benefit. If an index is never going to be used, drop it to reclaim the write overhead.

## Workflow for Safe Index Removal

```javascript
// Step 1: Hide the index
db.runCommand({
  collMod: "events",
  index: { name: "createdAt_1", hidden: true }
})

// Step 2: Monitor slow query logs and performance for 24-48 hours

// Step 3a: If no performance degradation, drop the index
db.events.dropIndex("createdAt_1")

// Step 3b: If performance degraded, unhide immediately
db.runCommand({
  collMod: "events",
  index: { name: "createdAt_1", hidden: false }
})
```

## Summary

Hidden indexes provide a risk-free way to evaluate whether an index is being used before dropping it. The index stays maintained but invisible to the query planner. Use this workflow for any production index removal to avoid the cost of an unnecessary rebuild if the index turns out to be essential.
