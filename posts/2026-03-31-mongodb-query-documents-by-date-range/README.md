# How to Query Documents by Date Range in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Date, Query, Range, Index

Description: Learn how to query MongoDB documents by date range using $gte and $lte operators, ISODate, and indexes for fast time-based lookups.

---

## Overview

Date range queries are among the most common operations in MongoDB. Whether filtering orders placed this month, events within a week, or logs from the last 24 hours, you need to use comparison operators against date fields stored as BSON Date values.

## Storing Dates Correctly

Always store dates as BSON Date objects, not strings. Using strings will cause incorrect range comparisons.

```javascript
db.orders.insertOne({
  createdAt: new Date("2026-01-15T10:30:00Z"),
  amount: 99.99
});
```

## Basic Date Range Query

Use `$gte` (greater than or equal) and `$lt` (less than) to bound a date range.

```javascript
db.orders.find({
  createdAt: {
    $gte: new Date("2026-01-01T00:00:00Z"),
    $lt:  new Date("2026-02-01T00:00:00Z")
  }
});
```

## Using ISODate in mongosh

In the mongo shell, `ISODate()` is a convenient alias for `new Date()`.

```javascript
db.orders.find({
  createdAt: {
    $gte: ISODate("2026-01-01"),
    $lt:  ISODate("2026-02-01")
  }
});
```

## Querying the Last N Days

To query documents from the last 7 days dynamically, compute the cutoff date at query time.

```javascript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

db.events.find({
  timestamp: { $gte: sevenDaysAgo }
});
```

## Date Range in Aggregation Pipeline

Use `$match` at the start of a pipeline to filter by date range before computing aggregates.

```javascript
db.orders.aggregate([
  {
    $match: {
      createdAt: {
        $gte: ISODate("2026-01-01"),
        $lt:  ISODate("2026-02-01")
      }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: "$amount" },
      count: { $sum: 1 }
    }
  }
]);
```

## Indexing Date Fields

An index on the date field dramatically speeds up range queries.

```javascript
db.orders.createIndex({ createdAt: 1 });
```

For queries that always combine date with another field, use a compound index.

```javascript
db.orders.createIndex({ status: 1, createdAt: 1 });
```

Run `explain("executionStats")` to verify the query uses the index rather than a full collection scan.

```javascript
db.orders.find({
  createdAt: { $gte: ISODate("2026-01-01"), $lt: ISODate("2026-02-01") }
}).explain("executionStats");
```

## Common Pitfalls

- Storing dates as strings leads to lexicographic comparisons that fail across year boundaries.
- Forgetting to use UTC consistently causes off-by-one errors near midnight.
- Querying without an index results in collection scans that scale poorly.

## Summary

To query documents by date range in MongoDB, use `$gte` and `$lte` operators against BSON Date fields. Always store dates as native Date objects, create an index on the date field for performance, and use `explain()` to confirm the query plan uses that index.
