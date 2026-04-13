# How to Model an IoT Sensor Data Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, IoT, Sensor Data, Time Series

Description: Learn how to design a MongoDB schema for IoT sensor data using the bucket pattern and time series collections to handle high-volume telemetry efficiently.

---

## IoT Data Challenges

IoT applications generate high-frequency sensor readings - often millions per day per device. The key challenges are:
- High insert throughput
- Efficient time-range queries
- Aggregation over time windows
- Data retention and archiving

## Device Registry Collection

Store device metadata separately from readings:

```javascript
// devices collection
{
  _id: ObjectId("d001"),
  deviceId: "sensor-factory-001",
  name: "Factory Floor Sensor A1",
  type: "temperature-humidity",
  location: {
    facility: "San Francisco Factory",
    zone: "Production Floor",
    coordinates: { type: "Point", coordinates: [-122.4194, 37.7749] }
  },
  firmware: "v2.3.1",
  installedAt: ISODate("2025-06-01T00:00:00Z"),
  active: true,
  tags: ["critical", "floor-1"]
}
```

Indexes:
```javascript
db.devices.createIndex({ deviceId: 1 }, { unique: true })
db.devices.createIndex({ "location.facility": 1 })
db.devices.createIndex({ active: 1, type: 1 })
```

## Approach 1: Bucket Pattern for Sensor Readings

Group readings into hourly buckets for efficient time-range queries:

```javascript
// sensorBuckets collection
{
  _id: ObjectId("b001"),
  deviceId: "sensor-factory-001",
  bucketStart: ISODate("2026-03-31T08:00:00Z"),
  bucketEnd: ISODate("2026-03-31T09:00:00Z"),
  sampleCount: 60,
  // Pre-aggregated stats for fast dashboard queries
  temperature: {
    min: 21.2,
    max: 24.8,
    sum: 1368.0
  },
  humidity: {
    min: 45.1,
    max: 58.3,
    sum: 3078.6
  },
  readings: [
    { t: ISODate("2026-03-31T08:00:00Z"), temp: 22.1, hum: 51.2 },
    { t: ISODate("2026-03-31T08:01:00Z"), temp: 22.3, hum: 51.8 },
    // ... up to 60 readings per hour
  ]
}
```

Insert a reading into the current bucket:

```javascript
async function insertReading(deviceId, reading) {
  const now = new Date();
  const bucketStart = new Date(now);
  bucketStart.setMinutes(0, 0, 0);

  await db.sensorBuckets.findOneAndUpdate(
    {
      deviceId,
      bucketStart,
      sampleCount: { $lt: 60 }
    },
    {
      $push: { readings: { t: now, ...reading } },
      $inc: {
        sampleCount: 1,
        "temperature.sum": reading.temp,
        "humidity.sum": reading.hum
      },
      $min: { "temperature.min": reading.temp, "humidity.min": reading.hum },
      $max: { "temperature.max": reading.temp, "humidity.max": reading.hum },
      $set: {
        deviceId,
        bucketStart,
        bucketEnd: now
      }
    },
    { upsert: true }
  );
}
```

## Approach 2: Native Time Series Collections (MongoDB 5.0+)

For new projects on MongoDB 5.0+, use native time series collections which implement optimized storage automatically:

```javascript
db.createCollection("sensorReadings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "deviceId",
    granularity: "minutes"
  },
  expireAfterSeconds: 7776000  // Keep 90 days
})

// Insert a reading
db.sensorReadings.insertOne({
  deviceId: "sensor-factory-001",
  timestamp: new Date(),
  temperature: 22.1,
  humidity: 51.2,
  pressure: 1013.2
})
```

## Querying Sensor Data

Get hourly averages for a device over a day (bucket pattern):

```javascript
db.sensorBuckets.aggregate([
  {
    $match: {
      deviceId: "sensor-factory-001",
      bucketStart: {
        $gte: ISODate("2026-03-31T00:00:00Z"),
        $lt: ISODate("2026-04-01T00:00:00Z")
      }
    }
  },
  {
    $project: {
      hour: { $hour: "$bucketStart" },
      avgTemp: { $divide: ["$temperature.sum", "$sampleCount"] },
      maxTemp: "$temperature.max",
      minTemp: "$temperature.min",
      avgHumidity: { $divide: ["$humidity.sum", "$sampleCount"] }
    }
  },
  { $sort: { hour: 1 } }
])
```

Get the latest reading for all active devices:

```javascript
db.sensorBuckets.aggregate([
  { $sort: { deviceId: 1, bucketStart: -1 } },
  {
    $group: {
      _id: "$deviceId",
      latestBucket: { $first: "$$ROOT" }
    }
  },
  {
    $project: {
      deviceId: "$_id",
      lastReading: { $arrayElemAt: ["$latestBucket.readings", -1] }
    }
  }
])
```

## Alert Schema

Store alerts triggered by sensor thresholds:

```javascript
// alerts collection
{
  _id: ObjectId("a001"),
  deviceId: "sensor-factory-001",
  type: "temperature_high",
  severity: "warning",
  message: "Temperature exceeded 25°C threshold",
  value: 26.3,
  threshold: 25.0,
  triggeredAt: ISODate("2026-03-31T14:22:00Z"),
  resolvedAt: null,
  acknowledged: false,
  acknowledgedBy: null
}
```

Indexes:
```javascript
db.alerts.createIndex({ deviceId: 1, triggeredAt: -1 })
db.alerts.createIndex({ severity: 1, resolvedAt: 1 })
db.alerts.createIndex({ triggeredAt: 1 }, { expireAfterSeconds: 2592000 }) // 30 day TTL
```

## Data Retention

Use TTL indexes or a cron job to delete old raw data while retaining aggregations:

```javascript
// Keep raw bucket data for 90 days
db.sensorBuckets.createIndex(
  { bucketStart: 1 },
  { expireAfterSeconds: 7776000 }
)

// Keep daily aggregates for 2 years in a separate collection
// Archive hourly buckets to dailyAggregates before they expire
```

## Summary

Model IoT sensor data in MongoDB using a device registry collection for metadata and either the bucket pattern or native time series collections for readings. The bucket pattern groups readings into hourly documents with pre-aggregated stats (min, max, sum, count) for fast dashboard queries. Use MongoDB 5.0+ time series collections for new projects to get optimized storage automatically. Store alerts in a separate collection with TTL indexes to manage retention, and always design with time-range queries and aggregations as the primary access pattern.
