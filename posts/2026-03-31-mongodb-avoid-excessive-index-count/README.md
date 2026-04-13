# How to Avoid Excessive Index Count in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Performance, Write Throughput, Anti-Pattern

Description: Learn the performance cost of having too many indexes in MongoDB and how to audit and reduce your index count without sacrificing query speed.

---

More indexes means slower writes. This is a fundamental MongoDB trade-off that many teams underestimate. Every insert, update, and delete must update all indexes on the affected collection. A collection with 20 indexes performs dramatically worse on writes than one with 5 well-chosen indexes covering the same query patterns.

## The Hidden Cost of Index Count

Each write operation in MongoDB must update every index on the collection. Here is what happens with 20 indexes vs 5:

```text
Insert one document:
- 5 indexes: 5 B-tree insertions, ~2ms
- 20 indexes: 20 B-tree insertions, ~8ms

At 5,000 inserts/second:
- 5 indexes: 10,000ms total index work per second
- 20 indexes: 40,000ms total index work per second
```

This translates directly to higher write latency, reduced throughput, and more CPU usage.

## Checking Your Current Index Count

List all indexes on a collection and count them:

```javascript
const indexes = db.orders.getIndexes();
print(`Total indexes: ${indexes.length}`);
indexes.forEach(idx => print(JSON.stringify(idx.key)));
```

The `_id` index is mandatory and cannot be removed. Everything else is optional.

## Identifying Low-Value Indexes

Use `$indexStats` to find indexes that are rarely or never used:

```javascript
db.orders.aggregate([
  { $indexStats: {} },
  { $sort: { "accesses.ops": 1 } },
  {
    $project: {
      name: 1,
      ops: "$accesses.ops",
      since: "$accesses.since"
    }
  }
]);
```

Indexes with low `ops` relative to collection write volume are candidates for removal.

## Finding Redundant Indexes

A compound index makes single-field indexes on its prefix fields redundant:

```javascript
db.orders.getIndexes().forEach(idx => {
  print(JSON.stringify(idx.key));
});

// Example output:
// {"_id": 1}                    - required
// {"userId": 1}                 - REDUNDANT if compound below exists
// {"userId": 1, "status": 1}    - covers userId queries too
// {"userId": 1, "createdAt": -1} - also covers userId
// {"status": 1}                 - useful for status-only queries
```

In this case, `{userId: 1}` is covered by both compound indexes and can be dropped.

## Consolidating Query Patterns into Fewer Indexes

Analyze your actual query patterns and design indexes that serve multiple query shapes:

```javascript
// Instead of separate indexes for each query shape:
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ userId: 1, status: 1 });

// One well-designed compound index can serve both and add sort support:
db.orders.createIndex({ userId: 1, status: 1, createdAt: -1 });
// Serves: { userId } queries (prefix)
//         { userId, status } queries (prefix)
//         { userId, status, sort by createdAt } queries (full)
// Note: this does NOT efficiently serve { userId, sort by createdAt }
// queries without a status filter. Keep a separate { userId: 1, createdAt: -1 }
// index if you need that pattern.
```

## Target Index Count Guidelines

| Collection Write Volume | Recommended Max Indexes |
|---|---|
| Low (under 100 writes/sec) | 10-15 |
| Medium (100-1000 writes/sec) | 5-10 |
| High (over 1000 writes/sec) | 3-6 |

These are guidelines, not hard limits. Profile your actual write latency to determine the right balance.

## Safe Removal with Index Hiding

Before dropping an index, hide it to test the impact without permanently losing it:

```javascript
// Hide the suspected redundant index
db.orders.hideIndex("userId_1");

// Monitor query performance for 24-48 hours
// If no degradation: drop it
db.orders.dropIndex("userId_1");

// If queries slow down: unhide it
db.orders.unhideIndex("userId_1");
```

## Summary

Excessive indexes silently degrade write throughput in MongoDB. Audit index usage with `$indexStats`, identify redundant prefix indexes by comparing key patterns, and consolidate multiple query shapes into fewer well-designed compound indexes. Use index hiding for risk-free testing before permanent removal. The target is the minimal set of indexes that satisfies your actual query load.
