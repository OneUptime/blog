# How to Choose Between Sparse and Partial Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Indexing, Sparse Index, Partial Index, Query Optimization

Description: Compare MongoDB sparse and partial indexes to understand when each is appropriate for optimizing queries on fields that are not always present.

---

## What Is a Sparse Index?

A sparse index only includes documents where the indexed field exists, even if the field value is null. Documents that do not have the field at all are excluded from the index entirely:

```javascript
db.users.createIndex({ phoneNumber: 1 }, { sparse: true })
```

This index skips documents where `phoneNumber` is absent. If 90% of your documents have no phone number, the sparse index is much smaller than a regular index.

## What Is a Partial Index?

A partial index includes only documents matching a user-defined filter expression. It gives you full control over which documents are indexed:

```javascript
db.orders.createIndex(
  { customerId: 1 },
  { partialFilterExpression: { status: "active" } }
)
```

This indexes only orders where `status` is `"active"`. Orders with other statuses are excluded from the index.

## Key Differences

```text
Feature               | Sparse Index          | Partial Index
----------------------|-----------------------|---------------------------
Filter criterion      | Field exists          | Any filter expression
Filter flexibility    | None (fixed)          | Full (any query operator)
MongoDB version       | Any                   | 3.2+
Expression support    | No                    | Yes ($gt, $eq, $in, etc.)
```

## When to Use a Sparse Index

Use sparse indexes when:
- A field is optional in your schema
- You query for documents that have the field
- The absence of the field is semantically "null" or "not applicable"

```javascript
// Only some products have a discount field
db.products.createIndex({ discount: -1 }, { sparse: true })

// This query uses the sparse index
db.products.find({ discount: { $exists: true } }).sort({ discount: -1 })
```

## When to Use a Partial Index

Use partial indexes when:
- You query a subset of documents based on a field value (not just existence)
- You want to reduce index size for a filtered working set
- You need a unique constraint on a subset of documents

```javascript
// Index only unprocessed jobs (most queries target pending jobs)
db.jobs.createIndex(
  { createdAt: 1 },
  { partialFilterExpression: { status: "pending" } }
)

// Efficiently finds pending jobs in chronological order
db.jobs.find({ status: "pending" }).sort({ createdAt: 1 })
```

## Partial Index for Conditional Unique Constraint

A partial index can enforce uniqueness only for matching documents:

```javascript
// Enforce unique email only for verified users
db.users.createIndex(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { verified: true }
  }
)
```

This allows multiple unverified users to share the same email while requiring verified users to have unique emails.

## Query Compatibility

MongoDB only uses a partial index when the query's filter includes the `partialFilterExpression` conditions. This means you must include the filter condition in your query:

```javascript
// Uses the partial index (includes status: "pending")
db.jobs.find({ status: "pending", createdAt: { $lt: new Date() } })

// Does NOT use the partial index (missing status condition)
db.jobs.find({ createdAt: { $lt: new Date() } })
```

Sparse indexes have the same issue: queries that must return documents without the field cannot use the sparse index safely.

## Combining with Other Index Options

Both types can be combined with TTL, compound fields, and unique constraints:

```javascript
// Partial + compound
db.events.createIndex(
  { userId: 1, timestamp: -1 },
  { partialFilterExpression: { eventType: "purchase" } }
)
```

## Summary

Choose sparse indexes for simple cases where you want to exclude documents missing a field. Choose partial indexes when you need more control over which documents are indexed based on field values or complex conditions. Partial indexes are strictly more powerful than sparse indexes and are the recommended approach in MongoDB 3.2 and later. Always ensure your queries include the partial filter expression so MongoDB can use the index.
