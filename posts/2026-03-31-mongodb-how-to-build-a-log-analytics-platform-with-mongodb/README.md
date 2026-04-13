# How to Build a Log Analytics Platform with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Log, Analytics, Aggregation, Time Series, Index

Description: Learn how to build a log analytics platform with MongoDB using time series collections, aggregation pipelines, and TTL indexes for automatic expiry.

---

## Introduction

MongoDB is a strong choice for log analytics due to its write throughput, flexible schema, and powerful aggregation pipeline. With native time series collection support (MongoDB 5.0+), log storage and querying become even more efficient. This guide covers ingesting, storing, and analyzing log data with MongoDB.

## Using a Time Series Collection for Logs

Create a time series collection for efficient time-range queries:

```javascript
db.createCollection("appLogs", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds"
  },
  expireAfterSeconds: 2592000  // 30 days TTL
});
```

## Log Document Schema

```javascript
{
  timestamp: ISODate("2026-03-31T12:00:00Z"),
  metadata: {
    service: "api-gateway",
    host: "host-01",
    environment: "production"
  },
  level: "ERROR",
  message: "Connection timeout to upstream service",
  traceId: "abc123def456",
  duration: 5002,
  statusCode: 503
}
```

## Ingesting Logs in Batches

Batch inserts reduce write overhead:

```javascript
const logs = events.map(e => ({
  timestamp: new Date(e.ts),
  metadata: { service: e.service, host: e.host, environment: e.env },
  level: e.level,
  message: e.msg,
  traceId: e.traceId,
  duration: e.duration
}));

await db.collection("appLogs").insertMany(logs, { ordered: false });
```

## Querying Logs by Time Range

```javascript
const oneHourAgo = new Date(Date.now() - 3600000);

db.appLogs.find({
  timestamp: { $gte: oneHourAgo },
  "metadata.service": "api-gateway",
  level: "ERROR"
}).sort({ timestamp: -1 }).limit(100);
```

## Error Rate Aggregation

Count errors per service per minute:

```javascript
db.appLogs.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 3600000) },
      level: "ERROR"
    }
  },
  {
    $group: {
      _id: {
        service: "$metadata.service",
        minute: {
          $dateToString: { format: "%Y-%m-%dT%H:%M", date: "$timestamp" }
        }
      },
      errorCount: { $sum: 1 }
    }
  },
  { $sort: { "_id.minute": 1, errorCount: -1 } }
]);
```

## P95 Latency Analysis

```javascript
db.appLogs.aggregate([
  { $match: { "metadata.service": "api-gateway", duration: { $exists: true } } },
  { $sort: { duration: 1 } },
  { $group: { _id: null, durations: { $push: "$duration" } } },
  {
    $project: {
      p95: {
        $arrayElemAt: [
          "$durations",
          { $floor: { $multiply: [0.95, { $size: "$durations" }] } }
        ]
      }
    }
  }
]);
```

## Summary

MongoDB's time series collections, TTL support, and aggregation pipeline make it a capable log analytics platform. Storing logs in a time series collection with automatic expiry keeps storage bounded. The aggregation pipeline handles error rate tracking, latency analysis, and service-level reporting without requiring a separate analytics engine.
