# How to Handle TTL for Time Series Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Series, TTL, Index, Performance

Description: Learn how to configure TTL indexes on MongoDB time series collections to automatically expire old sensor or event data and keep storage under control.

---

MongoDB time series collections store sequences of measurements over time. Without a retention policy, historical data accumulates indefinitely. TTL indexes let MongoDB automatically delete documents once they age past a threshold, making them ideal for sensor readings, metrics, and event streams.

## How TTL Works with Time Series Collections

When you create a time series collection, you specify a `timeField` and an optional `expireAfterSeconds` parameter. MongoDB uses this to build a TTL mechanism that evaluates the `timeField` value of each bucket internally.

```javascript
db.createCollection("sensorReadings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "sensorId",
    granularity: "minutes"
  },
  expireAfterSeconds: 604800  // 7 days
});
```

After one week, documents with a `timestamp` older than 7 days are automatically removed during the next TTL pass.

## Verifying TTL Configuration

Inspect the collection options to confirm the retention window:

```javascript
db.getCollectionInfos({ name: "sensorReadings" })
```

Look for `expireAfterSeconds` in the output under the collection options.

## Modifying TTL After Creation

Unlike regular TTL indexes on standard collections, time series TTL is managed through `collMod` rather than by dropping and recreating the index:

```javascript
db.runCommand({
  collMod: "sensorReadings",
  expireAfterSeconds: 2592000  // 30 days
});
```

To disable automatic expiration without dropping the collection, set `expireAfterSeconds` to `"off"`:

```javascript
db.runCommand({
  collMod: "sensorReadings",
  expireAfterSeconds: "off"
});
```

This is useful when you need to pause expiration during a data migration or audit. Do not set `expireAfterSeconds` to `0`, as that causes documents to expire immediately rather than disabling TTL.

## TTL Frequency and Latency

MongoDB's background TTL thread runs approximately every 60 seconds. Data is not removed the instant it expires - there can be a delay of up to a few minutes. Do not rely on TTL for precise, second-level data removal.

You can observe TTL activity in the server log with:

```bash
mongod --setParameter ttlMonitorSleepSecs=30
```

Or via `setParameter` at runtime:

```javascript
db.adminCommand({ setParameter: 1, ttlMonitorSleepSecs: 30 });
```

## Choosing the Right Retention Window

| Granularity | Suggested Retention |
|-------------|---------------------|
| seconds     | 1-7 days            |
| minutes     | 7-90 days           |
| hours       | 90-365 days         |

Match `expireAfterSeconds` to your actual query patterns. If your dashboards only look back 30 days, storing 365 days just wastes disk space.

## Practical Example: IoT Sensor Pipeline

```javascript
// Insert a sensor reading
db.sensorReadings.insertOne({
  timestamp: new Date(),
  sensorId: "device-42",
  temperature: 22.5,
  humidity: 58
});

// Check how many documents remain after TTL window
db.sensorReadings.countDocuments({
  timestamp: { $gt: new Date(Date.now() - 7 * 24 * 3600 * 1000) }
});
```

TTL ensures that only the most recent week of data is stored, keeping collection size predictable.

## Summary

MongoDB time series collections support TTL natively via `expireAfterSeconds` at creation time or through `collMod` for updates. The background TTL thread removes expired buckets automatically, keeping storage bounded without requiring application-level cleanup jobs. Match your retention window to actual query needs and monitor TTL activity to ensure it is keeping up with your ingestion rate.
