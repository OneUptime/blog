# How to Use $documentNumber for Sequential Numbering in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Window Function, Aggregation, Ranking, Sequential Number

Description: Learn how to use $documentNumber in MongoDB's $setWindowFields to assign sequential row numbers within partitions for pagination and ranking.

---

The `$documentNumber` window function assigns a sequential integer (1, 2, 3, ...) to each document within a partition, ordered by the specified sort criteria. Unlike `$rank` and `$denseRank`, `$documentNumber` never produces ties - every document gets a unique sequential number regardless of duplicate sort values.

## Basic Sequential Numbering

Number all orders per customer in chronological order:

```javascript
db.orders.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$customerId",
      sortBy: { orderDate: 1 },
      output: {
        orderSequence: {
          $documentNumber: {}
        }
      }
    }
  },
  {
    $project: {
      customerId: 1,
      orderDate: 1,
      amount: 1,
      orderSequence: 1
    }
  }
]);
```

The first order for each customer gets `orderSequence: 1`, the second gets `2`, and so on, regardless of the actual `orderDate` values.

## How $documentNumber Differs from $rank

When documents have equal sort values, `$rank` assigns the same rank to tied documents (and skips numbers), but `$documentNumber` assigns unique sequential numbers:

```javascript
// Given: scores [90, 85, 85, 80]
// $rank produces:         [1, 2, 2, 4]  (tied 85s get rank 2, rank 3 is skipped)
// $denseRank produces:    [1, 2, 2, 3]  (no gaps, but 85s are still tied)
// $documentNumber produces: [1, 2, 3, 4]  (unique number for every document)
```

Use `$documentNumber` when you need a unique row identifier rather than a rank that reflects value ties.

## Offset Pagination with $documentNumber

`$documentNumber` is useful for generating row numbers for offset-style pagination:

```javascript
// First page
db.products.aggregate([
  {
    $setWindowFields: {
      sortBy: { popularity: -1, _id: 1 },
      output: {
        rowNum: { $documentNumber: {} }
      }
    }
  },
  { $match: { rowNum: { $lte: 20 } } }
]);

// Next page
db.products.aggregate([
  {
    $setWindowFields: {
      sortBy: { popularity: -1, _id: 1 },
      output: {
        rowNum: { $documentNumber: {} }
      }
    }
  },
  { $match: { rowNum: { $gt: 20, $lte: 40 } } }
]);
```

## Top-N per Partition

Use `$documentNumber` to get the top N documents per group - more straightforward than complex `$group` logic:

```javascript
// Get top 3 most expensive orders per customer
db.orders.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$customerId",
      sortBy: { amount: -1 },
      output: {
        rank: { $documentNumber: {} }
      }
    }
  },
  { $match: { rank: { $lte: 3 } } },
  {
    $project: {
      customerId: 1,
      amount: 1,
      rank: 1
    }
  }
]);
```

This retrieves each customer's three highest-value orders. Using `$documentNumber` instead of `$rank` ensures exactly 3 documents per customer even when amounts are tied.

## Numbering Within Time Windows

Assign document numbers within each calendar month partition:

```javascript
db.events.aggregate([
  {
    $addFields: {
      monthKey: {
        $dateToString: { format: "%Y-%m", date: "$timestamp" }
      }
    }
  },
  {
    $setWindowFields: {
      partitionBy: "$monthKey",
      sortBy: { timestamp: 1 },
      output: {
        eventNumThisMonth: { $documentNumber: {} }
      }
    }
  }
]);
```

## Summary

`$documentNumber` assigns unique sequential integers to documents within a partition, guaranteed to have no ties or gaps. Use it for row numbering, pagination, and top-N-per-partition queries when you need exactly N results regardless of sort value ties. It is the right choice when you want row positions rather than value-based rankings.
