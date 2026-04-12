# How to Use $rename to Rename Fields in MongoDB Documents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update Operator, Schema Migration, Document

Description: Learn how to use MongoDB's $rename operator to rename fields in documents, including bulk migrations, embedded documents, and handling fields that don't exist.

---

## What Is the $rename Operator?

The `$rename` operator in MongoDB renames a field in a document. It is the primary tool for schema evolution when field names need to change across a collection. The operator moves the value from the old field name to the new field name in a single atomic operation.

## Basic Syntax

```javascript
db.collection.updateOne(
  { <filter> },
  { $rename: { <oldFieldName>: <newFieldName> } }
)
```

## Example: Renaming a Top-Level Field

```javascript
// Document: { _id: 1, fname: "Alice", lname: "Smith" }

db.users.updateOne(
  { _id: 1 },
  { $rename: { fname: "firstName", lname: "lastName" } }
)

// Result: { _id: 1, firstName: "Alice", lastName: "Smith" }
```

## Renaming Fields Across All Documents

Use `updateMany` to apply the rename to an entire collection.

```javascript
db.users.updateMany(
  {},
  { $rename: { fname: "firstName", lname: "lastName" } }
)
```

This is the standard approach for schema migration. Documents that do not have the old field name are skipped silently.

## Renaming Fields in Embedded Documents

Use dot notation to rename fields inside nested objects.

```javascript
db.orders.updateMany(
  {},
  { $rename: { "address.zip": "address.postalCode" } }
)
```

## Renaming a Field to a Different Level

You can move a field from a nested document to the top level by specifying the new path.

```javascript
// Document: { _id: 1, meta: { createdAt: ISODate(...) } }
db.items.updateOne(
  { _id: 1 },
  { $rename: { "meta.createdAt": "createdAt" } }
)
// Result: { _id: 1, meta: {}, createdAt: ISODate(...) }
```

Note that the `meta` embedded document remains as an empty object. If you want to remove it, run a separate `$unset` operation.

## Behavior When the Field Does Not Exist

If the source field does not exist in a document, `$rename` has no effect on that document and does not raise an error. This makes it safe to run migrations on collections with mixed schemas.

## Renaming Multiple Fields at Once

Pass multiple key-value pairs to rename several fields in one operation.

```javascript
db.products.updateMany(
  {},
  {
    $rename: {
      "desc": "description",
      "qty": "quantity",
      "mfg": "manufacturer"
    }
  }
)
```

## Limitations to Know

- You cannot use `$rename` to rename fields within array elements using the positional operator. For arrays, you need to use `$unset` and `$set` or an aggregation pipeline update.
- The destination field name must not be the same as the source field name.
- If the destination field already exists, its current value is overwritten.

## Aggregation Pipeline Alternative

For more complex renames involving arrays, use the aggregation pipeline form of `updateMany`.

```javascript
db.logs.updateMany(
  {},
  [
    { $set: { newField: "$oldField" } },
    { $unset: "oldField" }
  ]
)
```

## Summary

The `$rename` operator is the simplest way to rename fields in MongoDB documents, supporting both single-document and bulk collection-wide migrations. It handles missing fields gracefully, works with dot notation for nested fields, and completes the rename atomically. For renaming fields inside array elements, prefer the aggregation pipeline update syntax.
