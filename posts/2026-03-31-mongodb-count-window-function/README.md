# How to Use $count as a Window Function in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Window Function, Aggregation, Analytics, Count

Description: Learn how to use $count as a window function in MongoDB's $setWindowFields to compute running counts and rolling event frequencies over partitions.

---

The `$count` window function in MongoDB's `$setWindowFields` stage counts the number of documents in a specified window. Unlike `$group` with `$count`, this preserves individual document rows while adding cumulative or rolling counts - useful for tracking running event counts, frequency analysis, and trend detection.

## Basic Running Count

Count the total number of orders placed per customer up to and including each order:

```javascript
db.orders.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$customerId",
      sortBy: { orderDate: 1 },
      output: {
        orderNumber: {
          $count: {},
          window: {
            documents: ["unbounded", "current"]
          }
        }
      }
    }
  },
  {
    $project: {
      customerId: 1,
      orderDate: 1,
      amount: 1,
      orderNumber: 1   // 1 for first order, 2 for second, etc.
    }
  }
]);
```

This is equivalent to a running count - `orderNumber` equals 1 for the customer's first order and increments for each subsequent one.

## Rolling Event Frequency

Count events in a sliding 7-day window to measure activity frequency:

```javascript
db.user_events.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$userId",
      sortBy: { eventTimestamp: 1 },
      output: {
        events7Day: {
          $count: {},
          window: {
            range: [-6, 0],
            unit: "day"
          }
        }
      }
    }
  },
  {
    $project: {
      userId: 1,
      eventTimestamp: 1,
      eventType: 1,
      events7Day: 1
    }
  }
]);
```

This shows how many events each user triggered in the 7-day period ending at each event.

## Total Partition Count for Percentage Calculation

Get the total count for each partition to calculate per-document percentages:

```javascript
db.support_tickets.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$category",
      sortBy: { createdAt: 1 },
      output: {
        totalCategoryTickets: {
          $count: {},
          window: {
            documents: ["unbounded", "unbounded"]
          }
        }
      }
    }
  },
  {
    $group: {
      _id: "$category",
      totalTickets: { $first: "$totalCategoryTickets" }
    }
  },
  { $sort: { totalTickets: -1 } }
]);
```

## Detecting Unusual Activity Spikes

Flag time periods where event count significantly exceeds the previous window:

```javascript
db.api_calls.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$endpoint",
      sortBy: { hour: 1 },
      output: {
        avgPrevious7Hours: {
          $avg: "$callCount",
          window: { documents: [-7, -1] }
        }
      }
    }
  },
  {
    $addFields: {
      isSpike: {
        $gt: ["$callCount", { $multiply: ["$avgPrevious7Hours", 3] }]
      }
    }
  },
  { $match: { isSpike: true } }
]);
```

## Count with Preceding Documents Window

Count the number of transactions made in the 30 days before each transaction to assess customer activity:

```javascript
db.transactions.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$customerId",
      sortBy: { transactionDate: 1 },
      output: {
        transactions30DayPrior: {
          $count: {},
          window: {
            range: [-30, -1],
            unit: "day"
          }
        }
      }
    }
  },
  { $match: { transactionType: "purchase" } },
  {
    $addFields: {
      isHighActivity: { $gte: ["$transactions30DayPrior", 3] }
    }
  }
]);
```

## Summary

The `$count` window function in MongoDB enables running counts, rolling event frequency analysis, and partition-wide counts for percentage calculations. Use `["unbounded", "current"]` for cumulative running counts, range windows for rolling frequency, and `["unbounded", "unbounded"]` for full-partition totals. Combined with other window functions like `$avg`, `$count` windows are powerful tools for behavioral analytics and anomaly detection pipelines.
