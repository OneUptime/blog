# How to Perform a Range Query on Dates in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Date, Index, Aggregation

Description: Learn how to perform date range queries in MongoDB using $gte and $lte with BSON Date objects, including timezone handling and index optimization.

---

Date range queries are among the most common operations in MongoDB applications - filtering logs by time window, finding orders placed this month, or reporting on events within a fiscal quarter. Correct date handling requires using BSON `Date` objects, not strings.

## Basic Date Range Query

Use `$gte` (greater than or equal) and `$lte` (less than or equal) with `Date` objects:

```javascript
// Find orders placed in January 2024
db.orders.find({
  placedAt: {
    $gte: new Date("2024-01-01T00:00:00.000Z"),
    $lte: new Date("2024-01-31T23:59:59.999Z")
  }
})
```

Or using exclusive upper bound for cleaner month boundaries:

```javascript
db.orders.find({
  placedAt: {
    $gte: new Date("2024-01-01T00:00:00Z"),
    $lt:  new Date("2024-02-01T00:00:00Z")
  }
})
```

## Using ISODate in mongosh

In mongosh, `ISODate()` and `new Date()` are equivalent:

```javascript
db.events.find({
  occurredAt: {
    $gte: ISODate("2024-06-01"),
    $lt:  ISODate("2024-07-01")
  }
})
```

## Querying Relative Dates

For queries relative to "now":

```javascript
// Documents from the last 24 hours
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

db.alerts.find({
  createdAt: { $gte: oneDayAgo }
})

// Documents from the last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

db.sessions.find({
  lastActivity: { $gte: thirtyDaysAgo }
})
```

## Timezone Considerations

MongoDB stores all dates in UTC. If your application uses a different timezone, convert before querying:

```javascript
// User says "today in New York" (UTC-4 in summer/EDT)
// New York midnight = 04:00 UTC
const nyMidnight = new Date("2024-06-15T04:00:00Z");
const nyEndOfDay = new Date("2024-06-16T04:00:00Z");

db.appointments.find({
  scheduledAt: {
    $gte: nyMidnight,
    $lt:  nyEndOfDay
  }
})
```

In aggregation, use `$dateToString` with a `timezone` parameter for grouping:

```javascript
db.events.aggregate([
  {
    $group: {
      _id: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$occurredAt",
          timezone: "America/New_York"
        }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

## Date Range in Aggregation Pipeline

```javascript
db.sales.aggregate([
  {
    $match: {
      saleDate: {
        $gte: new Date("2024-01-01"),
        $lt: new Date("2025-01-01")
      }
    }
  },
  {
    $group: {
      _id: { $month: "$saleDate" },
      totalRevenue: { $sum: "$amount" },
      transactionCount: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
])
```

## Indexing Date Fields

A date range query without an index requires a full collection scan. Always index date fields used in range queries:

```javascript
db.orders.createIndex({ placedAt: 1 })

// Compound index for filtered date queries
db.orders.createIndex({ customerId: 1, placedAt: 1 })
```

Verify index use with explain:

```javascript
db.orders.find({
  placedAt: { $gte: new Date("2024-01-01"), $lt: new Date("2025-01-01") }
}).explain("executionStats")
```

## Summary

Always use BSON `Date` objects (not strings) for date comparisons in MongoDB. Use `$gte`/`$lt` for inclusive/exclusive range boundaries. Store dates in UTC and convert for timezone-aware grouping in aggregation. Index all date fields that appear in range query predicates to ensure efficient index scans rather than collection scans.
