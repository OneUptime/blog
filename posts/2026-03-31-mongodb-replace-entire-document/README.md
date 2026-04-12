# How to Replace an Entire Document in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update, Replace, Driver, Operation

Description: Learn how to replace an entire MongoDB document using replaceOne, the differences from updateOne with $set, and when replacement is the right choice.

---

MongoDB provides two approaches to changing document content: field-level updates with `updateOne`/`updateMany` using operators like `$set`, and full document replacement with `replaceOne`. Understanding when to use each is important for correctness and performance.

## replaceOne vs updateOne

`replaceOne` replaces the entire document (except `_id`) with a new document:

```javascript
// replaceOne - replaces EVERYTHING except _id
db.users.replaceOne(
  { _id: userId },
  {
    name: "Jane Doe",
    email: "jane@example.com",
    role: "admin"
    // All other previous fields are GONE
  }
)
```

`updateOne` with `$set` only changes specified fields:

```javascript
// updateOne - only modifies specified fields, preserves others
db.users.updateOne(
  { _id: userId },
  { $set: { name: "Jane Doe" } }
)
```

## Basic replaceOne Usage

```javascript
const newDocument = {
  name: "Jane Doe",
  email: "jane@example.com",
  role: "admin",
  createdAt: existingCreatedAt,  // must re-include fields you want to keep
  updatedAt: new Date()
};

const result = await db.collection("users").replaceOne(
  { _id: new ObjectId(userId) },
  newDocument
);

console.log(`Matched: ${result.matchedCount}, Replaced: ${result.modifiedCount}`);
```

## replaceOne Does Not Change _id

The `_id` field is immutable and is always preserved. If you include a different `_id` in the replacement document, MongoDB throws an error:

```javascript
// Including a different _id causes an error (code 16837)
db.users.replaceOne(
  { _id: userId },
  { _id: "some-other-id", name: "Jane" }  // Error: _id field cannot be changed
)
```

## Upsert with replaceOne

Use `upsert: true` to insert if no document matches the filter:

```javascript
db.settings.replaceOne(
  { key: "app_config" },
  {
    key: "app_config",
    maxConnections: 100,
    timeout: 30,
    updatedAt: new Date()
  },
  { upsert: true }
)
```

## findOneAndReplace

To return the document before or after replacement:

```javascript
// Returns the document BEFORE replacement (default)
const before = await db.collection("products").findOneAndReplace(
  { sku: "A100" },
  { sku: "A100", name: "Widget v2", price: 49.99 }
);

// Returns the document AFTER replacement
const after = await db.collection("products").findOneAndReplace(
  { sku: "A100" },
  { sku: "A100", name: "Widget v2", price: 49.99 },
  { returnDocument: "after" }
);
```

## When to Use replaceOne

Replacement is appropriate when:
- The application manages the full document state and tracks all fields
- You want to clear all fields not explicitly included in the new document
- The document schema has changed and stale fields must be removed

```javascript
// State machine: replace with a completely new representation
async function transitionOrderState(orderId, newState) {
  const baseFields = await getOrderBaseFields(orderId);
  return db.collection("orders").replaceOne(
    { _id: orderId, version: baseFields.version },
    {
      ...baseFields,
      ...newState,
      version: baseFields.version + 1,
      updatedAt: new Date()
    }
  );
}
```

## When NOT to Use replaceOne

Avoid replacement when:
- You only need to change a few fields (use `$set` instead)
- Other processes concurrently update different fields (risk of losing their changes)
- The document is large and you are only changing a small portion

## Summary

`replaceOne` replaces the entire document content (preserving `_id`) with a new document you provide. It is appropriate when your application owns the full document state. For partial updates, always prefer `updateOne` with `$set` and other update operators to avoid accidentally removing fields. Use `findOneAndReplace` when you need the document returned. For conditional replacement, include state conditions in the filter and check `modifiedCount`.
