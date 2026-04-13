# How to Design an IoT Dashboard Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, IoT, Schema Design, Time Series, Data Modeling

Description: Learn how to design a MongoDB schema for an IoT dashboard including devices, telemetry time series, alerts, and aggregated metrics using the time series collection type.

---

## Overview

IoT dashboards require storing device metadata, high-frequency sensor readings, alert events, and aggregated summaries. MongoDB's time series collections (introduced in 5.0) are purpose-built for sensor telemetry workloads.

## Devices Collection

```javascript
db.devices.insertOne({
  _id: ObjectId(),
  deviceId: "sensor-floor1-001",
  name: "Floor 1 Temperature Sensor",
  type: "temperature",
  location: {
    building: "HQ",
    floor: 1,
    zone: "A",
    coordinates: { lat: 37.7749, lng: -122.4194 }
  },
  firmware: "v2.3.1",
  status: "active",
  lastSeenAt: new Date(),
  tags: ["hvac", "zone-a"],
  config: {
    reportingIntervalSeconds: 60,
    alertThresholds: { high: 30, low: 15 }
  },
  registeredAt: new Date("2024-06-01")
})

db.devices.createIndex({ deviceId: 1 }, { unique: true })
db.devices.createIndex({ "location.building": 1, "location.floor": 1 })
db.devices.createIndex({ status: 1 })
```

## Telemetry with Time Series Collections (MongoDB 5.0+)

Create a time series collection for sensor readings:

```javascript
db.createCollection("telemetry", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"
  },
  expireAfterSeconds: 7776000  // 90 days retention
})
```

Insert telemetry readings:

```javascript
db.telemetry.insertMany([
  {
    timestamp: new Date("2026-03-31T10:00:00Z"),
    metadata: {
      deviceId: "sensor-floor1-001",
      type: "temperature",
      building: "HQ",
      floor: 1
    },
    temperature: 22.4,
    humidity: 55.2,
    batteryLevel: 87
  },
  {
    timestamp: new Date("2026-03-31T10:01:00Z"),
    metadata: {
      deviceId: "sensor-floor1-001",
      type: "temperature",
      building: "HQ",
      floor: 1
    },
    temperature: 22.6,
    humidity: 55.0,
    batteryLevel: 87
  }
])
```

## Querying Recent Telemetry

```javascript
// Get last 1 hour of readings for a device
db.telemetry.find({
  "metadata.deviceId": "sensor-floor1-001",
  timestamp: { $gte: new Date(Date.now() - 3600000) }
}).sort({ timestamp: -1 })
```

## Aggregating Telemetry for Dashboard Charts

```javascript
// Average temperature per 5-minute bucket for the last 24 hours
db.telemetry.aggregate([
  {
    $match: {
      "metadata.deviceId": "sensor-floor1-001",
      timestamp: { $gte: new Date(Date.now() - 86400000) }
    }
  },
  {
    $group: {
      _id: {
        $dateTrunc: { date: "$timestamp", unit: "minute", binSize: 5 }
      },
      avgTemp: { $avg: "$temperature" },
      maxTemp: { $max: "$temperature" },
      minTemp: { $min: "$temperature" }
    }
  },
  { $sort: { _id: 1 } }
])
```

## Alerts Collection

```javascript
db.alerts.insertOne({
  _id: ObjectId(),
  deviceId: "sensor-floor1-001",
  type: "threshold_exceeded",
  severity: "warning",
  metric: "temperature",
  value: 31.5,
  threshold: 30,
  triggeredAt: new Date(),
  resolvedAt: null,
  acknowledgedBy: null,
  message: "Temperature exceeded high threshold of 30C"
})

db.alerts.createIndex({ deviceId: 1, triggeredAt: -1 })
db.alerts.createIndex({ resolvedAt: 1, severity: 1 })
db.alerts.createIndex({ triggeredAt: 1 }, { expireAfterSeconds: 2592000 })
```

## Device Summary Metrics (Materialized)

Pre-aggregate daily summaries for fast dashboard loading:

```javascript
db.deviceDailySummary.insertOne({
  deviceId: "sensor-floor1-001",
  date: new Date("2026-03-30"),
  temperature: { avg: 22.3, min: 19.1, max: 28.7, stdDev: 1.8 },
  humidity: { avg: 54.0, min: 48.0, max: 61.0 },
  readingCount: 1440,
  alertCount: 2,
  uptimePercent: 99.9
})

db.deviceDailySummary.createIndex({ deviceId: 1, date: -1 })
```

## Fleet Overview Query

```javascript
// Current status summary for all active devices in a building
db.devices.aggregate([
  { $match: { status: "active", "location.building": "HQ" } },
  {
    $lookup: {
      from: "telemetry",
      let: { devId: "$deviceId" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$metadata.deviceId", "$$devId"] },
            timestamp: { $gte: new Date(Date.now() - 300000) }
          }
        },
        { $sort: { timestamp: -1 } },
        { $limit: 1 }
      ],
      as: "latestReading"
    }
  },
  { $unwind: { path: "$latestReading", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      deviceId: 1,
      name: 1,
      floor: "$location.floor",
      latestTemp: "$latestReading.temperature",
      lastSeen: "$latestReading.timestamp"
    }
  }
])
```

## Summary

Design a MongoDB IoT dashboard schema using a time series collection for high-frequency telemetry, a devices collection for metadata, an alerts collection for events, and a daily summary collection for pre-aggregated metrics. Use `$dateTrunc` with `$group` for time-bucketed dashboard charts, and TTL indexes to automatically expire old readings and alerts.
