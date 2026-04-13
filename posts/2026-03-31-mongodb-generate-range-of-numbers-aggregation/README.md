# How to Generate a Range of Numbers in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Array

Description: Learn how to generate sequences of numbers in MongoDB aggregation using $range and how to use them for bucketing, lookups, and data generation.

---

Generating a sequence of integers within an aggregation pipeline is useful for creating buckets, filling gaps in time series data, or producing test datasets. MongoDB's `$range` operator does this without requiring stored data.

## The $range Operator

`$range` generates an array of integers from a start value (inclusive) to an end value (exclusive), with an optional step:

```javascript
{ $range: [start, end, step] }
// step is optional, defaults to 1
```

Basic examples:

```javascript
db.test.aggregate([
  {
    $project: {
      tenNumbers: { $range: [0, 10] },          // [0,1,2,3,4,5,6,7,8,9]
      evenNumbers: { $range: [0, 10, 2] },       // [0,2,4,6,8]
      countdown: { $range: [10, 0, -1] }         // [10,9,8,7,6,5,4,3,2,1]
    }
  }
]);
```

## Generating Page Numbers for Pagination

Calculate how many pages a result set needs and generate page numbers:

```javascript
db.catalogs.aggregate([
  {
    $addFields: {
      pageCount: {
        $toInt: { $ceil: { $divide: ["$itemCount", 20] } }
      }
    }
  },
  {
    $project: {
      pages: { $range: [1, { $add: ["$pageCount", 1] }] }
    }
  }
]);
```

## Filling Time Gaps with $range

A classic use case is generating all hourly or daily buckets between two dates when some buckets may have no data. First generate the range of offsets, then compute dates:

```javascript
db.reports.aggregate([
  {
    $project: {
      hourBuckets: {
        $map: {
          input: { $range: [0, 24] },
          as: "h",
          in: {
            $dateAdd: {
              startDate: ISODate("2026-03-31T00:00:00Z"),
              unit: "hour",
              amount: "$$h"
            }
          }
        }
      }
    }
  }
]);
```

## Creating a Number Sequence Document Source

To feed a fixed sequence into a pipeline as if it were a collection, use `$documents` (MongoDB 6.0+) with `$range`:

```javascript
db.aggregate([
  {
    $documents: [{ n: { $literal: null } }]
  },
  {
    $project: {
      sequence: { $range: [1, 101] }
    }
  },
  { $unwind: "$sequence" },
  {
    $project: { _id: 0, value: "$sequence" }
  }
]);
```

This produces 100 documents with values 1 through 100.

## Computing Running Totals with $range

Combine `$range` with `$slice` and `$sum` to compute a running total over an array:

```javascript
db.sales.aggregate([
  {
    $project: {
      runningTotals: {
        $map: {
          input: { $range: [1, { $add: [{ $size: "$dailySales" }, 1] }] },
          as: "i",
          in: {
            $sum: { $slice: ["$dailySales", 0, "$$i"] }
          }
        }
      }
    }
  }
]);
```

For each position `i`, this sums the first `i` elements, producing an array of cumulative totals.

## Bucketing Data Manually

Generate score buckets [0-10, 10-20, ...] without using `$bucket`:

```javascript
db.scores.aggregate([
  {
    $addFields: {
      bucket: {
        $multiply: [
          { $floor: { $divide: ["$score", 10] } },
          10
        ]
      }
    }
  },
  {
    $group: {
      _id: "$bucket",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { _id: 1 }
  }
]);
```

## Summary

`$range` generates integer arrays within an aggregation pipeline without requiring source data. Use it to produce time bucket sequences, page number arrays, position indices for running totals, or as a data source via `$documents` + `$unwind`. Combine with `$map` and `$dateAdd` to convert integer sequences into date sequences for time-series gap filling.
