# How to Calculate Moving Averages with $setWindowFields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $setWindowFields, Moving Average, Aggregation, Window Function

Description: Learn how to calculate simple and weighted moving averages in MongoDB using $setWindowFields with $avg and custom window boundaries.

---

## Introduction

Moving averages smooth out short-term fluctuations in time-series data to reveal underlying trends. MongoDB 5.0's `$setWindowFields` stage supports moving average calculations natively through the `$avg` operator with configurable document or range-based windows. This eliminates the need for complex `$lookup` or `$group` workarounds previously required for this type of calculation.

## Simple Moving Average (N Documents)

A 3-document moving average - average of the current and 2 preceding documents:

```javascript
db.stockPrices.aggregate([
  {
    $setWindowFields: {
      sortBy: { date: 1 },
      output: {
        movingAvg3Day: {
          $avg: "$closePrice",
          window: {
            documents: [-2, "current"]
          }
        }
      }
    }
  }
]);
```

`documents: [-2, "current"]` means: 2 documents before the current one through the current document (3 total).

## Sample Data and Output

Input:

```javascript
[
  { date: "2026-01-01", closePrice: 100 },
  { date: "2026-01-02", closePrice: 110 },
  { date: "2026-01-03", closePrice: 105 },
  { date: "2026-01-04", closePrice: 120 },
  { date: "2026-01-05", closePrice: 115 }
]
```

Output (3-day moving average):

```javascript
[
  { date: "2026-01-01", closePrice: 100, movingAvg3Day: 100 },
  { date: "2026-01-02", closePrice: 110, movingAvg3Day: 105 },
  { date: "2026-01-03", closePrice: 105, movingAvg3Day: 105 },
  { date: "2026-01-04", closePrice: 120, movingAvg3Day: 111.67 },
  { date: "2026-01-05", closePrice: 115, movingAvg3Day: 113.33 }
]
```

## 7-Day Moving Average

```javascript
db.dailyMetrics.aggregate([
  {
    $setWindowFields: {
      sortBy: { date: 1 },
      output: {
        ma7: {
          $avg: "$value",
          window: { documents: [-6, "current"] }
        }
      }
    }
  }
]);
```

## Partitioned Moving Averages

Calculate separate moving averages per group:

```javascript
db.stockPrices.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$ticker",
      sortBy: { date: 1 },
      output: {
        ma5: {
          $avg: "$closePrice",
          window: { documents: [-4, "current"] }
        },
        ma20: {
          $avg: "$closePrice",
          window: { documents: [-19, "current"] }
        }
      }
    }
  }
]);
```

## Time-Range Based Moving Average

Use a range window with a date unit for calendar-based windows:

```javascript
db.dailyRevenue.aggregate([
  {
    $setWindowFields: {
      sortBy: { date: 1 },
      output: {
        trailing30DayAvg: {
          $avg: "$revenue",
          window: {
            range: [-29, "current"],
            unit: "day"
          }
        }
      }
    }
  }
]);
```

This handles gaps in dates correctly - it looks back 30 calendar days regardless of how many documents exist in that period.

## Centered Moving Average

Average symmetric window around the current document:

```javascript
db.sensorReadings.aggregate([
  {
    $setWindowFields: {
      sortBy: { timestamp: 1 },
      output: {
        centeredAvg5: {
          $avg: "$value",
          window: { documents: [-2, 2] }
        }
      }
    }
  }
]);
```

Note: centered windows include future documents. For the last few documents in a partition, the window will contain fewer documents than specified, so the average is computed over a partial window.

## Combining Multiple Moving Averages

Generate multiple averages for trend analysis in a single stage:

```javascript
db.prices.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$symbol",
      sortBy: { date: 1 },
      output: {
        ma5: {
          $avg: "$price",
          window: { documents: [-4, "current"] }
        },
        ma10: {
          $avg: "$price",
          window: { documents: [-9, "current"] }
        },
        ma50: {
          $avg: "$price",
          window: { documents: [-49, "current"] }
        }
      }
    }
  },
  {
    $project: {
      symbol: 1,
      date: 1,
      price: 1,
      ma5: 1,
      ma10: 1,
      ma50: 1,
      crossover: {
        $cond: [{ $gt: ["$ma5", "$ma50"] }, "bullish", "bearish"]
      }
    }
  }
]);
```

## Moving Average for Anomaly Detection

Flag readings that deviate significantly from their moving average:

```javascript
db.sensorReadings.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$sensorId",
      sortBy: { timestamp: 1 },
      output: {
        movingAvg: {
          $avg: "$value",
          window: { documents: [-9, "current"] }
        }
      }
    }
  },
  {
    $project: {
      sensorId: 1,
      timestamp: 1,
      value: 1,
      movingAvg: 1,
      isAnomaly: {
        $gt: [
          { $abs: { $subtract: ["$value", "$movingAvg"] } },
          { $multiply: ["$movingAvg", 0.2] } // > 20% deviation
        ]
      }
    }
  },
  { $match: { isAnomaly: true } }
]);
```

## Summary

`$setWindowFields` with `$avg` and a trailing document window provides a clean and performant way to compute moving averages in MongoDB without complex self-joins. Use document windows for count-based averages, range windows with units for calendar-based lookbacks, and `partitionBy` for per-series calculations. Multiple moving averages can be computed in a single stage, making it efficient to generate multi-period trend data in one pass.
