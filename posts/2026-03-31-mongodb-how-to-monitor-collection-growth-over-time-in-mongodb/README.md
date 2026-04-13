# How to Monitor Collection Growth Over Time in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Storage, Collection Stats, Operation

Description: Learn how to track MongoDB collection growth using stats commands, change streams, and scheduled snapshots to forecast storage needs.

---

## Why Monitor Collection Growth?

Understanding how your MongoDB collections grow over time helps you:
- Plan disk capacity before you run out
- Identify unexpected data accumulation
- Optimize TTL indexes and data retention policies
- Detect runaway write patterns from application bugs

## Getting Current Collection Size

```javascript
// Basic stats for a collection
db.orders.stats({ scale: 1048576 })  // scale to MB
/*
{
  ns: "mydb.orders",
  count: 1524891,
  size: 3084.5,          // total uncompressed size in MB
  storageSize: 1024.2,   // compressed size on disk in MB
  avgObjSize: 2129,      // average document size in bytes
  totalIndexSize: 148.3, // index storage in MB
  indexSizes: { _id_: 42.1, status_1_createdAt_-1: 106.2 }
}
*/
```

## Snapshot Growth Over Time

Create a collection to store periodic snapshots:

```javascript
// Create collection for storing snapshots
db.createCollection("collectionGrowthLog")
db.collectionGrowthLog.createIndex({ collectionName: 1, timestamp: 1 })

// Take a snapshot function
function snapshotCollectionGrowth(db, collectionNames) {
  const records = []

  collectionNames.forEach(name => {
    try {
      const stats = db.getCollection(name).stats({ scale: 1048576 })
      records.push({
        collectionName: name,
        timestamp: new Date(),
        documentCount: stats.count,
        dataSizeMB: stats.size,
        storageSizeMB: stats.storageSize,
        indexSizeMB: stats.totalIndexSize,
        avgDocSizeBytes: stats.avgObjSize
      })
    } catch (e) {
      records.push({ collectionName: name, timestamp: new Date(), error: e.message })
    }
  })

  db.collectionGrowthLog.insertMany(records)
  return records
}

// Take a snapshot now
snapshotCollectionGrowth(db, ["orders", "users", "events", "logs"])
```

## Scheduled Snapshots with Atlas Triggers

In MongoDB Atlas, create a scheduled trigger to run snapshots automatically:

```javascript
// Atlas Trigger - Scheduled (runs every hour)
exports = async function() {
  const cluster = context.services.get("mongodb-atlas")
  const db = cluster.db("mydb")

  const collections = ["orders", "users", "events"]

  const records = []
  for (const name of collections) {
    const stats = await db.command({ collStats: name })
    records.push({
      collectionName: name,
      timestamp: new Date(),
      documentCount: stats.count,
      storageSizeMB: Math.round(stats.storageSize / 1048576 * 100) / 100,
      dataSizeMB: Math.round(stats.size / 1048576 * 100) / 100
    })
  }

  await db.collection("collectionGrowthLog").insertMany(records)
}
```

## Analyzing Growth Trends

Query snapshots to understand growth rate:

```javascript
// Daily growth for the orders collection over the last 30 days
db.collectionGrowthLog.aggregate([
  {
    $match: {
      collectionName: "orders",
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) }
    }
  },
  { $sort: { timestamp: 1 } },
  {
    $group: {
      _id: {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day: { $dayOfMonth: "$timestamp" }
      },
      maxCount: { $max: "$documentCount" },
      maxStorageMB: { $max: "$storageSizeMB" },
      sampleTime: { $last: "$timestamp" }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  {
    $setWindowFields: {
      sortBy: { sampleTime: 1 },
      output: {
        prevDayCount: {
          $shift: { output: "$maxCount", by: -1 }
        }
      }
    }
  },
  {
    $addFields: {
      dailyDocGrowth: { $subtract: ["$maxCount", "$prevDayCount"] }
    }
  }
])
```

## Estimating Future Size

```javascript
// Calculate documents per day for growth projection
db.collectionGrowthLog.aggregate([
  { $match: { collectionName: "orders" } },
  { $sort: { timestamp: -1 } },
  { $limit: 2 },
  {
    $group: {
      _id: null,
      latest: { $first: "$documentCount" },
      oldest: { $last: "$documentCount" },
      latestTime: { $first: "$timestamp" },
      oldestTime: { $last: "$timestamp" }
    }
  },
  {
    $project: {
      docsPerDay: {
        $divide: [
          { $subtract: ["$latest", "$oldest"] },
          { $divide: [{ $subtract: ["$latestTime", "$oldestTime"] }, 86400000] }
        ]
      },
      currentCount: "$latest",
      currentTime: "$latestTime"
    }
  }
])
```

## Monitoring with dbStats

For overall database size:

```javascript
// Database-level stats
db.stats({ scale: 1048576 })
/*
{
  db: "mydb",
  collections: 12,
  objects: 5821423,
  dataSize: 12847.3,    // MB
  storageSize: 4215.8,  // MB
  indexes: 28,
  indexSize: 892.1      // MB
}
*/

// List all collections sorted by size
const collStats = db.getCollectionNames().map(name => {
  const s = db.getCollection(name).stats({ scale: 1 })
  return { name, storageSizeKB: s.storageSize / 1024, count: s.count }
})
collStats.sort((a, b) => b.storageSizeKB - a.storageSizeKB)
collStats.slice(0, 10).forEach(c =>
  print(`${c.name}: ${c.storageSizeKB.toFixed(1)} KB, ${c.count} docs`)
)
```

## Setting Up Alerts

Alert when a collection exceeds a size threshold:

```javascript
// Atlas Trigger or cron job
async function checkSizeAlerts(db, thresholds) {
  for (const [collName, maxSizeMB] of Object.entries(thresholds)) {
    const stats = db.getCollection(collName).stats({ scale: 1048576 })
    const sizeMB = stats.storageSize

    if (sizeMB > maxSizeMB) {
      console.error(`ALERT: ${collName} is ${sizeMB.toFixed(1)}MB, exceeds threshold of ${maxSizeMB}MB`)
      // Send notification via webhook, email, etc.
    }
  }
}

checkSizeAlerts(db, {
  orders: 5000,   // alert if orders > 5GB
  logs: 2000,     // alert if logs > 2GB
  events: 10000   // alert if events > 10GB
})
```

## Summary

Monitor MongoDB collection growth by regularly capturing snapshots using `collection.stats()` and storing them in a dedicated logging collection. Analyze trends with aggregation pipelines to compute daily growth rates and project future storage needs. Use Atlas Scheduled Triggers for automated snapshot collection and build alerting logic to notify teams when collections approach capacity thresholds.
