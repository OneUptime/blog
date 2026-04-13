# How to Calculate Running Totals with $setWindowFields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $setWindowFields, Running Total, Aggregation, Window Function

Description: Learn how to calculate running totals in MongoDB using $setWindowFields with $sum window function, partitioning, and custom window boundaries.

---

## Introduction

MongoDB 5.0 introduced `$setWindowFields`, which brings window function support to the aggregation pipeline. Window functions operate over a sliding window of documents defined by sort order and boundaries - without collapsing rows like `$group` does. This makes `$setWindowFields` ideal for running totals, cumulative sums, and sequential calculations where you need both individual documents and accumulated values.

## Basic Running Total

Calculate a cumulative sum of sales over all documents sorted by date:

```javascript
db.sales.aggregate([
  {
    $setWindowFields: {
      sortBy: { date: 1 },
      output: {
        runningTotal: {
          $sum: "$amount",
          window: {
            documents: ["unbounded", "current"]
          }
        }
      }
    }
  }
]);
```

`documents: ["unbounded", "current"]` means: from the beginning of the partition to the current document - the standard running total window.

## Sample Input and Output

Input documents:

```javascript
[
  { date: "2026-01-01", amount: 100 },
  { date: "2026-01-02", amount: 250 },
  { date: "2026-01-03", amount: 175 },
  { date: "2026-01-04", amount: 300 }
]
```

Output after running total:

```javascript
[
  { date: "2026-01-01", amount: 100, runningTotal: 100 },
  { date: "2026-01-02", amount: 250, runningTotal: 350 },
  { date: "2026-01-03", amount: 175, runningTotal: 525 },
  { date: "2026-01-04", amount: 300, runningTotal: 825 }
]
```

## Partitioned Running Totals

Use `partitionBy` to calculate separate running totals per group (e.g., per salesperson):

```javascript
db.sales.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$salesPersonId",
      sortBy: { date: 1 },
      output: {
        cumulativeSales: {
          $sum: "$amount",
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
]);
```

Each partition maintains its own independent running total starting from its first document.

## Running Count of Documents

Count how many documents have occurred up to and including each document:

```javascript
db.orders.aggregate([
  {
    $setWindowFields: {
      sortBy: { createdAt: 1 },
      output: {
        orderSequence: {
          $sum: 1,
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
]);
```

## Running Total with Date Range Window

Use a range-based window to sum values within a trailing date period. When specifying a `unit`, the `sortBy` field must be a `Date` type:

```javascript
db.dailySales.aggregate([
  {
    $setWindowFields: {
      sortBy: { saleDate: 1 },
      output: {
        rollingWeekRevenue: {
          $sum: "$revenue",
          window: {
            range: [-6, "current"],
            unit: "day"
          }
        }
      }
    }
  }
]);
```

## Combining Running Total with $project

Filter or transform the output after `$setWindowFields`:

```javascript
db.sales.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$region",
      sortBy: { date: 1 },
      output: {
        cumulativeRevenue: {
          $sum: "$revenue",
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  },
  {
    $project: {
      region: 1,
      date: 1,
      revenue: 1,
      cumulativeRevenue: 1,
      percentOfRegionTotal: {
        $multiply: [
          { $divide: ["$revenue", "$cumulativeRevenue"] },
          100
        ]
      }
    }
  }
]);
```

## Running Total with Multiple Outputs

Calculate multiple window aggregations in a single `$setWindowFields` stage:

```javascript
db.transactions.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$accountId",
      sortBy: { timestamp: 1 },
      output: {
        runningBalance: {
          $sum: "$amount",
          window: { documents: ["unbounded", "current"] }
        },
        txnCount: {
          $sum: 1,
          window: { documents: ["unbounded", "current"] }
        },
        avgTxnSoFar: {
          $avg: "$amount",
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
]);
```

## Summary

`$setWindowFields` with `$sum` and a `["unbounded", "current"]` document window is the standard pattern for running totals in MongoDB. Use `partitionBy` to compute separate totals per group, `range` windows with a `unit` for date-based rolling sums, and combine multiple output fields in a single stage for efficiency. Since documents are not collapsed, all original fields remain available for downstream stages.
