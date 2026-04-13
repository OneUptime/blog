# How to Use $bitsAllClear for Bitwise Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bitwise Operators, Query Operator, Database, NoSQL

Description: Learn how to use MongoDB's $bitsAllClear operator to query documents where all specified bit positions in a numeric field are clear (set to 0).

---

## What Is the $bitsAllClear Operator?

The `$bitsAllClear` operator matches documents where all of the specified bit positions in a numeric field are clear - meaning they are set to `0`. This is useful when working with permission flags, status bitmasks, or any application that stores state as individual bits.

```javascript
{ field: { $bitsAllClear: <bitmask> } }
```

The bitmask can be specified as:
- An integer (each set bit in the integer represents a position to check)
- A BinData value
- An array of zero-based bit positions

## Basic Example

Suppose you store user permissions as a bitmask in a `users` collection:

```javascript
// Bit positions:
// 0: read    (1)
// 1: write   (2)
// 2: delete  (4)
// 3: admin   (8)

{ _id: 1, name: "Alice", permissions: 7 }  // binary: 0111 - read, write, delete
{ _id: 2, name: "Bob",   permissions: 3 }  // binary: 0011 - read, write
{ _id: 3, name: "Carol", permissions: 1 }  // binary: 0001 - read only
```

Find users who do not have delete (bit 2) or admin (bit 3) permissions — that is, where both those bits are clear (set to 0):

```javascript
// Check bits 2 and 3 are both 0: bitmask = 4 + 8 = 12
db.users.find({ permissions: { $bitsAllClear: 12 } })
```

Returns documents for Bob (permissions: 3) and Carol (permissions: 1), since neither has bits 2 or 3 set.

## Using an Array of Bit Positions

Instead of a bitmask integer, you can specify bit positions directly as an array:

```javascript
// Same query using array notation: check bits at positions 2 and 3
db.users.find({ permissions: { $bitsAllClear: [2, 3] } })
```

## Combining with Other Operators

```javascript
// Users who are active AND don't have admin or delete permissions
db.users.find({
  status: "active",
  permissions: { $bitsAllClear: [2, 3] }
})
```

## Practical Use Case - Feature Flags

Feature flags stored as bitmasks benefit from bitwise operators:

```javascript
// Bit 0: beta_ui, Bit 1: dark_mode, Bit 2: analytics, Bit 3: notifications
{ _id: 1, userId: "u1", flags: 5 }  // binary: 0101 - beta_ui + analytics
{ _id: 2, userId: "u2", flags: 3 }  // binary: 0011 - beta_ui + dark_mode
{ _id: 3, userId: "u3", flags: 0 }  // no features enabled
```

Find users with neither dark_mode (bit 1) nor notifications (bit 3) enabled:

```javascript
db.featureFlags.find({ flags: { $bitsAllClear: [1, 3] } })
```

## Supported Field Types

`$bitsAllClear` works on:
- Integer values (int32, int64)
- Double values that are whole numbers and fit within a signed 64-bit integer range (e.g., `3.0` works, but `3.5` does not)
- BinData (binary data)

It will not match doubles that have a fractional component or fall outside the signed 64-bit integer range, and will not match non-numeric types.

## Working with BinData

```javascript
db.devices.find({
  statusByte: { $bitsAllClear: BinData(0, "AA==") }
})
```

## Indexing Considerations

Bitwise query operators cannot take advantage of standard indexes efficiently. For high-cardinality permission or flag queries, consider denormalizing the bits into separate boolean fields and indexing those:

```javascript
db.users.createIndex({ isAdmin: 1, canDelete: 1 })
```

## Summary

The `$bitsAllClear` operator provides a concise way to check that specific bits in a numeric field are all set to 0. It's ideal for permission systems and feature flag stores. For best performance at scale, consider complementing bitmask fields with indexed boolean fields for the most queried bits.
