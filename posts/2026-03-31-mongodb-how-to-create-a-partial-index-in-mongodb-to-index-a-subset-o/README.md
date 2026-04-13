# How to Create a Partial Index in MongoDB to Index a Subset of Documents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Partial Index, Filter Expression, Index Optimization

Description: Learn how to create partial indexes in MongoDB using filter expressions to index only a subset of documents, reducing index size and improving write performance.

---

## Overview

A partial index in MongoDB only indexes documents that match a specified filter expression. By indexing only the subset of documents relevant to your queries, partial indexes are smaller, faster to update, and consume less memory than full indexes on the same field. They are available in MongoDB 3.2+.

## Creating a Partial Index

Use the `partialFilterExpression` option with `createIndex()`:

```javascript
// Index only active users (status: "active")
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { status: { $eq: "active" } } }
)

// Index only high-value orders (amount > 1000)
db.orders.createIndex(
  { customerId: 1, amount: -1 },
  { partialFilterExpression: { amount: { $gt: 1000 } } }
)
```

## How MongoDB Uses Partial Indexes

For MongoDB to use a partial index, the query must include the filter expression condition (or a subset of it that implies it):

```javascript
// This query WILL use the partial index (filter implies status: "active")
db.users.find({ status: "active", email: "alice@example.com" })

// This query will NOT use the partial index (status not specified)
db.users.find({ email: "alice@example.com" })
// MongoDB cannot guarantee all matching documents are in the index
```

## Practical Example - Indexing Only Pending Orders

```javascript
db.orders.insertMany([
  { orderId: 1, status: "pending", amount: 150, customerId: "c1" },
  { orderId: 2, status: "completed", amount: 200, customerId: "c2" },
  { orderId: 3, status: "pending", amount: 75, customerId: "c1" },
  { orderId: 4, status: "cancelled", amount: 50, customerId: "c3" }
])

// Only pending orders need fast lookups - completed/cancelled are archived
db.orders.createIndex(
  { customerId: 1, amount: -1 },
  {
    partialFilterExpression: { status: "pending" },
    name: "idx_pending_orders"
  }
)

// Uses the partial index
db.orders.find({ status: "pending", customerId: "c1" }).sort({ amount: -1 })

// Does NOT use the partial index
db.orders.find({ customerId: "c1" }).sort({ amount: -1 })
```

## Partial Index for Non-Null Fields

Index only documents where a field exists and is not null:

```javascript
// Index only documents that have a phone number (excludes null and missing)
db.contacts.createIndex(
  { phone: 1 },
  { partialFilterExpression: { phone: { $type: "string" } } }
)

// Index only documents with a non-empty name
db.profiles.createIndex(
  { name: 1 },
  {
    partialFilterExpression: {
      name: { $type: "string", $gt: "" }
    }
  }
)
```

## Partial Unique Index

Combine `partial` with `unique` to enforce uniqueness only on matching documents:

```javascript
// Unique email only among active users (allows multiple inactive users without email)
db.users.createIndex(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
      email: { $exists: true }
    }
  }
)

// Two inactive users can have the same email (or no email)
db.users.insertMany([
  { name: "Alice", email: "same@example.com", status: "inactive" },
  { name: "Bob", email: "same@example.com", status: "inactive" }
])
// This succeeds because neither is "active"
```

## Supported Expressions in partialFilterExpression

```text
Allowed:
- Equality: { field: value } or { field: { $eq: value } }
- $exists
- $gt, $gte, $lt, $lte
- $type
- $and (logical AND of the above)
- $or (top-level only)
- $in

Not allowed:
- $ne, $not, $nor
- Aggregation expressions
- Full text search operators
```

## Partial vs Sparse Index Comparison

```text
| Feature               | Partial Index              | Sparse Index              |
|-----------------------|----------------------------|---------------------------|
| Filter criteria       | Any supported expression   | Only field existence check|
| Created with          | partialFilterExpression    | { sparse: true }          |
| Flexibility           | High                       | Low                       |
| MongoDB version       | 3.2+                       | All versions              |
| Unique partial        | Yes                        | Yes (sparse unique)       |
| Best for              | Status-based subsets       | Optional fields           |
```

## Verifying Partial Index Usage

```javascript
db.orders.find({ status: "pending", customerId: "c1" })
  .explain("executionStats")
// Look for "IXSCAN" in winningPlan - confirms partial index used
// "indexName" should show your partial index name
```

## Summary

Partial indexes use a `partialFilterExpression` to index only documents matching a filter condition, making them smaller and faster to maintain than full indexes on the same field. They are ideal for indexing frequently queried subsets (active records, pending items, non-null fields) while excluding data that is rarely accessed. Queries must include the filter condition for MongoDB to use the partial index. Combining with `unique: true` enables powerful subset-unique constraints.
