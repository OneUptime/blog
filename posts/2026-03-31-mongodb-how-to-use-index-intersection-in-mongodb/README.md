# How to Use Index Intersection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Indexing, Index Intersection, Query Optimization, Performance

Description: Learn how MongoDB's index intersection feature combines multiple single-field indexes to satisfy complex queries without requiring a compound index.

---

## What Is Index Intersection?

Index intersection is a MongoDB query optimization where the query planner uses two or more separate indexes and combines (intersects) their results to satisfy a single query. This can sometimes eliminate the need for a compound index.

For example, if you have separate indexes on `status` and `region`, MongoDB might intersect them to answer a query filtering on both fields.

## How Index Intersection Works

MongoDB scans both indexes independently, collects internal record IDs from each, and performs a set intersection to find documents that match all conditions.

```javascript
// Two separate indexes
db.orders.createIndex({ status: 1 })
db.orders.createIndex({ region: 1 })

// MongoDB MAY use index intersection for this query
db.orders.find({ status: "active", region: "US" })
```

Check with `explain()`:

```javascript
db.orders.find({ status: "active", region: "US" }).explain("executionStats")
```

Look for `AND_SORTED` or `AND_HASH` stages in the winning plan, which indicate index intersection is being used.

## AND_SORTED vs AND_HASH

```text
AND_SORTED  - Merges two index result streams that are both sorted by RecordId
AND_HASH    - Hashes results from one index and probes with the other
```

`AND_SORTED` is preferred when both index scans return results in the same sort order.

## When MongoDB Uses Index Intersection

MongoDB's query planner evaluates index intersection as one of many candidate plans. It uses index intersection when:
- No single compound index covers the full query
- The planner estimates intersection is cheaper than a collection scan
- Both fields have reasonable selectivity

## Index Intersection Is Not Always Used

Even with two indexes, MongoDB may choose not to intersect them. The planner compares candidate plans and picks the winner based on cost estimates:

```javascript
// Force explain to see all candidate plans
db.orders.find({ status: "active", region: "US" })
  .explain("allPlansExecution")
```

## Compound Index vs Index Intersection

A well-designed compound index almost always outperforms index intersection:

```javascript
// Compound index - preferred approach
db.orders.createIndex({ status: 1, region: 1 })
```

Index intersection involves scanning two indexes and performing a join in memory, which is more expensive than a single compound index scan. Use index intersection as a fallback when you cannot add a compound index.

## Practical Use Case

If you have many query patterns that each filter on different field combinations, maintaining separate indexes for each field may be more practical than creating compound indexes for every combination:

```javascript
db.products.createIndex({ category: 1 })
db.products.createIndex({ inStock: 1 })
db.products.createIndex({ price: 1 })

// Queries like these may use intersection
db.products.find({ category: "electronics", inStock: true })
db.products.find({ inStock: true, price: { $lt: 100 } })
```

## Limitations

- Index intersection does not support sort operations (a compound index is needed for indexed sorts)
- Intersection only applies to query predicates, not projections
- The planner may not always choose intersection even when it could

## Monitoring Intersection Usage

```javascript
// Count how often intersection is chosen vs compound scans
db.orders.aggregate([{ $indexStats: {} }])
```

Compare ops count between individual indexes and look for signs the planner is using both.

## Summary

Index intersection allows MongoDB to combine multiple single-field indexes to satisfy multi-field queries without a dedicated compound index. While useful as a fallback, compound indexes are almost always more efficient because they avoid the intersection overhead. Use `explain()` to identify `AND_SORTED` or `AND_HASH` stages that indicate intersection is being used, and prefer compound indexes for your most frequent and performance-critical query patterns.
