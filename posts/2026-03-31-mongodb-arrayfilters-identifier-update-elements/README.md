# How to Use $[identifier] with arrayFilters to Update Specific Array Elements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Database, Array

Description: Learn how MongoDB's $[identifier] operator combined with arrayFilters lets you update only array elements that match a specific condition.

---

MongoDB 3.6 introduced the `$[identifier]` filtered positional operator, which lets you update only the array elements that satisfy a condition you define in an `arrayFilters` option. This is more targeted than `$[]` (all elements) and more flexible than `$` (first match only).

## Syntax

```javascript
db.collection.updateOne(
  { filter },
  { $set: { "arrayField.$[elem].field": value } },
  { arrayFilters: [ { "elem.field": condition } ] }
)
```

The identifier `elem` (any name you choose) links the `$[elem]` placeholder to the corresponding filter in the `arrayFilters` array.

## Basic Example - Update Orders with a Specific Status

Update all line items with status `"pending"` to `"processing"` in a single document:

```javascript
db.orders.updateOne(
  { _id: ObjectId("64a1b2c3d4e5f6a7b8c9d0e1") },
  { $set: { "items.$[item].status": "processing" } },
  { arrayFilters: [ { "item.status": "pending" } ] }
)
```

Only items where `status === "pending"` are modified.

## Using Comparison Operators in arrayFilters

Discount all line items with a price above 100:

```javascript
db.orders.updateMany(
  {},
  { $mul: { "items.$[item].price": 0.9 } },
  { arrayFilters: [ { "item.price": { $gt: 100 } } ] }
)
```

Any comparison operator (`$gt`, `$lt`, `$gte`, `$lte`, `$eq`, `$ne`) works inside `arrayFilters`.

## Multiple Filters in One Update

Apply two separate filters simultaneously with different identifiers:

```javascript
db.inventory.updateOne(
  { warehouseId: "wh_01" },
  {
    $set: {
      "bins.$[lowBin].reorder": true,
      "bins.$[fullBin].reorder": false
    }
  },
  {
    arrayFilters: [
      { "lowBin.quantity": { $lte: 10 } },
      { "fullBin.quantity": { $gte: 100 } }
    ]
  }
)
```

Each identifier resolves independently - elements matching `lowBin` get `reorder: true`, those matching `fullBin` get `reorder: false`.

## Updating Nested Arrays

`$[identifier]` handles nested arrays that `$` cannot:

```javascript
db.boards.updateOne(
  { _id: "board_1" },
  { $set: { "columns.$[col].cards.$[card].done": true } },
  {
    arrayFilters: [
      { "col.status": "active" },
      { "card.assignee": "alice" }
    ]
  }
)
```

This marks Alice's cards done inside all active columns.

## Combining with $unset

Remove a field from specific array elements:

```javascript
db.products.updateMany(
  {},
  { $unset: { "variants.$[v].legacyCode": "" } },
  { arrayFilters: [ { "v.discontinued": true } ] }
)
```

## Key Rules

- The identifier must start with a lowercase letter.
- Every identifier used in the update expression must have a corresponding entry in `arrayFilters`.
- Each entry in `arrayFilters` must correspond to a `$[identifier]` used in the update expression; unused filters cause an error.

## Summary

`$[identifier]` with `arrayFilters` provides surgical control over which array elements get updated. It supports complex query conditions, multiple simultaneous filters, and nested array traversal - making it the most powerful of MongoDB's three positional update operators. Use it whenever `$` (first match) or `$[]` (all elements) would be too broad or too limited.
