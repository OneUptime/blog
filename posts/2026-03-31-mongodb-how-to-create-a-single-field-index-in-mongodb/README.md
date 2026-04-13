# How to Create a Single Field Index in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Single Field Index, Performance, Query Optimization

Description: Learn how to create single field indexes in MongoDB to speed up queries, understand index direction, and verify index usage with explain().

---

## Overview

A single field index in MongoDB is an index on one field of a collection's documents. It is the most basic index type and accelerates queries that filter, sort, or return documents by that field. MongoDB automatically creates a single field index on the `_id` field; you create additional indexes for other frequently queried fields.

## Creating a Single Field Index

Use `createIndex()` with a document specifying the field name and sort order (1 for ascending, -1 for descending):

```javascript
// Create an ascending index on the "email" field
db.users.createIndex({ email: 1 })

// Create a descending index on "createdAt"
db.users.createIndex({ createdAt: -1 })
```

For a single field index, the sort order of the index key does not matter because MongoDB can traverse the index in either direction. Index direction becomes important only for compound indexes with multiple fields sorted in different directions.

## Verifying the Index Was Created

```javascript
db.users.getIndexes()
// Returns an array of all indexes including the new one:
// [
//   { v: 2, key: { _id: 1 }, name: "_id_" },
//   { v: 2, key: { email: 1 }, name: "email_1" }
// ]
```

## Index on Nested Fields

Create an index on a field nested inside a subdocument using dot notation:

```javascript
db.orders.createIndex({ "shipping.address.city": 1 })

// Now this query uses the index
db.orders.find({ "shipping.address.city": "New York" })
```

## Confirming Index Usage with explain()

```javascript
db.users.find({ email: "alice@example.com" }).explain("executionStats")
// Look for "IXSCAN" in winningPlan - confirms index was used
// "totalDocsExamined" should be close to the number of matched documents, not the total collection size
```

## Creating an Index with Options

```javascript
// Unique index - no two documents can have the same email
db.users.createIndex({ email: 1 }, { unique: true })

// Sparse index - only indexes documents that have the field
db.users.createIndex({ phone: 1 }, { sparse: true })

// Index with a custom name
db.users.createIndex({ lastName: 1 }, { name: "idx_lastName_asc" })

// Background index build (MongoDB 4.2 and earlier)
db.users.createIndex({ status: 1 }, { background: true })
```

## Practical Example - Indexing for a User Lookup

```javascript
// Insert sample data
db.users.insertMany([
  { name: "Alice Smith", email: "alice@example.com", role: "admin", createdAt: new Date() },
  { name: "Bob Jones", email: "bob@example.com", role: "user", createdAt: new Date() },
  { name: "Carol Brown", email: "carol@example.com", role: "user", createdAt: new Date() }
])

// Create index on email for login lookups
db.users.createIndex({ email: 1 }, { unique: true })

// This query now uses the index
db.users.find({ email: "alice@example.com" })
```

## When to Add an Index

```text
- Field appears frequently in query filter conditions
- Field is used for sorting results
- Field is used in $lookup join conditions
- Collection has more than a few thousand documents
- Query examines many documents but returns few (high selectivity)
```

## Index Size and Memory

```javascript
// Check index size in bytes
db.users.stats().indexSizes
// { "_id_": 36864, "email_1": 36864 }

// Total index size
db.users.totalIndexSize()
```

## Dropping a Single Field Index

```javascript
// By index name
db.users.dropIndex("email_1")

// By key specification
db.users.dropIndex({ email: 1 })
```

## Summary

A single field index on a specific document field dramatically reduces query execution time by allowing MongoDB to scan the index rather than every document. Create them with `createIndex({ field: direction })`, where direction is 1 (ascending) or -1 (descending). Verify index usage with `explain("executionStats")` and look for `IXSCAN` in the winning plan. Add indexes on fields that appear frequently in filter conditions, sort operations, and join conditions.
