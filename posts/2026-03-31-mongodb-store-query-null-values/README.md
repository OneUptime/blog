# How to Store and Query Null Values in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, NULL, Query, Schema, BSON

Description: Learn how MongoDB distinguishes between null values and missing fields, how to query each case, and how to use sparse indexes for null-heavy collections.

---

## Null vs Missing in MongoDB

MongoDB treats `null` (explicit null value) and a missing field differently. This distinction is critical for writing correct queries and choosing the right index strategy.

- **Null**: The field exists in the document with a value of `null`
- **Missing**: The field does not exist in the document at all

## Inserting Null Values

```javascript
db.users.insertMany([
  { name: "Alice", email: "alice@example.com", deletedAt: null }, // explicit null
  { name: "Bob", email: "bob@example.com" }, // deletedAt field is missing entirely
  { name: "Carol", email: "carol@example.com", deletedAt: new Date("2025-12-01") }, // has a date
]);
```

## Querying for Null

The `null` query matches both explicit null values AND missing fields:

```javascript
// Returns Alice (explicit null) AND Bob (missing field)
db.users.find({ deletedAt: null });
```

This behavior surprises many developers. To distinguish:

```javascript
// Only returns Alice (explicit null)
db.users.find({ deletedAt: { $type: "null" } });

// Only returns Bob (field does not exist)
db.users.find({ deletedAt: { $exists: false } });

// Returns both Alice and Bob (null or missing)
db.users.find({ deletedAt: null });

// Only returns Carol (has an actual date value)
db.users.find({ deletedAt: { $ne: null, $exists: true } });
```

## Soft Delete Pattern

Null is commonly used for soft deletes where `null` means "not deleted":

```javascript
// Find all active (not deleted) users
db.users.find({ deletedAt: null });

// Soft delete a user
db.users.updateOne({ name: "Bob" }, { $set: { deletedAt: new Date() } });

// Restore a user
db.users.updateOne({ name: "Bob" }, { $set: { deletedAt: null } });
```

## Using $exists for Optional Fields

For optional fields that may not be present on all documents:

```javascript
// Find users who have provided a phone number
db.users.find({ phone: { $exists: true, $ne: null } });

// Find users who have never set a phone number
db.users.find({ phone: { $exists: false } });
```

## Sparse Indexes for Null-Heavy Collections

If most documents have a missing field, a standard index stores a key for every missing document (treating it as null), wasting space. Use a sparse index to only index documents where the field exists, including those with an explicit null value:

```javascript
// Sparse index - only indexes documents where deletedAt exists (including null values), skips documents where the field is missing entirely
db.users.createIndex({ deletedAt: 1 }, { sparse: true });
```

Note: sparse indexes may not be selected for queries that need to match missing fields (like `{ deletedAt: null }`) because the index does not contain entries for documents where the field is absent, which would produce incomplete results.

## Partial Index for Active Records

A partial index is more explicit and powerful than a sparse index:

```javascript
// Only index documents where deletedAt is null (active users)
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { deletedAt: null } }
);

// This query will use the partial index
db.users.find({ deletedAt: null, email: "alice@example.com" });
```

## Setting Fields to Null vs Removing Fields

To set a field to null:

```javascript
db.users.updateOne({ name: "Alice" }, { $set: { middleName: null } });
```

To remove a field entirely:

```javascript
db.users.updateOne({ name: "Alice" }, { $unset: { middleName: "" } });
```

## Summary

MongoDB's `null` query matches both explicit null values and missing fields, which is the most common source of subtle query bugs. Use `$type: "null"` to match only explicit null, `$exists: false` for missing fields, and `$ne: null` combined with `$exists: true` to find fields with actual values. Use partial indexes with `partialFilterExpression` to efficiently index only the subset of documents relevant to your most frequent queries.
