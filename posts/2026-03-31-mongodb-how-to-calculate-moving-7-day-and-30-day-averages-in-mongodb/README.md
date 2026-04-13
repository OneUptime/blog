# How to Calculate Moving 7-Day and 30-Day Averages in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Moving Average, Window Function, Analytics

Description: Learn how to compute rolling 7-day and 30-day moving averages in MongoDB using $setWindowFields and document-based window calculations.

---

## What Are Moving Averages?

A moving average smooths out short-term fluctuations by computing the average of a sliding window of values. In analytics, 7-day and 30-day moving averages are commonly used for:
- Sales trend analysis
- Application performance metrics
- User engagement tracking
- Financial data smoothing

MongoDB's `$setWindowFields` stage (introduced in 5.0) provides native support for window functions.

## Sample Data Setup

```javascript
// Insert daily sales data
db.dailySales.insertMany([
  { date: ISODate("2024-01-01"), revenue: 1200, productId: "prod-A" },
  { date: ISODate("2024-01-02"), revenue: 1500, productId: "prod-A" },
  { date: ISODate("2024-01-03"), revenue: 900,  productId: "prod-A" },
  { date: ISODate("2024-01-04"), revenue: 1800, productId: "prod-A" },
  { date: ISODate("2024-01-05"), revenue: 1100, productId: "prod-A" },
  { date: ISODate("2024-01-06"), revenue: 1400, productId: "prod-A" },
  { date: ISODate("2024-01-07"), revenue: 1600, productId: "prod-A" }
  // ... more data
])
```

## 7-Day Moving Average with $setWindowFields

```javascript
db.dailySales.aggregate([
  { $match: { productId: "prod-A" } },
  { $sort: { date: 1 } },
  {
    $setWindowFields: {
      partitionBy: "$productId",
      sortBy: { date: 1 },
      output: {
        movingAvg7Day: {
          $avg: "$revenue",
          window: {
            documents: [-6, 0]  // current + 6 preceding = 7 days
          }
        }
      }
    }
  },
  {
    $project: {
      date: 1,
      revenue: 1,
      movingAvg7Day: { $round: ["$movingAvg7Day", 2] }
    }
  }
])
```

The `documents: [-6, 0]` window means "6 documents before current through current document", giving a 7-document (7-day) window.

## 30-Day Moving Average

```javascript
db.dailySales.aggregate([
  { $sort: { date: 1 } },
  {
    $setWindowFields: {
      partitionBy: "$productId",
      sortBy: { date: 1 },
      output: {
        movingAvg30Day: {
          $avg: "$revenue",
          window: {
            documents: [-29, 0]  // 30-day window
          }
        }
      }
    }
  }
])
```

## Both Averages in One Pipeline

Compute multiple moving averages simultaneously:

```javascript
db.dailySales.aggregate([
  { $sort: { date: 1 } },
  {
    $setWindowFields: {
      partitionBy: "$productId",
      sortBy: { date: 1 },
      output: {
        ma7: {
          $avg: "$revenue",
          window: { documents: [-6, 0] }
        },
        ma30: {
          $avg: "$revenue",
          window: { documents: [-29, 0] }
        },
        ma90: {
          $avg: "$revenue",
          window: { documents: [-89, 0] }
        }
      }
    }
  },
  {
    $project: {
      date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
      revenue: 1,
      ma7: { $round: ["$ma7", 2] },
      ma30: { $round: ["$ma30", 2] },
      ma90: { $round: ["$ma90", 2] }
    }
  }
])
```

## Time-Range-Based Window

Instead of counting documents, use a calendar-based range:

```javascript
db.dailySales.aggregate([
  { $sort: { date: 1 } },
  {
    $setWindowFields: {
      partitionBy: "$productId",
      sortBy: { date: 1 },
      output: {
        ma7CalendarDays: {
          $avg: "$revenue",
          window: {
            range: [-6, 0],
            unit: "day"  // uses actual calendar days, not document count
          }
        }
      }
    }
  }
])
```

This is useful when you have gaps in your data - it computes a true 7-calendar-day average rather than the last 7 data points.

## Partitioned Moving Averages

Compute moving averages independently for each product or category:

```javascript
db.dailySales.aggregate([
  { $sort: { date: 1 } },
  {
    $setWindowFields: {
      partitionBy: "$productId",  // separate moving average per product
      sortBy: { date: 1 },
      output: {
        ma7: {
          $avg: "$revenue",
          window: { documents: [-6, 0] }
        },
        windowCount: {
          $count: {},
          window: { documents: [-6, 0] }
        }
      }
    }
  },
  // Filter to show only dates where we have a full 7-day window
  {
    $match: {
      $expr: {
        $gte: ["$windowCount", 7]
      }
    }
  }
])
```

## Legacy Approach: $lookup (pre-5.0)

For MongoDB versions before 5.0:

```javascript
// Less efficient - requires self-join
db.dailySales.aggregate([
  {
    $lookup: {
      from: "dailySales",
      let: { currentDate: "$date", productId: "$productId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$productId", "$$productId"] },
                { $lte: ["$date", "$$currentDate"] },
                { $gte: ["$date", { $subtract: ["$$currentDate", 6 * 24 * 60 * 60 * 1000] }] }
              ]
            }
          }
        }
      ],
      as: "window"
    }
  },
  {
    $project: {
      date: 1,
      revenue: 1,
      ma7: { $avg: "$window.revenue" }
    }
  }
])
```

## Summary

MongoDB's `$setWindowFields` operator provides efficient, expressive moving average calculations using document-count windows (`documents: [-N, 0]`) or calendar-range windows (`range: [-N, 0], unit: "day"`). For partitioned data, specify `partitionBy` to compute independent moving averages per category or entity. Upgrade to MongoDB 5.0+ to take advantage of native window function support over the legacy self-join approach.
