# How to Calculate Median Value in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Median, Analytics, Pipeline

Description: Learn how to calculate the median value of a numeric field in MongoDB using the aggregation pipeline with sorting and positional slicing techniques.

---

## Why Median Is Harder Than Average

MongoDB provides `$avg` for averages, but median requires identifying the middle value after sorting. There is no built-in `$median` operator (before MongoDB 7.0), so you need to use aggregation stages.

## Basic Median Calculation

The approach is to count documents, sort by the target field, skip to the middle, and take one or two values:

```javascript
db.orders.aggregate([
  { $sort: { amount: 1 } },
  {
    $group: {
      _id: null,
      values: { $push: "$amount" },
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      median: {
        $let: {
          vars: { mid: { $floor: { $divide: ["$count", 2] } } },
          in: {
            $cond: {
              if: { $eq: [{ $mod: ["$count", 2] }, 0] },
              then: {
                $avg: [
                  { $arrayElemAt: ["$values", "$$mid"] },
                  { $arrayElemAt: ["$values", { $subtract: ["$$mid", 1] }] }
                ]
              },
              else: { $arrayElemAt: ["$values", "$$mid"] }
            }
          }
        }
      }
    }
  }
])
```

## Using $percentile in MongoDB 7.0+

MongoDB 7.0 introduced `$percentile` and `$median` accumulators:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: null,
      medianAmount: { $median: { input: "$amount", method: "approximate" } }
    }
  }
])
```

You can also use `$percentile` with `p: [0.5]` to get the median along with other percentiles. Note that `$percentile` returns an array:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: null,
      p50: { $percentile: { input: "$amount", p: [0.5], method: "approximate" } }
    }
  }
])
```

## Median by Group

Calculate median per category using `$group` with `$push`:

```javascript
db.orders.aggregate([
  { $sort: { category: 1, amount: 1 } },
  {
    $group: {
      _id: "$category",
      values: { $push: "$amount" },
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      category: "$_id",
      median: {
        $let: {
          vars: { mid: { $floor: { $divide: ["$count", 2] } } },
          in: {
            $cond: {
              if: { $eq: [{ $mod: ["$count", 2] }, 0] },
              then: {
                $avg: [
                  { $arrayElemAt: ["$values", "$$mid"] },
                  { $arrayElemAt: ["$values", { $subtract: ["$$mid", 1] }] }
                ]
              },
              else: { $arrayElemAt: ["$values", "$$mid"] }
            }
          }
        }
      }
    }
  }
])
```

## Performance Considerations

For large datasets, use `$sample` or pre-sort with an index on the field being measured:

```javascript
db.orders.createIndex({ amount: 1 })
```

The sort stage will use the index, significantly reducing memory usage.

## Summary

Calculating the median in MongoDB uses the aggregation pipeline to sort values, collect them into an array, and extract the middle element. MongoDB 7.0 introduced the native `$median` accumulator for simpler syntax. For grouped medians, apply the same pattern inside each `$group` bucket.
