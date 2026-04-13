# How to Implement the Bucket Pattern in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Bucket Pattern, Time Series, Schema Design

Description: Learn how to implement the bucket pattern in MongoDB to efficiently store and query high-volume time-series or sequential data by grouping records into document buckets.

---

## What Is the Bucket Pattern?

The bucket pattern groups related documents (typically time-series data) into a single document instead of storing one document per measurement. This reduces document count, minimizes index size, and improves query performance for range-based access patterns.

## The Problem: One Document Per Event

Storing one document per sensor reading creates millions of small documents:

```javascript
// Anti-pattern: one document per reading
{ sensorId: "s001", timestamp: ISODate("2026-03-31T00:00:00Z"), temp: 22.1 }
{ sensorId: "s001", timestamp: ISODate("2026-03-31T00:01:00Z"), temp: 22.3 }
{ sensorId: "s001", timestamp: ISODate("2026-03-31T00:02:00Z"), temp: 22.0 }
// ... 1440 documents per day per sensor
```

Problems: large index on `(sensorId, timestamp)`, high document overhead, slow range queries.

## The Solution: Group into Buckets

Store multiple readings per document, grouped by a time window (e.g., one hour):

```javascript
{
  _id: ObjectId("..."),
  sensorId: "s001",
  bucketStart: ISODate("2026-03-31T00:00:00Z"),
  bucketEnd: ISODate("2026-03-31T01:00:00Z"),
  count: 60,
  sum: 1328.4,
  min: 21.8,
  max: 22.7,
  readings: [
    { t: ISODate("2026-03-31T00:00:00Z"), v: 22.1 },
    { t: ISODate("2026-03-31T00:01:00Z"), v: 22.3 },
    { t: ISODate("2026-03-31T00:02:00Z"), v: 22.0 },
    // ... up to 60 readings
  ]
}
```

This reduces 1440 documents/day to 24 documents/day per sensor (one per hour).

## Index for the Bucket Pattern

```javascript
db.sensorBuckets.createIndex({ sensorId: 1, bucketStart: 1 })
```

## Inserting Data into Buckets

Use `findOneAndUpdate` with `upsert` to add readings to the current bucket:

```javascript
const now = new Date();
const bucketStart = new Date(now);
bucketStart.setMinutes(0, 0, 0); // Truncate to hour
const bucketEnd = new Date(bucketStart);
bucketEnd.setHours(bucketEnd.getHours() + 1); // End of hour window

db.sensorBuckets.findOneAndUpdate(
  {
    sensorId: "s001",
    bucketStart: bucketStart,
    count: { $lt: 60 } // Limit bucket size
  },
  {
    $push: {
      readings: { t: now, v: 22.5 }
    },
    $inc: { count: 1, sum: 22.5 },
    $min: { min: 22.5 },
    $max: { max: 22.5 },
    $setOnInsert: {
      bucketEnd: bucketEnd
    }
  },
  {
    upsert: true,
    returnDocument: "after"
  }
)
```

## Querying Bucket Data

Find all readings for a sensor in a time range:

```javascript
const startTime = ISODate("2026-03-31T06:00:00Z");
const endTime = ISODate("2026-03-31T12:00:00Z");

db.sensorBuckets.find({
  sensorId: "s001",
  bucketStart: { $gte: startTime, $lt: endTime }
})
```

Compute hourly averages using stored aggregates:

```javascript
db.sensorBuckets.aggregate([
  {
    $match: {
      sensorId: "s001",
      bucketStart: { $gte: ISODate("2026-03-31T00:00:00Z") }
    }
  },
  {
    $project: {
      hour: { $hour: "$bucketStart" },
      avg: { $divide: ["$sum", "$count"] }
    }
  },
  { $sort: { hour: 1 } }
])
```

## Pre-aggregated Fields

Storing `sum`, `min`, `max`, and `count` in each bucket eliminates full array traversal for aggregate queries. This is a key advantage of the bucket pattern over storing raw arrays only.

## Choosing Bucket Size

```text
Data frequency       | Suggested bucket size
---------------------|----------------------
Per minute           | 1 hour (60 docs)
Per second           | 1 hour (3600 docs)
Per millisecond      | 1 minute (60,000 - too large, use 10s)
Daily events (< 100) | 1 day or 1 week
```

A good bucket size keeps documents under 1-2MB and limits the readings array to 200-1000 entries.

## Relationship to MongoDB Time Series Collections

MongoDB 5.0+ introduced native time series collections which implement a similar bucketing strategy internally. For new projects, consider using them instead:

```javascript
db.createCollection("sensorReadings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "sensorId",
    granularity: "minutes"
  }
})
```

Use the manual bucket pattern when you need more control over aggregation or are on MongoDB < 5.0.

## Summary

The bucket pattern groups high-frequency sequential data into larger documents with a bounded array and pre-aggregated summary fields. It dramatically reduces document count, shrinks index size, and speeds up range queries by accessing fewer documents. Design bucket boundaries around your most common query range (hour, day, week), pre-aggregate `sum`, `min`, `max`, and `count` during insertion, and use `findOneAndUpdate` with `upsert` to fill buckets incrementally.
