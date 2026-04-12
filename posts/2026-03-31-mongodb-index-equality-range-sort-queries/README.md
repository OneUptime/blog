# How to Index for Equality + Range + Sort Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Query, Compound, Sort

Description: Apply the ESR rule (Equality, Sort, Range) to design compound indexes that eliminate in-memory sorts and maximize index efficiency for complex queries.

---

## The ESR Rule

When building a compound index for a query that combines equality filters, a sort, and a range filter, follow the ESR rule:

1. **E**quality fields first
2. **S**ort fields second
3. **R**ange fields last

This ordering allows MongoDB to use the index to both filter and sort without an in-memory sort stage.

## Example Query

```javascript
// Find active users in the "pro" plan created in the last 30 days, sorted by createdAt descending
db.users.find({
  status: "active",           // Equality
  plan: "pro",                // Equality
  createdAt: { $gte: cutoff } // Range
}).sort({ createdAt: -1 });   // Sort
```

## Wrong Index Order

```javascript
// Suboptimal - equality field (plan) placed after the sort/range field, so it cannot narrow the scan
db.users.createIndex({ status: 1, createdAt: -1, plan: 1 });
```

Running `explain()` on a query with this index shows `totalDocsExamined` much higher than `nReturned`, because MongoDB must scan all index entries matching `status` and the `createdAt` range, then discard rows where `plan` does not match:

```javascript
db.users.find({ status: "active", plan: "pro", createdAt: { $gte: cutoff } })
  .sort({ createdAt: -1 })
  .explain("executionStats");
// totalDocsExamined much higher than nReturned
```

## Correct Index Order (ESR)

```javascript
// Correct - Equality (status, plan) -> Sort (createdAt) -> Range (createdAt already covered)
db.users.createIndex({ status: 1, plan: 1, createdAt: -1 });
```

Note that when the sort field and range field are the same (`createdAt`), the sort position satisfies both. The sort direction in the index must match the sort direction in the query.

## Verify with explain()

```javascript
db.users.find({ status: "active", plan: "pro", createdAt: { $gte: cutoff } })
  .sort({ createdAt: -1 })
  .explain("executionStats");
```

Desired output:

```json
{
  "winningPlan": {
    "stage": "FETCH",
    "inputStage": {
      "stage": "IXSCAN",
      "indexName": "status_1_plan_1_createdAt_-1"
    }
  },
  "executionStats": {
    "totalDocsExamined": 50,
    "nReturned": 50,
    "executionTimeMillis": 2
  }
}
```

No `SORT` stage means the index handles sorting.

## Range on a Different Field

When the range is on a different field than the sort, place the sort between equality and range:

```javascript
// Query: filter by status (equality), sort by name, filter by age (range)
db.users.find({ status: "active", age: { $gt: 18 } }).sort({ name: 1 });

// ESR index:
db.users.createIndex({ status: 1, name: 1, age: 1 });
```

## Sort Direction Must Match

If your query sorts ascending but the index is descending, MongoDB can traverse the index in reverse - this works fine. But mixing directions within the same query and index requires explicit attention:

```javascript
// Query sorts name ascending and createdAt descending
db.users.find({ status: "active" }).sort({ name: 1, createdAt: -1 });

// Index must match the sort directions exactly (or all reversed)
db.users.createIndex({ status: 1, name: 1, createdAt: -1 });
// OR the reversed equivalent (MongoDB can scan backwards)
db.users.createIndex({ status: -1, name: -1, createdAt: 1 });
```

## Summary

The ESR rule (Equality, Sort, Range) is the most important principle for designing compound indexes in MongoDB. Place equality filter fields first to maximize key selectivity, sort fields in the middle so the index scan is already ordered, and range fields last. Always verify with `explain("executionStats")` that no `SORT` stage appears and that `totalDocsExamined` is close to `nReturned`.
