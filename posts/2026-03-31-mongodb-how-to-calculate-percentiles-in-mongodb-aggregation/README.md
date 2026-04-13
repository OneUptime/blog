# How to Calculate Percentiles in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Percentile, $percentile, Aggregation, Statistics

Description: Learn how to calculate percentiles in MongoDB using the $percentile accumulator (MongoDB 7.0+) and alternative approaches using $sort and $bucket for older versions.

---

## Overview

Percentile calculations answer questions like "what is the 95th percentile response time?" or "what is the median order value?". MongoDB 7.0 introduced the `$percentile` and `$median` accumulators. For older versions, this guide also covers bucket-based alternatives.

## $percentile Accumulator (MongoDB 7.0+)

```javascript
// Calculate the 50th, 90th, and 99th percentile of order amounts
db.orders.aggregate([
  {
    $group: {
      _id: null,
      p50: { $percentile: { input: "$amount", p: [0.5], method: "approximate" } },
      p90: { $percentile: { input: "$amount", p: [0.9], method: "approximate" } },
      p99: { $percentile: { input: "$amount", p: [0.99], method: "approximate" } }
    }
  }
]);

// Or compute multiple percentiles in one call
db.orders.aggregate([
  {
    $group: {
      _id: null,
      percentiles: {
        $percentile: {
          input: "$amount",
          p: [0.25, 0.5, 0.75, 0.90, 0.95, 0.99],
          method: "approximate"
        }
      }
    }
  }
]);
// Result: { "percentiles": [12.5, 45.0, 120.0, 280.0, 450.0, 990.0] }
```

## $median Accumulator (MongoDB 7.0+)

`$median` is a convenient shorthand for the 50th percentile:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$category",
      medianAmount: { $median: { input: "$amount", method: "approximate" } }
    }
  }
]);
```

## Percentile Per Group

```javascript
// P95 response time per API endpoint
db.apiLogs.aggregate([
  { $match: { timestamp: { $gte: new Date("2026-03-31") } } },
  {
    $group: {
      _id: "$endpoint",
      p50: { $percentile: { input: "$responseTimeMs", p: [0.5], method: "approximate" } },
      p95: { $percentile: { input: "$responseTimeMs", p: [0.95], method: "approximate" } },
      p99: { $percentile: { input: "$responseTimeMs", p: [0.99], method: "approximate" } },
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      endpoint: "$_id",
      p50ms: { $arrayElemAt: ["$p50", 0] },
      p95ms: { $arrayElemAt: ["$p95", 0] },
      p99ms: { $arrayElemAt: ["$p99", 0] },
      count: 1,
      _id: 0
    }
  },
  { $sort: { p95ms: -1 } }
]);
```

## Calculation Method

```javascript
// Approximate (uses t-digest algorithm)
{ $percentile: { input: "$value", p: [0.95], method: "approximate" } }
```

The `method` parameter is required and must be `"approximate"`. This uses the t-digest algorithm for fast, memory-efficient percentile estimation that is accurate enough for monitoring and analytics.

## Alternative for MongoDB Versions Before 7.0

### Using $sort, $skip, $limit (Exact Percentile)

For small datasets:

```javascript
async function percentile(collection, field, p) {
  const total = await collection.countDocuments();
  const rank = Math.floor(total * p);

  const [doc] = await collection
    .find({}, { projection: { [field]: 1, _id: 0 } })
    .sort({ [field]: 1 })
    .skip(rank)
    .limit(1)
    .toArray();

  return doc ? doc[field] : null;
}

const p95 = await percentile(db.collection("orders"), "amount", 0.95);
```

### Using $bucket for Percentile Approximation

```javascript
db.orders.aggregate([
  {
    $bucket: {
      groupBy: "$amount",
      boundaries: [0, 10, 50, 100, 250, 500, 1000, 5000, 10000],
      default: "Other",
      output: {
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" }
      }
    }
  }
]);
```

Examine the bucket counts to estimate which bucket contains the Nth percentile.

## Node.js Example Using $percentile

```javascript
async function getLatencyPercentiles(db, endpoint, hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const [result] = await db.collection("apiLogs").aggregate([
    { $match: { endpoint, timestamp: { $gte: since } } },
    {
      $group: {
        _id: null,
        percentiles: {
          $percentile: {
            input: "$responseTimeMs",
            p: [0.5, 0.95, 0.99],
            method: "approximate"
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        p50: { $arrayElemAt: ["$percentiles", 0] },
        p95: { $arrayElemAt: ["$percentiles", 1] },
        p99: { $arrayElemAt: ["$percentiles", 2] },
        count: 1
      }
    }
  ]).toArray();

  return result;
}
```

## Summary

MongoDB 7.0 introduced `$percentile` and `$median` accumulators that make percentile calculations straightforward in aggregation pipelines. The `method: "approximate"` option uses a t-digest algorithm for fast, memory-efficient approximations suitable for most use cases. For older MongoDB versions, implement percentiles by sorting and skipping to the rank position, or use `$bucket` for distribution analysis. Use `$arrayElemAt` to extract individual percentile values from the results array returned by `$percentile`.
