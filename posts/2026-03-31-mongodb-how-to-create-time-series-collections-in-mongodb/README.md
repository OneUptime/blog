# How to Create Time Series Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Series, Collection, IoT, Analytics

Description: Create and use MongoDB time series collections for efficient storage and querying of time-stamped measurements, sensor data, and metrics.

---

## What Are Time Series Collections?

Time series collections are a specialized MongoDB collection type optimized for storing time-stamped data. Internally, MongoDB uses columnar compression to store measurements efficiently, reducing storage by 50-90% compared to regular collections.

Ideal for:
- IoT sensor readings
- Application metrics and monitoring data
- Financial tick data
- Server logs with timestamps
- Weather and environmental measurements

## Prerequisites

- MongoDB 5.0+ for basic time series
- MongoDB 6.0+ for secondary indexes on measurement fields
- MongoDB 7.0+ for mixed schema validation support

## Step 1: Create a Time Series Collection

```javascript
db.createCollection("sensor_readings", {
  timeseries: {
    timeField: "timestamp",    // Required: field containing the measurement time
    metaField: "metadata",     // Optional: field for grouping (device ID, location, etc.)
    granularity: "seconds"     // Optional: "seconds", "minutes", or "hours"
  }
})
```

- `timeField`: Must be a BSON Date. Required.
- `metaField`: Groups related measurements. Should be the identifier for the series (device ID, sensor ID, stock symbol).
- `granularity`: Hint to optimize internal bucketing. Match your data's frequency.

## Step 2: Insert Time Series Data

```javascript
// Insert a single reading
db.sensor_readings.insertOne({
  timestamp: new Date(),
  metadata: {
    sensorId: "sensor-001",
    location: "warehouse-A",
    unit: "celsius"
  },
  temperature: 23.5,
  humidity: 65.2
})

// Bulk insert (efficient - triggers bucket compression)
const readings = [];
const now = new Date();

for (let i = 0; i < 1000; i++) {
  readings.push({
    timestamp: new Date(now.getTime() - i * 60000),  // every minute
    metadata: { sensorId: "sensor-001", location: "warehouse-A" },
    temperature: 20 + Math.random() * 10,
    humidity: 60 + Math.random() * 20
  });
}

db.sensor_readings.insertMany(readings)
```

## Step 3: Query Time Series Data

Standard MongoDB queries work on time series collections:

```javascript
// Find recent readings for a specific sensor
db.sensor_readings.find({
  "metadata.sensorId": "sensor-001",
  timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
}).sort({ timestamp: -1 })

// Query with temperature threshold
db.sensor_readings.find({
  "metadata.location": "warehouse-A",
  temperature: { $gt: 30 },
  timestamp: {
    $gte: new Date("2024-01-01"),
    $lt: new Date("2024-02-01")
  }
})
```

## Step 4: Aggregate Time Series Data

```javascript
// Average temperature per hour for the last 24 hours
db.sensor_readings.aggregate([
  {
    $match: {
      "metadata.sensorId": "sensor-001",
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day: { $dayOfMonth: "$timestamp" },
        hour: { $hour: "$timestamp" }
      },
      avgTemperature: { $avg: "$temperature" },
      maxTemperature: { $max: "$temperature" },
      minTemperature: { $min: "$temperature" },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
])
```

## Step 5: Add a TTL to Auto-Expire Old Data

```javascript
db.createCollection("sensor_readings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds"
  },
  expireAfterSeconds: 7776000  // 90 days
})
```

Or add TTL to an existing time series collection:

```javascript
db.runCommand({
  collMod: "sensor_readings",
  expireAfterSeconds: 7776000
})
```

## Step 6: List and Describe Time Series Collections

```javascript
// List all time series collections
db.getCollectionInfos({ type: "timeseries" })

// Check collection options
db.getCollectionInfos({ name: "sensor_readings" })[0].options
```

Output:

```javascript
{
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds",
    bucketMaxSpanSeconds: 3600,
    bucketRoundingSeconds: 3600
  }
}
```

## Step 7: Create Secondary Indexes

Create indexes on metaField sub-fields for faster queries (supported since MongoDB 5.0; measurement field indexes require 6.0+):

```javascript
db.sensor_readings.createIndex({ "metadata.sensorId": 1, timestamp: 1 })
db.sensor_readings.createIndex({ "metadata.location": 1, timestamp: -1 })
```

## Data Modeling Best Practices

Always put sensor/device identifiers in the `metaField`:

```javascript
// GOOD - sensorId in metadata
{
  timestamp: new Date(),
  metadata: { sensorId: "s001", type: "temperature", building: "HQ" },
  value: 22.5
}

// BAD - sensorId at root level (degrades compression)
{
  timestamp: new Date(),
  sensorId: "s001",
  type: "temperature",
  value: 22.5
}
```

Put all fields that identify the series in `metaField` and all measured values at the root level.

## Summary

Time series collections store timestamped data with 50-90% better compression than regular collections. Create them with `createCollection` specifying `timeseries.timeField` and optionally `metaField` and `granularity`. Insert documents with a Date in the time field and series identifiers (device ID, sensor ID) in the metadata field. Query and aggregate with standard MongoDB syntax, add TTL for automatic data expiry, and create secondary indexes on metadata fields for fast time-range queries per device.
