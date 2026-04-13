# How to Find the Maximum and Minimum Values in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $max, $min, Aggregation, Max Min Values

Description: Learn how to find the maximum and minimum values of a field in MongoDB using $max and $min accumulators in aggregation pipelines and $group stages.

---

## Overview

MongoDB provides `$max` and `$min` accumulators for finding the highest and lowest values of a field. They work in `$group` for cross-document comparisons and in `$project`/`$addFields` for within-document comparisons.

## Maximum and Minimum Across All Documents

```javascript
// Find the highest and lowest order amounts
db.orders.aggregate([
  {
    $group: {
      _id: null,
      maxAmount: { $max: "$amount" },
      minAmount: { $min: "$amount" }
    }
  }
]);

// Result: { "_id": null, "maxAmount": 9999.99, "minAmount": 0.99 }
```

## Max and Min Per Group

```javascript
// Highest and lowest order amount per customer
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      maxOrder: { $max: "$amount" },
      minOrder: { $min: "$amount" },
      orderCount: { $sum: 1 }
    }
  },
  { $sort: { maxOrder: -1 } }
]);
```

## Max and Min with a Filter

```javascript
// Max and min price for products in each category (in stock only)
db.products.aggregate([
  { $match: { inStock: true } },
  {
    $group: {
      _id: "$category",
      highestPrice: { $max: "$price" },
      lowestPrice:  { $min: "$price" }
    }
  }
]);
```

## Max Date (Most Recent) and Min Date (Oldest)

`$max` and `$min` also work with dates:

```javascript
// Most recent and oldest order per customer
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      lastOrderDate:  { $max: "$createdAt" },
      firstOrderDate: { $min: "$createdAt" }
    }
  }
]);
```

## $max and $min in $project (Within a Document)

When used in `$project`, `$max` and `$min` operate on an array within a single document:

```javascript
// Document: { "name": "Alice", "scores": [85, 92, 78, 96] }
db.students.aggregate([
  {
    $project: {
      name: 1,
      highestScore: { $max: "$scores" },
      lowestScore:  { $min: "$scores" }
    }
  }
]);
// Result: { "name": "Alice", "highestScore": 96, "lowestScore": 78 }
```

## Comparing Multiple Fields Within a Document

```javascript
// Find the maximum of two fields (e.g., wholesale vs retail price)
db.products.aggregate([
  {
    $project: {
      name: 1,
      effectivePrice: { $max: ["$wholesalePrice", "$retailPrice"] }
    }
  }
]);
```

## Find the Document with the Max/Min Value

To return the actual document with the maximum or minimum value, sort and limit:

```javascript
// Document with the highest order amount
db.orders.find().sort({ amount: -1 }).limit(1);

// Or using aggregation with $sort and $limit
db.orders.aggregate([
  { $sort: { amount: -1 } },
  { $limit: 1 }
]);
```

## Using $topN and $bottomN (MongoDB 5.2+)

```javascript
// Top 3 most expensive products per category
db.products.aggregate([
  {
    $group: {
      _id: "$category",
      topProducts: {
        $topN: {
          n: 3,
          sortBy: { price: -1 },
          output: { name: "$name", price: "$price" }
        }
      }
    }
  }
]);
```

## Min/Max with Conditional Expression

```javascript
// Max of (amount, 0) to ignore negative values
db.transactions.aggregate([
  {
    $group: {
      _id: "$accountId",
      maxPositive: {
        $max: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] }
      }
    }
  }
]);
```

## Node.js Example

```javascript
async function getPriceRange(db, category) {
  const [result] = await db.collection("products").aggregate([
    { $match: { category, inStock: true } },
    {
      $group: {
        _id: null,
        maxPrice: { $max: "$price" },
        minPrice: { $min: "$price" },
        avgPrice: { $avg: "$price" }
      }
    },
    { $project: { _id: 0 } }
  ]).toArray();

  return result || { maxPrice: 0, minPrice: 0, avgPrice: 0 };
}
```

## Summary

`$max` and `$min` in MongoDB's aggregation pipeline find the largest and smallest values of a field across grouped documents. Use `_id: null` for collection-wide extremes. In `$project`, they operate on an array within a document. For finding the actual document with the max or min value, combine `.sort()` with `.limit(1)`. For top/bottom N values per group, use `$topN`/`$bottomN` accumulators available in MongoDB 5.2+.
