# How to Query Embedded Arrays of Objects in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Array, Dot Notation, Operator

Description: Learn how to query MongoDB documents containing arrays of embedded objects using dot notation, $elemMatch, and aggregation filtering.

---

Arrays of embedded objects are one of MongoDB's most powerful data modeling features. Querying them effectively requires understanding dot notation for field access, `$elemMatch` for multi-condition element queries, and when to use aggregation for complex filtering.

## Sample Data

```javascript
db.orders.insertMany([
  {
    customerId: 1,
    items: [
      { sku: "A100", name: "Keyboard", qty: 1, price: 79.99 },
      { sku: "B200", name: "Mouse", qty: 2, price: 29.99 }
    ]
  },
  {
    customerId: 2,
    items: [
      { sku: "A100", name: "Keyboard", qty: 3, price: 79.99 },
      { sku: "C300", name: "Monitor", qty: 1, price: 349.99 }
    ]
  }
])
```

## Dot Notation for Single Field Conditions

Access a field within an embedded array object using dot notation:

```javascript
// Find orders containing any item with sku "A100"
db.orders.find({ "items.sku": "A100" })

// Find orders with any item priced over $100
db.orders.find({ "items.price": { $gt: 100 } })
```

## $elemMatch for Multi-Field Conditions on Same Element

When multiple conditions must apply to the same array element, use `$elemMatch`:

```javascript
// Find orders where a single item has sku "A100" AND qty >= 2
db.orders.find({
  items: {
    $elemMatch: {
      sku: "A100",
      qty: { $gte: 2 }
    }
  }
})
// Returns customerId: 2 only (qty=3 and sku=A100 in same element)
```

Without `$elemMatch`, conditions could match across different elements:

```javascript
// This may return unexpected results
db.orders.find({
  "items.sku": "A100",
  "items.qty": { $gte: 2 }
})
// Returns BOTH orders because customerId:1 has sku=A100 in one item
// and qty=2 in another item
```

## Projection to Return Only Matching Array Elements

Use `$elemMatch` in the projection to return only the matching element:

```javascript
db.orders.find(
  { "items.sku": "A100" },
  {
    customerId: 1,
    items: { $elemMatch: { sku: "A100" } }
  }
)
// Only includes the A100 item in the returned items array
```

## Aggregation with $filter for Multiple Matching Elements

When you need all matching elements (not just the first), use `$filter`:

```javascript
db.orders.aggregate([
  { $match: { "items.price": { $gt: 50 } } },
  {
    $project: {
      customerId: 1,
      expensiveItems: {
        $filter: {
          input: "$items",
          as: "item",
          cond: { $gt: ["$$item.price", 50] }
        }
      }
    }
  }
])
```

## Nested Arrays (Arrays Within Arrays)

For doubly nested structures, chain dot notation and `$elemMatch`:

```javascript
db.catalog.find({
  "variants.options.color": "red"
})

// Multi-condition on nested sub-object
db.catalog.find({
  variants: {
    $elemMatch: {
      "options.color": "red",
      "options.size": "M"
    }
  }
})
```

## Index Recommendations

Create multikey indexes on frequently queried fields within embedded arrays:

```javascript
db.orders.createIndex({ "items.sku": 1 })
db.orders.createIndex({ "items.sku": 1, "items.price": 1 })
```

Note: compound multikey indexes have restrictions - at most one indexed field path in a compound index can traverse through an array. You can index multiple scalar sub-fields of the same array (as shown above), but you cannot create a compound index on two separate array fields in the same document (e.g., `{ arrayA: 1, arrayB: 1 }` where both `arrayA` and `arrayB` are arrays).

## Summary

Use dot notation for single-field conditions on embedded array objects. Use `$elemMatch` when multiple conditions must apply to the same array element to avoid cross-element matching. For projecting only matching elements, use `$elemMatch` in the projection. For returning all matching elements within an array, use aggregation with `$filter`. Index the nested fields most commonly used in queries for performance.
