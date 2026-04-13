# How to Use $unwind to Deconstruct Arrays in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $unwind, Array Processing, Pipeline Stage, NoSQL

Description: Learn how to use MongoDB's $unwind stage to deconstruct array fields into separate documents, enabling per-element aggregation and analysis.

---

## What Is the $unwind Stage?

The `$unwind` stage deconstructs an array field from the input documents and outputs one document for each element. If a document has an array with 3 elements, `$unwind` produces 3 separate documents - one per element.

```javascript
{ $unwind: "$arrayField" }

// Extended syntax with options:
{
  $unwind: {
    path: "$arrayField",
    includeArrayIndex: "indexField",
    preserveNullAndEmptyArrays: true
  }
}
```

## Basic Example

Given an `orders` collection:

```javascript
{ _id: 1, customer: "Alice", items: ["apple", "banana", "cherry"] }
```

After `$unwind`:

```javascript
db.orders.aggregate([{ $unwind: "$items" }])
```

Output:

```javascript
{ _id: 1, customer: "Alice", items: "apple" }
{ _id: 1, customer: "Alice", items: "banana" }
{ _id: 1, customer: "Alice", items: "cherry" }
```

## Per-Element Aggregation

The primary use case for `$unwind` is to aggregate on array elements:

```javascript
db.orders.aggregate([
  { $unwind: "$items" },
  {
    $group: {
      _id: "$items.productId",
      totalQuantity: { $sum: "$items.quantity" },
      totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
    }
  },
  { $sort: { totalRevenue: -1 } }
])
```

## Including Array Index

Use `includeArrayIndex` to capture each element's position:

```javascript
db.orders.aggregate([
  {
    $unwind: {
      path: "$items",
      includeArrayIndex: "itemPosition"
    }
  }
])
```

Output includes `itemPosition: 0`, `itemPosition: 1`, etc.

## Handling Missing and Empty Arrays

By default, documents with missing or empty arrays are dropped. Use `preserveNullAndEmptyArrays`:

```javascript
db.users.aggregate([
  {
    $unwind: {
      path: "$roles",
      preserveNullAndEmptyArrays: true
    }
  }
])
```

Documents with a null `roles` field are preserved with `roles` set to null. Documents with a missing `roles` field or an empty array are preserved but without the `roles` field in the output.

## Combining with $lookup

A common pattern is to `$unwind` after a `$lookup` to flatten the joined array:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "productDetails"
    }
  },
  {
    $unwind: {
      path: "$productDetails",
      preserveNullAndEmptyArrays: false
    }
  }
])
```

## Reconstructing with $group

After processing, you can re-group to reassemble arrays:

```javascript
db.orders.aggregate([
  // Deconstruct
  { $unwind: "$items" },
  // Filter individual elements
  { $match: { "items.quantity": { $gte: 2 } } },
  // Reassemble
  {
    $group: {
      _id: "$_id",
      customer: { $first: "$customer" },
      items: { $push: "$items" }
    }
  }
])
```

## Counting Array Elements

```javascript
db.articles.aggregate([
  { $unwind: "$tags" },
  { $sortByCount: "$tags" }
])
```

Find the most popular tags across all articles.

## Practical Use Case - Order Line Item Analysis

```javascript
db.orders.aggregate([
  { $match: { status: "completed", orderDate: { $gte: new Date("2024-01-01") } } },
  { $unwind: "$lineItems" },
  {
    $group: {
      _id: {
        category: "$lineItems.category",
        month: { $month: "$orderDate" }
      },
      totalSold: { $sum: "$lineItems.quantity" },
      revenue: { $sum: { $multiply: ["$lineItems.price", "$lineItems.quantity"] } }
    }
  },
  { $sort: { "_id.month": 1, revenue: -1 } }
])
```

## Performance Considerations

`$unwind` can significantly increase document count (a 1000-document collection with arrays of 10 elements becomes 10,000 documents). Place `$match` filters before `$unwind` to reduce the input set:

```javascript
// GOOD: filter first
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $unwind: "$items" },
  { $group: { _id: "$items.sku", count: { $sum: 1 } } }
])
```

## Summary

`$unwind` transforms array fields into individual documents, enabling per-element sorting, filtering, and aggregation that would otherwise be impossible. Combined with `$group` for reassembly, `$lookup` for joins, and `$sortByCount` for frequency analysis, it is one of the most powerful stages in MongoDB's aggregation toolkit.
