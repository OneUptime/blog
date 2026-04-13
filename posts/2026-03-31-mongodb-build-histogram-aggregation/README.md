# How to Build a Histogram in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Analytics, Histogram, Bucket

Description: Learn how to build a histogram in MongoDB using the $bucket and $bucketAuto aggregation stages to distribute numeric values into ranges.

---

## Introduction

A histogram groups numeric values into ranges (buckets) and counts how many documents fall into each range. MongoDB provides two dedicated aggregation stages for this: `$bucket` for fixed boundaries and `$bucketAuto` for automatic evenly distributed buckets.

## Sample Data

Assume a `products` collection:

```json
{
  "_id": ObjectId("..."),
  "name": "Wireless Headphones",
  "price": 89.99,
  "category": "Electronics"
}
```

## Fixed Buckets with $bucket

Use `$bucket` when you want predefined price ranges:

```javascript
db.products.aggregate([
  {
    $bucket: {
      groupBy: "$price",
      boundaries: [0, 25, 50, 100, 200, 500, 10000],
      default: "Other",
      output: {
        count: { $sum: 1 },
        avgPrice: { $avg: "$price" },
        products: { $push: "$name" }
      }
    }
  }
])
```

The `boundaries` array defines the lower bounds of each bucket. A document with `price: 89.99` falls into the `[50, 100)` bucket. The `default` bucket catches any value outside all boundaries (including nulls).

## Automatic Buckets with $bucketAuto

When you do not know the data distribution in advance, use `$bucketAuto` to let MongoDB choose boundaries:

```javascript
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 5,
      output: {
        count: { $sum: 1 },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" }
      }
    }
  }
])
```

`$bucketAuto` attempts to distribute documents evenly across the requested number of buckets. The output includes a `_id.min` and `_id.max` for each bucket.

## Histogram with Granularity

For aesthetically clean bucket boundaries (e.g., powers of 2, multiples of 10), specify a `granularity` option:

```javascript
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 8,
      granularity: "R5",
      output: {
        count: { $sum: 1 }
      }
    }
  }
])
```

Supported granularities include `R5`, `R10`, `R20`, `1-2-5`, `E6`, `E12`, `E24`, `POWERSOF2`.

## Filtering Before Bucketing

Apply `$match` before `$bucket` to scope the histogram to a subset:

```javascript
db.products.aggregate([
  {
    $match: {
      category: "Electronics",
      price: { $gt: 0 }
    }
  },
  {
    $bucket: {
      groupBy: "$price",
      boundaries: [0, 50, 100, 200, 500, 1000],
      default: "1000+",
      output: {
        count: { $sum: 1 }
      }
    }
  }
])
```

## Rendering the Histogram

The output array can be sent directly to a charting library. For example, using JavaScript:

```javascript
const result = await db.collection("products").aggregate([...]).toArray();
const labels = result.map(b => `$${b._id}`);
const values = result.map(b => b.count);
// Pass labels and values to Chart.js or similar
```

## Summary

MongoDB provides `$bucket` for histogram creation with explicit boundaries and `$bucketAuto` for automatic equal-distribution bucketing. Use `$match` before the bucket stage to filter the input set. The `granularity` option in `$bucketAuto` produces human-readable boundary values. The resulting array is ready to feed into any charting library for visualization.
