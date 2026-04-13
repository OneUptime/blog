# How to Fix MongoError: Cannot Apply $push Modifier to Non-Array in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Push Modifier, Array, Update Operator, Error

Description: Learn why MongoDB throws the $push modifier error on non-array fields and how to fix it by correcting field types, using $set, or initializing fields properly.

---

## Understanding the Error

`MongoError: Cannot apply $push/$addToSet operator to non-array field` occurs when you use `$push` or `$addToSet` on a document field that is not an array. MongoDB's `$push` operator appends an element to an existing array - if the target field is a string, number, object, or `null`, the operation fails.

```text
MongoServerError: Cannot apply $push to a non-array value
```

## Cause 1: Field Was Set to a Non-Array Value

If you previously saved the field as a scalar and now try to push to it:

```javascript
// Document: { _id: 1, tags: "javascript" }

// This fails - tags is a string, not an array
await db.collection('posts').updateOne(
  { _id: 1 },
  { $push: { tags: "mongodb" } }
);
```

**Fix:** Convert the field to an array first with `$set`, then push:

```javascript
// Step 1: Convert to array if it's a scalar
await db.collection('posts').updateOne(
  { _id: 1, tags: { $not: { $type: "array" } } },
  [{ $set: { tags: { $cond: { if: { $eq: ["$tags", null] }, then: [], else: ["$tags"] } } } }]
);

// Step 2: Now push safely
await db.collection('posts').updateOne(
  { _id: 1 },
  { $push: { tags: "mongodb" } }
);
```

## Cause 2: Missing Field (Null or Undefined)

`$push` on a missing field will initialize it as an array - this has worked since early MongoDB versions. But if the field was explicitly set to `null`, it fails:

```javascript
// Document: { _id: 2, tags: null }
await db.collection('posts').updateOne(
  { _id: 2 },
  { $push: { tags: "mongodb" } }
); // Error: cannot apply $push to non-array
```

**Fix:** Use `$setOnInsert` during creation to always initialize arrays, or use a pipeline update to coerce:

```javascript
// Initialize as array when inserting
await db.collection('posts').insertOne({
  title: "My Post",
  tags: [] // always an array from the start
});
```

Or use a conditional pipeline update to handle the null case:

```javascript
await db.collection('posts').updateOne(
  { _id: 2 },
  [{ $set: { tags: { $ifNull: ["$tags", []] } } }]
);
// Now push
await db.collection('posts').updateOne(
  { _id: 2 },
  { $push: { tags: "mongodb" } }
);
```

## Cause 3: Typo in Field Path

A mistyped field path hits an unintended field that holds a scalar:

```javascript
// Document: { _id: 3, tags: "legacy-tag", meta: { tags: [] } }

// Typo: "tags" instead of "meta.tags" - hits the root string field
await db.collection('posts').updateOne(
  { _id: 3 },
  { $push: { tags: "mongodb" } } // hits root "tags" which is a string, not meta.tags
);
```

**Fix:** Use the correct dot-notation path:

```javascript
await db.collection('posts').updateOne(
  { _id: 3 },
  { $push: { "meta.tags": "mongodb" } }
);
```

## Schema Validation to Prevent Future Issues

Use JSON Schema validation to enforce that certain fields are always arrays:

```javascript
await db.createCollection('posts', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        tags: { bsonType: "array", items: { bsonType: "string" } }
      }
    }
  }
});
```

## Summary

The `$push to non-array` error means your document has a field that is not an array type. Fix it by converting the field using a pipeline update with `$ifNull` or `$cond`, always initializing array fields as `[]` at insert time, and adding schema validation to enforce array types going forward.
