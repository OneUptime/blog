# How to Define Window Boundaries (range, documents) in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Window Function, Window Boundary, Analytics

Description: Learn how to define window boundaries using documents and range options in MongoDB $setWindowFields to control which documents are included in window function calculations.

---

MongoDB's `$setWindowFields` stage supports explicit window boundaries that control which documents within a partition are included in each calculation. Understanding `documents` and `range` boundary types is key to computing accurate running totals, moving averages, and other window aggregations.

## Window Boundary Types

There are two boundary types:

- `documents` - a fixed number of documents before/after the current document
- `range` - a range of values relative to the current document's sort field value

Both accept these special keywords:
- `"unbounded"` - extends to the first or last document in the partition
- `"current"` - refers to the current document's position/value

## documents Boundaries

Use `documents` when you want to include a fixed count of neighboring documents:

```javascript
db.sales.aggregate([
  {
    $setWindowFields: {
      sortBy: { date: 1 },
      output: {
        // Running total: all docs from start to current
        runningTotal: {
          $sum: "$amount",
          window: {
            documents: ["unbounded", "current"]
          }
        },
        // 3-day moving average (current + 2 before)
        movingAvg3Day: {
          $avg: "$amount",
          window: {
            documents: [-2, 0]
          }
        },
        // Future 2-day sum (current + 2 after)
        forward2Day: {
          $sum: "$amount",
          window: {
            documents: [0, 2]
          }
        }
      }
    }
  }
])
```

The `documents` window counts by position regardless of the actual sort values.

## range Boundaries

Use `range` when you want boundaries based on the sort field's actual values:

```javascript
db.dailySales.aggregate([
  {
    $setWindowFields: {
      sortBy: { saleDate: 1 },
      output: {
        // Sum of sales within 3 days before and after
        weeklyContext: {
          $sum: "$amount",
          window: {
            range: [-3, 3],
            unit: "day"   // use with date sort fields
          }
        }
      }
    }
  }
])
```

With numeric sort fields, `range` compares the actual numeric values:

```javascript
db.prices.aggregate([
  {
    $setWindowFields: {
      sortBy: { price: 1 },
      output: {
        // Include all docs within 10 units of current price
        nearbyAvg: {
          $avg: "$price",
          window: {
            range: [-10, 10]
          }
        }
      }
    }
  }
])
```

## Date-Based range Windows

When sorting by a date field, use the `unit` option:

```javascript
db.events.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$userId",
      sortBy: { timestamp: 1 },
      output: {
        eventsInPast7Days: {
          $sum: 1,
          window: {
            range: [-7, 0],
            unit: "day"
          }
        },
        eventsInPast30Days: {
          $count: {},
          window: {
            range: [-30, 0],
            unit: "day"
          }
        }
      }
    }
  }
])
```

Supported units: `"millisecond"`, `"second"`, `"minute"`, `"hour"`, `"day"`, `"week"`, `"month"`, `"quarter"`, `"year"`

## Expanding vs Sliding Windows

Two common window patterns:

**Expanding window** (growing from first doc to current):

```javascript
runningSum: {
  $sum: "$value",
  window: { documents: ["unbounded", "current"] }
}
```

**Sliding window** (fixed size moving forward):

```javascript
rollingAvg5: {
  $avg: "$value",
  window: { documents: [-4, 0] }
}
```

## Full Window (all documents in partition)

Omit the `window` key entirely to include all documents in the partition:

```javascript
partitionTotal: {
  $sum: "$revenue"
  // no window key - uses all documents in partition
}
```

## Summary

MongoDB window boundaries let you precisely control which documents participate in each window calculation. Use `documents` boundaries for fixed-position windows (e.g., rolling N-period averages) and `range` boundaries for value-based windows (e.g., all records within a date range). The `"unbounded"` keyword creates expanding windows for running totals, while numeric offsets create sliding windows for moving averages and rolling aggregations.
