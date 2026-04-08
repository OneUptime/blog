# How to Use $dateTrunc to Round Dates in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Date, $dateTrunc, Time Bucketing

Description: Learn how to use $dateTrunc in MongoDB aggregation to truncate dates to a specific unit like hour, day, or week for time-bucket grouping and time-series analysis.

---

`$dateTrunc` truncates a date value to the start of a specified time unit. It is the cleanest way to bucket documents into hourly, daily, weekly, or monthly intervals for time-series analysis and reporting.

## Basic Syntax

```js
{
  $dateTrunc: {
    date: <expression>,
    unit: <"second"|"minute"|"hour"|"day"|"week"|"month"|"quarter"|"year">,
    binSize: <optional integer>,
    timezone: <optional timezone string>,
    startOfWeek: <optional "monday"|"tuesday"...>
  }
}
```

## Truncate to the Start of the Day

```js
db.events.aggregate([
  {
    $project: {
      dayBucket: {
        $dateTrunc: {
          date: "$timestamp",
          unit: "day"
        }
      }
    }
  }
]);
```

An event with `timestamp: 2026-03-15T14:32:07Z` produces `dayBucket: 2026-03-15T00:00:00Z`.

## Group Events by Hour

Count requests per hour:

```js
db.requests.aggregate([
  {
    $group: {
      _id: {
        $dateTrunc: { date: "$timestamp", unit: "hour" }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Group into 15-Minute Intervals with binSize

`binSize` multiplies the unit to create larger buckets:

```js
db.metrics.aggregate([
  {
    $group: {
      _id: {
        $dateTrunc: {
          date: "$recordedAt",
          unit: "minute",
          binSize: 15
        }
      },
      avgLatency: { $avg: "$latencyMs" }
    }
  },
  { $sort: { _id: 1 } }
]);
```

This creates 15-minute buckets starting at :00, :15, :30, :45.

## Weekly Buckets Starting on Monday

By default, weeks start on Sunday. Use `startOfWeek` to change this:

```js
db.sales.aggregate([
  {
    $group: {
      _id: {
        $dateTrunc: {
          date: "$saleDate",
          unit: "week",
          startOfWeek: "monday"
        }
      },
      weeklyRevenue: { $sum: "$amount" }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Timezone-Aware Truncation

Truncating to "day" in UTC can produce midnight boundaries that do not align with local business days. Use `timezone` to fix this:

```js
db.orders.aggregate([
  {
    $group: {
      _id: {
        $dateTrunc: {
          date: "$createdAt",
          unit: "day",
          timezone: "America/Los_Angeles"
        }
      },
      dailyOrders: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Comparing $dateTrunc vs $dateToString for Grouping

Both approaches can group by day, but `$dateTrunc` preserves the Date type in the `_id`, making downstream date math easier:

```js
// Using $dateTrunc - _id is a Date
{ $group: { _id: { $dateTrunc: { date: "$ts", unit: "day" } } } }

// Using $dateToString - _id is a String
{ $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } } } }
```

Prefer `$dateTrunc` when you need to sort the results chronologically or chain further date operations.

## Filling Gaps with $densify

Combine `$dateTrunc` with `$densify` to ensure every time bucket appears in the output even if no documents exist:

```js
db.metrics.aggregate([
  {
    $group: {
      _id: { $dateTrunc: { date: "$ts", unit: "hour" } },
      avg: { $avg: "$value" }
    }
  },
  {
    $densify: {
      field: "_id",
      range: {
        step: 1,
        unit: "hour",
        bounds: [new Date("2026-03-01"), new Date("2026-03-02")]
      }
    }
  }
]);
```

## Summary

`$dateTrunc` is the most reliable way to create time buckets in MongoDB aggregation pipelines. Use `binSize` for multi-unit intervals like 15-minute windows, `startOfWeek` to align weekly buckets to business calendars, and `timezone` to ensure truncation reflects local time rather than UTC boundaries.
