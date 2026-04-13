# How to Choose Granularity for Time Series Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Series, Granularity, Performance, Storage

Description: Understand how MongoDB time series granularity settings affect bucket sizes, storage efficiency, and query performance, and how to choose the right value.

---

## What Is Granularity?

Granularity is a hint that controls how MongoDB groups time series documents into internal storage buckets. Each bucket covers a time span defined by the granularity setting and the maximum bucket size.

| Granularity | Default Max Span |
|---|---|
| `seconds` | 1 hour |
| `minutes` | 24 hours |
| `hours` | 30 days |

More documents per bucket = better compression. Choosing a granularity that matches your data's actual frequency maximizes compression efficiency.

## How Bucketing Works

MongoDB stores time series data in internal "bucket" documents. Each bucket holds measurements from a time window for the same metaField value. Documents within a bucket are compressed together using columnar storage.

```text
Bucket: sensorId=001, window=[2024-01-01 00:00, 2024-01-01 01:00]
  - Contains all readings for sensor-001 in that 1-hour window
  - All temperature values compressed together
  - All humidity values compressed together
```

A granularity of `seconds` creates 1-hour buckets. A granularity of `hours` creates 30-day buckets.

## Choosing the Right Granularity

### Seconds Granularity

Use when measurements arrive frequently (every second, or multiple times per second):

```javascript
db.createCollection("cpu_metrics", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds"    // 1-hour buckets
  }
})
```

Good for:
- Server metrics collected every 1-60 seconds
- IoT sensors with high-frequency data
- Financial tick data
- Real-time monitoring

### Minutes Granularity

Use when measurements arrive every few minutes:

```javascript
db.createCollection("environment_readings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"    // 24-hour buckets
  }
})
```

Good for:
- Temperature/humidity sensors (every 5-10 minutes)
- Energy usage readings (every 15 minutes)
- Application metrics with 1-minute resolution

### Hours Granularity

Use for infrequent, daily, or summary data:

```javascript
db.createCollection("daily_summaries", {
  timeseries: {
    timeField: "date",
    metaField: "metadata",
    granularity: "hours"    // 30-day buckets
  }
})
```

Good for:
- Daily aggregated summaries
- Hourly business metrics
- Data that arrives once per hour or less

## Custom Bucket Configuration (MongoDB 6.3+)

On MongoDB 6.3+, use explicit `bucketMaxSpanSeconds` and `bucketRoundingSeconds` for fine-grained control:

```javascript
// Data arrives every 5 minutes - create 1-day buckets
db.createCollection("readings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    bucketMaxSpanSeconds: 86400,    // 24-hour buckets
    bucketRoundingSeconds: 86400    // Round bucket start to day boundaries
  }
})
```

`bucketRoundingSeconds` must equal `bucketMaxSpanSeconds`.

## Impact of Wrong Granularity

### Too Fine (seconds for hourly data)

```text
Data: 1 reading per hour per sensor
Granularity: seconds (1-hour buckets)

Result: 1 document per bucket
       - Almost no compression benefit
       - Many small buckets
       - More bucket metadata overhead
```

### Too Coarse (hours for per-second data)

```text
Data: 1 reading per second per sensor
Granularity: hours (30-day buckets)

Result: ~2.6 million readings per bucket
       - Very large bucket documents
       - Slow to update active buckets
       - More memory pressure
```

## Checking Your Actual Data Frequency

Before choosing granularity, analyze your data:

```javascript
// How many readings per hour per sensor?
db.sensor_readings.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: {
        sensorId: "$metadata.sensorId",
        hour: { $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" } }
      },
      count: { $sum: 1 }
    }
  },
  {
    $group: {
      _id: "$_id.sensorId",
      avgReadingsPerHour: { $avg: "$count" }
    }
  }
])
```

Use the result to guide your granularity choice:
- < 60 readings/hour: `hours` granularity
- 60-1440 readings/hour: `minutes` granularity
- > 1440 readings/hour (>24/min): `seconds` granularity

## Changing Granularity

Starting with MongoDB 6.0, you can increase granularity on an existing collection using `collMod` (for example, from `seconds` to `minutes` or from `minutes` to `hours`). You cannot decrease it.

```javascript
// Increase granularity from seconds to minutes
db.runCommand({
  collMod: "sensor_readings",
  timeseries: { granularity: "minutes" }
})
```

If you need to decrease granularity, you must recreate the collection:

```javascript
// 1. Create new collection with correct granularity
db.createCollection("sensor_readings_v2", {
  timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" }
})

// 2. Copy data
db.sensor_readings.aggregate([
  { $match: { timestamp: { $gte: new Date("2024-01-01") } } },
  { $out: "sensor_readings_v2" }
])
```

## Summary

Choose time series granularity by matching it to your data's actual measurement frequency: `seconds` for sub-minute data, `minutes` for data arriving every few minutes, and `hours` for hourly or less frequent data. Correct granularity maximizes bucket fill, which drives compression efficiency - mismatched granularity leads to either wasted storage or oversized buckets. Use MongoDB 6.3+ explicit bucket span settings for precise control over bucket size boundaries.
