# How to Index for OR Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, OR Query, Performance, Compound

Description: Learn how MongoDB handles $or and $in queries with indexes, when multiple indexes are used in parallel, and how to optimize OR query performance.

---

## How $or Uses Indexes

MongoDB handles `$or` queries differently from compound index scans. For each clause in a `$or`, MongoDB can use a separate index. It then merges the results. This is called an index union.

```javascript
db.events.insertMany([
  { type: "click", userId: "u1", createdAt: new Date() },
  { type: "view", userId: "u2", createdAt: new Date() },
  { type: "purchase", userId: "u1", createdAt: new Date() },
]);

// Create separate indexes for each OR field
db.events.createIndex({ type: 1 });
db.events.createIndex({ userId: 1 });

// MongoDB can use BOTH indexes for this $or query
db.events.find({
  $or: [{ type: "purchase" }, { userId: "u1" }],
});
```

## Verify Index Union

```javascript
db.events.find({ $or: [{ type: "purchase" }, { userId: "u1" }] })
  .explain("executionStats");
```

Look for the `OR` stage in the winning plan:

```json
{
  "winningPlan": {
    "stage": "SUBPLAN",
    "inputStage": {
      "stage": "OR",
      "inputStages": [
        { "stage": "IXSCAN", "indexName": "type_1" },
        { "stage": "IXSCAN", "indexName": "userId_1" }
      ]
    }
  }
}
```

Two `IXSCAN` stages mean both indexes are used in parallel.

## Use $in Instead of $or on the Same Field

When all `$or` clauses reference the same field, use `$in` instead - it uses a single index more efficiently:

```javascript
// Less efficient - $or on same field
db.events.find({ $or: [{ type: "click" }, { type: "view" }, { type: "purchase" }] });

// More efficient - $in on same field uses a single index scan
db.events.find({ type: { $in: ["click", "view", "purchase"] } });
```

## When $or Cannot Use Indexes

If any single `$or` clause lacks an index, MongoDB falls back to a collection scan for the entire query:

```javascript
// If "referrer" has no index, the entire query becomes a COLLSCAN
db.events.find({ $or: [{ type: "click" }, { referrer: "google.com" }] });
```

Ensure every field in every `$or` clause has an index.

## Combining $or with Other Filters

When `$or` is combined with other filters, MongoDB distributes the additional predicates into each `$or` clause. Each clause is then evaluated independently and can use its own index, with results merged via index union:

```javascript
// MongoDB pushes the createdAt filter into each $or clause
db.events.find({
  createdAt: { $gte: new Date("2026-01-01") },
  $or: [{ type: "purchase" }, { type: "refund" }],
});

// Index to support both
db.events.createIndex({ createdAt: 1, type: 1 });
```

For this pattern, rewrite with `$in` on type combined with the date range:

```javascript
// Cleaner and uses a single compound index
db.events.find({
  createdAt: { $gte: new Date("2026-01-01") },
  type: { $in: ["purchase", "refund"] },
});
```

## Compound Index vs Index Union

A single compound index often outperforms two separate indexes in an `$or` union because union requires merging and deduplicating results:

```javascript
// For this specific query pattern, a compound index is better
db.events.find({ type: "purchase", userId: "u1" });

// Compound index - single IXSCAN
db.events.createIndex({ type: 1, userId: 1 });
```

Use separate indexes for `$or` and compound indexes for `$and`.

## Summary

MongoDB uses separate indexes for each `$or` clause through an index union mechanism. Always ensure every clause in an `$or` has an index - any unindexed clause causes a full collection scan. Replace `$or` on the same field with `$in` for more efficient single-index scans. For queries that combine equality conditions with type filters, prefer `$in` over `$or` and a compound index over an index union for best performance.
