# How to Query NULL and Missing Fields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, NULL, Missing Field, Schema

Description: Learn how to query for null values and missing fields in MongoDB using $exists, $type, and equality operators with practical examples and index strategies.

---

## The Difference Between Null and Missing Fields

MongoDB distinguishes between a field explicitly set to `null` and a field that does not exist in the document at all. Understanding this distinction is essential for writing correct queries.

```javascript
// Three documents representing different states
await db.collection('users').insertMany([
  { _id: 1, name: 'Alice', phone: '555-1234' },    // phone exists with a value
  { _id: 2, name: 'Bob',   phone: null },           // phone exists, value is null
  { _id: 3, name: 'Carol' }                          // phone field is missing entirely
]);
```

## Querying for null (Includes Both null and Missing)

The equality operator `{ field: null }` matches documents where the field is `null` OR where the field does not exist:

```javascript
// Returns documents 2 and 3 (null AND missing)
const result = await db.collection('users').find({ phone: null }).toArray();
// [{ _id: 2, phone: null }, { _id: 3 }]
```

## Querying Only Missing Fields

Use `$exists: false` to find documents where the field is completely absent:

```javascript
// Returns only document 3 (missing, not null)
const missing = await db.collection('users').find({
  phone: { $exists: false }
}).toArray();
```

## Querying Only Explicit null

Combine `$eq: null` with `$exists: true` to match only documents where the field exists and is set to `null`:

```javascript
// Returns only document 2 (explicitly null, not missing)
const nullOnly = await db.collection('users').find({
  phone: { $exists: true, $eq: null }
}).toArray();
```

## Querying for Non-Null Values

Find documents where the field exists and is not null using `$ne`:

```javascript
// Returns only document 1 (has a real phone value)
const hasPhone = await db.collection('users').find({
  phone: { $ne: null }
}).toArray();
```

## Using $type to Distinguish Null

The `$type` operator can distinguish BSON null (type 10) from other values:

```javascript
// Only documents where phone is exactly BSON null (not missing, not other types)
const bsonNull = await db.collection('users').find({
  phone: { $type: 10 } // 10 = null BSON type
}).toArray();
```

Or using the string name:

```javascript
const bsonNull = await db.collection('users').find({
  phone: { $type: 'null' }
}).toArray();
```

## Aggregation Pipeline for null/Missing Analysis

```javascript
// Count documents by phone field state
const summary = await db.collection('users').aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      hasPhone: {
        $sum: {
          $cond: [
            { $and: [
              { $ne: [{ $type: "$phone" }, "missing"] },
              { $ne: ["$phone", null] }
            ]},
            1, 0
          ]
        }
      },
      phoneIsNull: {
        $sum: {
          $cond: [
            { $and: [
              { $ne: [{ $type: "$phone" }, "missing"] },
              { $eq: ["$phone", null] }
            ]},
            1, 0
          ]
        }
      },
      phoneMissing: {
        $sum: {
          $cond: [{ $eq: [{ $type: "$phone" }, "missing"] }, 1, 0]
        }
      }
    }
  }
]).toArray();
```

## Indexing Null and Missing Fields

Sparse indexes only index documents where the field exists, including null values. They skip documents where the field is missing entirely:

```javascript
// Sparse index - does not include documents where phone is missing
await db.collection('users').createIndex(
  { phone: 1 },
  { sparse: true }
);
```

A partial index to cover both null and missing:

```javascript
// Index only documents that HAVE a phone value (not null, not missing)
await db.collection('users').createIndex(
  { phone: 1 },
  { partialFilterExpression: { phone: { $type: 'string' } } }
);
```

## Summary

In MongoDB, `{ field: null }` matches both null and missing fields. Use `$exists: false` for missing-only, `$exists: true` combined with `$eq: null` for null-only, and `$ne: null` for documents with a real value. Use sparse or partial indexes to efficiently query non-null values while skipping missing fields.
