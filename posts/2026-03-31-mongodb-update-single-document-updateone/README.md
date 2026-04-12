# How to Update a Single Document in MongoDB with updateOne()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update, updateOne, Write Operation, Document

Description: Learn how to use MongoDB's updateOne() to modify the first matching document using update operators like $set, $inc, and $push.

---

## What Is updateOne()

`updateOne()` modifies the first document that matches a given filter. It does not affect additional matching documents. This makes it ideal when you know your filter uniquely identifies one record, or when you intentionally want to update only one match.

The method signature is:

```javascript
db.collection.updateOne(filter, update, options)
```

- `filter` - the query condition to find the document
- `update` - the update operators and values to apply
- `options` - optional flags such as `upsert`

## Basic Example with $set

The `$set` operator updates specific fields without touching others.

```javascript
db.users.updateOne(
  { email: "alice@example.com" },
  { $set: { status: "active", updatedAt: new Date() } }
)
```

If the filter matches a document, MongoDB updates only `status` and `updatedAt`, leaving all other fields unchanged.

## Using $inc to Increment a Field

`$inc` adds a numeric value to an existing field (or sets it if missing).

```javascript
db.products.updateOne(
  { _id: ObjectId("64a1b2c3d4e5f6789abcdef0") },
  { $inc: { stock: -1, sold: 1 } }
)
```

This atomically decrements `stock` by 1 and increments `sold` by 1.

## Checking the Result

`updateOne()` returns a result object with useful counters:

```javascript
const result = await db.collection("users").updateOne(
  { email: "alice@example.com" },
  { $set: { lastLogin: new Date() } }
);

console.log(result.matchedCount);  // 1 if found, 0 if not
console.log(result.modifiedCount); // 1 if updated, 0 if already identical
```

## Upsert Option

If you want to insert a document when no match is found, pass `upsert: true`:

```javascript
db.settings.updateOne(
  { userId: "user123" },
  { $set: { theme: "dark", notifications: true } },
  { upsert: true }
)
```

When upserted, `result.upsertedId` contains the new document's `_id`.

## Updating Nested Fields

Use dot notation to update fields inside embedded documents:

```javascript
db.orders.updateOne(
  { _id: orderId },
  { $set: { "address.city": "New York", "address.zip": "10001" } }
)
```

## Common Mistakes

- Passing `{ field: value }` instead of `{ $set: { field: value } }` will throw an error because `updateOne()` requires update operators. Use `replaceOne()` if you intend to replace the entire document.
- Not filtering by a unique field, causing a random document to be updated.
- Forgetting that `updateOne()` stops after the first match.

## Summary

`updateOne()` is the right choice when you need to modify exactly one MongoDB document. Always use update operators like `$set` or `$inc` rather than a raw replacement document, and check `matchedCount` and `modifiedCount` in the result to verify the operation succeeded. Add `upsert: true` when you want to create the document if it does not yet exist.
