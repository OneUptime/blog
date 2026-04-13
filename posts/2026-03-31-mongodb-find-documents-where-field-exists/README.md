# How to Find Documents Where a Specific Field Exists in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Operator, Schema, Index

Description: Learn how to query MongoDB for documents that have or are missing a specific field using the $exists operator, and related null handling patterns.

---

MongoDB is schema-flexible, meaning documents in the same collection can have different fields. The `$exists` operator lets you query based on whether a field is present or absent, regardless of its value.

## Basic $exists Usage

```javascript
// Find documents that HAVE a "phone" field
db.users.find({ phone: { $exists: true } })

// Find documents that DO NOT HAVE a "phone" field
db.users.find({ phone: { $exists: false } })
```

## $exists vs Null Check

There is an important distinction between `$exists: false` and checking for `null`:

```javascript
// Three different document scenarios:
// 1. { name: "Alice" }               - field absent
// 2. { name: "Bob", phone: null }    - field exists, value is null
// 3. { name: "Carol", phone: "555" } - field exists with value

// $exists: false - only matches scenario 1 (absent)
db.users.find({ phone: { $exists: false } })

// null equality - matches scenarios 1 AND 2 (absent or null)
db.users.find({ phone: null })

// $exists: true AND not null - only matches scenario 3
db.users.find({ phone: { $exists: true, $ne: null } })
```

## Combining $exists with Type Checks

Use `$type` alongside `$exists` when you want a field to exist and be a specific type:

```javascript
// Field exists and is a string
db.documents.find({
  description: { $exists: true, $type: "string" }
})

// Field exists and is a number
db.readings.find({
  temperature: { $exists: true, $type: "number" }
})
```

BSON type names include: `"string"`, `"int"`, `"double"`, `"date"`, `"bool"`, `"array"`, `"object"`, `"null"`.

## Finding Documents Missing Required Fields

Useful for data quality audits:

```javascript
// Find user documents missing the "email" field
db.users.find({ email: { $exists: false } })

// Count documents missing required fields
const missingEmail = await db.collection("users").countDocuments({
  email: { $exists: false }
});

console.log(`${missingEmail} users missing email field`);
```

## Checking Nested Fields

Use dot notation to check fields within embedded documents:

```javascript
// Find documents where address.zipCode exists
db.customers.find({ "address.zipCode": { $exists: true } })

// Find documents where nested field is missing
db.orders.find({ "shipping.trackingNumber": { $exists: false } })
```

## Using $exists in Aggregation

```javascript
db.products.aggregate([
  {
    $match: {
      discountedPrice: { $exists: true }
    }
  },
  {
    $project: {
      name: 1,
      originalPrice: "$price",
      discountedPrice: 1,
      savings: { $subtract: ["$price", "$discountedPrice"] }
    }
  }
])
```

## Sparse Index for Optional Fields

When querying optional fields that exist in only a subset of documents, a sparse index saves space and improves performance:

```javascript
db.users.createIndex(
  { phone: 1 },
  { sparse: true }
)
```

A sparse index only includes entries for documents where the indexed field exists, even if the field value is null. Documents that do not contain the field at all are omitted, making the index smaller and faster for existence queries.

## Summary

Use `$exists: true` to find documents that contain a field and `$exists: false` to find documents missing a field. Note that `{ field: null }` matches both absent fields and fields explicitly set to null - use `$exists: false` when you specifically need to detect missing fields. For optional fields queried frequently, create a sparse index to improve performance and save storage.
