# What Is the Difference Between a Sparse Index and a Partial Index in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sparse Index, Partial Index, Index, Query Optimization

Description: A sparse index skips documents where the indexed field is missing, while a partial index skips documents that do not match a user-defined filter expression.

---

## Overview

Both sparse indexes and partial indexes are selective MongoDB indexes that do not include every document in the collection. They reduce index size and write overhead by excluding documents that don't need to be indexed. The difference is the exclusion criteria: a sparse index excludes documents where the indexed field does not exist, while a partial index excludes documents based on a filter expression you define - giving you much more flexibility.

## Sparse Indexes

A sparse index only contains entries for documents that have the indexed field, even if the field value is null. Documents missing the field entirely are not in the index.

```javascript
// Create a sparse index on the optional "promoCode" field
db.orders.createIndex(
  { promoCode: 1 },
  { sparse: true }
)
```

This is useful when a field is optional and most documents lack it. Without `sparse: true`, the index would store a null entry for every document missing the field, wasting space.

**Querying with sparse indexes:**

```javascript
// This query CAN use the sparse index
db.orders.find({ promoCode: "SAVE10" })

// This query will NOT use the sparse index (it needs all docs, including those without promoCode)
db.orders.find({ promoCode: { $exists: false } })
```

## Partial Indexes

A partial index includes only documents that satisfy a `partialFilterExpression`. This expression supports a subset of query operators (`$eq`, `$exists`, `$gt`, `$gte`, `$lt`, `$lte`, `$type`, top-level `$and`; `$in` and `$or` added in MongoDB 5.0), giving you precise control over which documents are indexed.

```javascript
// Index only open orders (not closed/cancelled)
db.orders.createIndex(
  { userId: 1, createdAt: -1 },
  {
    partialFilterExpression: { status: { $in: ["open", "pending"] } }
  }
)
```

```javascript
// Index only verified users
db.users.createIndex(
  { email: 1 },
  {
    partialFilterExpression: { verified: true },
    unique: true
  }
)
```

## Comparison

| Feature | Sparse Index | Partial Index |
|---|---|---|
| Exclusion criteria | Field missing | Custom filter expression |
| Filter expressions | No | Yes (supported operators) |
| Compound key support | Yes | Yes |
| Unique enforcement | On present docs | On docs matching filter |
| MongoDB version | All versions | 3.2+ |
| Flexibility | Limited | High |

## When to Use Sparse Indexes

- The indexed field is optional and rarely set
- You only need to query by the field when it exists
- Simple exclusion of missing values is sufficient

```javascript
// Index on optional phone number field
db.contacts.createIndex({ phone: 1 }, { sparse: true })
```

## When to Use Partial Indexes

- You want to index a subset of documents based on a status, date range, or boolean flag
- You need to enforce unique constraints on a subset of documents
- You want finer control than "field exists"

```javascript
// Enforce unique email only for verified users
db.users.createIndex(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { verified: true, email: { $type: "string" } }
  }
)
```

## Partial Index Replaces Sparse Index

A sparse index is essentially a special case of a partial index. You can replicate sparse index behavior with a partial index:

```javascript
// These two are equivalent:

// Sparse:
db.orders.createIndex({ promoCode: 1 }, { sparse: true })

// Partial equivalent:
db.orders.createIndex(
  { promoCode: 1 },
  { partialFilterExpression: { promoCode: { $exists: true } } }
)
```

MongoDB recommends using partial indexes when you need more expressive exclusion logic, and reserving sparse indexes for their original simple use case.

## Query Planner Requirements

For the query planner to use a partial index, the query must include the filter expression (or a superset of it) as a condition:

```javascript
// This query uses the partial index (includes status: "open" which matches the filter)
db.orders.find({ userId: "u1", status: "open" }).sort({ createdAt: -1 })

// This query cannot use the partial index (status not specified - may need all docs)
db.orders.find({ userId: "u1" }).sort({ createdAt: -1 })
```

## Summary

Sparse indexes exclude documents missing the indexed field; partial indexes exclude documents not matching a custom filter. Partial indexes are strictly more powerful and should be the default choice when you need a selective index. Use sparse indexes for simple "skip missing fields" cases, and partial indexes for any scenario requiring filter-based selectivity.
