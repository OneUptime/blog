# How to Partition Data for Window Functions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Window Function, Partition, Analytics

Description: Learn how to use the partitionBy option in MongoDB $setWindowFields to group documents into independent partitions for window function calculations.

---

Partitioning in MongoDB's `$setWindowFields` stage divides documents into independent groups before applying window calculations. Each partition is processed separately, allowing you to compute running totals, rankings, and moving averages that reset at partition boundaries rather than spanning the entire collection.

## How partitionBy Works

The `partitionBy` option in `$setWindowFields` specifies the field (or expression) by which documents are grouped. Window functions then operate within each group independently:

```javascript
db.sales.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$region",        // partition documents by region
      sortBy: { date: 1 },           // sort within each partition
      output: {
        runningTotal: {
          $sum: "$revenue",
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
])
```

Each region's running total restarts at 0 - documents from different regions do not influence each other.

## Single Field Partition

Partition by a single field:

```javascript
db.transactions.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$accountId",
      sortBy: { timestamp: 1 },
      output: {
        transactionCount: {
          $sum: 1,
          window: { documents: ["unbounded", "current"] }
        },
        balance: {
          $sum: "$amount",
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
])
```

Each account's running balance and transaction count are computed independently.

## Multi-Field Partition Using an Expression

Use an object expression to partition by multiple fields:

```javascript
db.sales.aggregate([
  {
    $setWindowFields: {
      partitionBy: {
        region: "$region",
        year: { $year: "$date" }
      },
      sortBy: { date: 1 },
      output: {
        regionalYearlyRunning: {
          $sum: "$revenue",
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
])
```

This creates partitions for each unique combination of region and year.

## Partition by Computed Value

Partition by an expression derived from a field:

```javascript
db.events.aggregate([
  {
    $setWindowFields: {
      partitionBy: { $month: "$timestamp" },
      sortBy: { timestamp: 1 },
      output: {
        monthlyRank: { $rank: {} },
        monthlyRowNum: { $documentNumber: {} }
      }
    }
  }
])
```

This ranks events within each calendar month independently.

## No Partition (Single Partition)

Omitting `partitionBy` treats all documents as a single partition:

```javascript
db.orders.aggregate([
  {
    $setWindowFields: {
      // No partitionBy - all documents in one partition
      sortBy: { createdAt: 1 },
      output: {
        globalRank: { $rank: {} },
        globalRunningTotal: {
          $sum: "$total",
          window: { documents: ["unbounded", "current"] }
        }
      }
    }
  }
])
```

## Partition for Top-N Per Group

A powerful pattern: partition, rank, then filter to top N:

```javascript
db.products.aggregate([
  // Add category-level rank by sales
  {
    $setWindowFields: {
      partitionBy: "$category",
      sortBy: { unitsSold: -1 },
      output: {
        categoryRank: { $rank: {} }
      }
    }
  },
  // Keep only top 5 per category
  {
    $match: { categoryRank: { $lte: 5 } }
  },
  {
    $sort: { category: 1, categoryRank: 1 }
  }
])
```

## Aggregating the Entire Partition

To compute a value across the entire partition when `sortBy` is specified, set the window to span all documents explicitly:

```javascript
db.employees.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$department",
      sortBy: { salary: -1 },
      output: {
        deptAvgSalary: {
          $avg: "$salary",
          window: { documents: ["unbounded", "unbounded"] }
        },
        salaryRank: { $rank: {} }
      }
    }
  },
  {
    $addFields: {
      salaryVsAvg: { $subtract: ["$salary", "$deptAvgSalary"] }
    }
  }
])
```

## Summary

The `partitionBy` option in `$setWindowFields` is the key to computing group-level window calculations in MongoDB. By specifying a field or expression, you create independent partitions where window operators run separately. This enables per-group running totals, within-group rankings, and department-level moving averages - all in a single aggregation stage without multiple `$group` and `$lookup` stages.
