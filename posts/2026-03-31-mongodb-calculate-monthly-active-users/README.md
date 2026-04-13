# How to Calculate Monthly Active Users in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Analytics, User, Metric

Description: Learn how to calculate Monthly Active Users (MAU) in MongoDB using the aggregation pipeline to count distinct users per month.

---

## Introduction

Monthly Active Users (MAU) is a key product metric that counts the number of unique users who performed at least one action in a given month. MongoDB's aggregation pipeline can compute MAU efficiently using `$group` with `$addToSet` or `$dateToString`.

## Sample Data Structure

Assume an `events` collection that records user activity:

```json
{
  "_id": ObjectId("..."),
  "userId": "user_42",
  "event": "page_view",
  "timestamp": ISODate("2025-03-15T14:23:00Z")
}
```

## Basic MAU Calculation

Group events by year-month and collect unique user IDs:

```javascript
db.events.aggregate([
  {
    $group: {
      _id: {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" }
      },
      activeUsers: { $addToSet: "$userId" }
    }
  },
  {
    $project: {
      _id: 1,
      mau: { $size: "$activeUsers" }
    }
  },
  {
    $sort: { "_id.year": 1, "_id.month": 1 }
  }
])
```

`$addToSet` builds a set of unique user IDs per group, and `$size` counts them to produce the MAU number.

## Filtering by Event Type

If you only want to count users who performed a meaningful action (not just passive page views), add a `$match` stage:

```javascript
db.events.aggregate([
  {
    $match: {
      event: { $in: ["purchase", "signup", "content_view"] },
      timestamp: {
        $gte: ISODate("2025-01-01T00:00:00Z"),
        $lt: ISODate("2026-01-01T00:00:00Z")
      }
    }
  },
  {
    $group: {
      _id: {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" }
      },
      activeUsers: { $addToSet: "$userId" }
    }
  },
  {
    $project: {
      period: {
        $concat: [
          { $toString: "$_id.year" }, "-",
          { $toString: "$_id.month" }
        ]
      },
      mau: { $size: "$activeUsers" }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
])
```

## Memory Considerations with $addToSet

`$addToSet` stores the entire set in memory for each group, which can be expensive for large user bases. For millions of users, enable `allowDiskUse`:

```javascript
db.events.aggregate(
  [
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$timestamp" } },
        activeUsers: { $addToSet: "$userId" }
      }
    },
    {
      $project: { mau: { $size: "$activeUsers" } }
    }
  ],
  { allowDiskUse: true }
)
```

For approximate MAU at very large scale, consider storing pre-aggregated daily active user counts in a separate collection and rolling them up monthly.

## Recommended Index

Index the timestamp and event fields to support efficient filtering:

```javascript
db.events.createIndex({ timestamp: 1, event: 1, userId: 1 })
```

## Summary

Calculating MAU in MongoDB uses `$group` combined with `$addToSet` to collect unique user IDs, then `$size` to count them. Use `$match` early in the pipeline to filter relevant events and date ranges. For large datasets, enable `allowDiskUse` to avoid memory limits. Indexing on `timestamp` and `event` ensures the pipeline runs efficiently against the filtered document set.
