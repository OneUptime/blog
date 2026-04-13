# How to Use the ESR Rule for Compound Index Design in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Compound Index, Performance, Query Optimization

Description: Learn the ESR rule - Equality, Sort, Range - a practical guideline for ordering fields in MongoDB compound indexes to maximize query performance.

---

Compound indexes in MongoDB can serve queries much more efficiently than single-field indexes, but field order matters significantly. The ESR rule provides a simple, evidence-backed guideline for ordering fields.

## What is the ESR Rule?

ESR stands for:

1. **E - Equality** fields first
2. **S - Sort** fields second
3. **R - Range** fields last

This ordering maximizes how much of the index each query can use.

## Why Order Matters

MongoDB's B-tree indexes are most efficient when high-selectivity conditions appear early. Equality predicates (`$eq`, direct value match) reduce the working set to an exact key range. Sort fields maintain order within that range. Range predicates (`$gt`, `$lt`, `$gte`, `$lte`, `$ne`) produce variable-length scans and benefit from being at the end.

## A Practical Example

Consider a query on an e-commerce orders collection:

```javascript
db.orders.find(
  {
    status: "shipped",         // Equality
    amount: { $gt: 100 }       // Range
  }
).sort({ createdAt: 1 })       // Sort
```

Following ESR, the ideal compound index is:

```javascript
db.orders.createIndex({
  status: 1,        // E - Equality
  createdAt: 1,     // S - Sort
  amount: 1         // R - Range
})
```

Not:

```javascript
// Bad - range before sort
db.orders.createIndex({ status: 1, amount: 1, createdAt: 1 })
```

When `amount` (range) precedes `createdAt` (sort), MongoDB cannot use the index for sorting - it must do an in-memory sort (SORT stage in `explain()`), which is slow for large result sets.

## Verifying with explain()

Always validate your index design using `explain("executionStats")`:

```javascript
db.orders.find(
  { status: "shipped", amount: { $gt: 100 } }
).sort({ createdAt: 1 }).explain("executionStats")
```

Look for:

```text
winningPlan.stage: "FETCH"        // Good - using index for sort
winningPlan.inputStage.stage: "IXSCAN"

// Bad indicator:
stage: "SORT"  // in-memory sort - index not used for ordering
```

## Multiple Equality Fields

If your query has multiple equality conditions, list all of them before sort and range:

```javascript
// Query
db.events.find({
  userId: "u123",       // Equality
  type: "click",        // Equality
  timestamp: { $gte: ISODate("2025-01-01") }  // Range
}).sort({ score: -1 })  // Sort

// ESR index
db.events.createIndex({
  userId: 1,    // E
  type: 1,      // E
  score: -1,    // S
  timestamp: 1  // R
})
```

## When ESR Has Exceptions

- **Covered queries** - sometimes placing range fields before sort can allow a covered query (no FETCH) at the cost of an in-memory sort, which may be acceptable for small result sets
- **$in treated as equality** - `$in` with a small set of values behaves more like equality and can go first; with large sets it behaves more like a range
- **Low-cardinality equality fields** - a boolean equality field offers minimal selectivity; consider its position carefully

## Summary

The ESR rule - Equality, Sort, Range - is the most reliable heuristic for ordering fields in MongoDB compound indexes. It ensures the query planner can use the index for both filtering and sorting simultaneously, avoiding expensive in-memory sort stages. Always confirm your index is working as expected with `explain("executionStats")`.
