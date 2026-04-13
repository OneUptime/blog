# How to Aggregate Data by Day, Week, Month, or Year in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Date, Group, Analytics

Description: Learn how to aggregate MongoDB data by day, week, month, or year using $group with $dateTrunc and date extraction operators for time-series reporting.

---

Grouping data by time period is one of the most common reporting tasks. MongoDB provides several date operators in the aggregation pipeline to truncate or extract date parts, enabling flexible time-based grouping.

## Grouping by Day

Use `$dateTrunc` (MongoDB 5.0+) to round timestamps down to the start of each day:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: {
        $dateTrunc: { date: "$createdAt", unit: "day" }
      },
      totalRevenue: { $sum: "$amount" },
      orderCount:   { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

For MongoDB 4.x without `$dateTrunc`, use date extraction:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: {
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" }
      },
      totalRevenue: { $sum: "$amount" }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
])
```

## Grouping by Week

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: {
        $dateTrunc: { date: "$createdAt", unit: "week" }
      },
      totalRevenue: { $sum: "$amount" },
      orderCount:   { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

Alternatively, use ISO week numbers:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: {
        isoWeek: { $isoWeek: "$createdAt" },
        year:    { $isoWeekYear: "$createdAt" }
      },
      totalRevenue: { $sum: "$amount" }
    }
  }
])
```

## Grouping by Month

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: {
        $dateTrunc: { date: "$createdAt", unit: "month" }
      },
      totalRevenue: { $sum: "$amount" },
      avgOrderValue: { $avg: "$amount" }
    }
  },
  { $sort: { _id: 1 } },
  {
    $project: {
      month: { $dateToString: { format: "%Y-%m", date: "$_id" } },
      totalRevenue: 1,
      avgOrderValue: { $round: ["$avgOrderValue", 2] }
    }
  }
])
```

## Grouping by Year

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: { year: { $year: "$createdAt" } },
      totalRevenue: { $sum: "$amount" },
      orderCount:   { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1 } }
])
```

## Grouping with Timezone Support

Production systems often store UTC but report in local time. Use the `timezone` option:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: {
        $dateTrunc: {
          date:     "$createdAt",
          unit:     "day",
          timezone: "America/New_York"
        }
      },
      totalRevenue: { $sum: "$amount" }
    }
  },
  { $sort: { _id: 1 } }
])
```

## Filling in Missing Time Buckets

If some days have no data, use `$densify` to fill gaps:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: { $dateTrunc: { date: "$createdAt", unit: "day" } },
      totalRevenue: { $sum: "$amount" }
    }
  },
  {
    $densify: {
      field: "_id",
      range: {
        step: 1,
        unit: "day",
        bounds: [ISODate("2024-01-01"), ISODate("2024-02-01")]
      }
    }
  },
  {
    $fill: {
      output: { totalRevenue: { value: 0 } }
    }
  },
  { $sort: { _id: 1 } }
])
```

## Summary

Use `$dateTrunc` for clean date bucket grouping in MongoDB 5.0+ or the date extraction operators (`$year`, `$month`, `$dayOfMonth`) for older versions. Add `timezone` to handle local time reporting correctly. Combine with `$densify` and `$fill` to ensure continuous time series output with zero-filled gaps.
