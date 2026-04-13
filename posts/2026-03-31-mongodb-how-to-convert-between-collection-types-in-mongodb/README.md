# How to Convert Between Collection Types in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Migration, Capped Collection, Time Series

Description: Learn how to convert regular MongoDB collections to capped or time series collections, and how to migrate data between collection types safely.

---

## Overview of Collection Types

MongoDB supports several collection types:
- **Regular collections** - default, flexible, no size limit
- **Capped collections** - fixed-size circular buffer
- **Time series collections** - optimized for time-stamped data
- **Clustered collections** - `_id`-ordered storage

Not all conversions are supported natively. This guide covers the supported paths and workarounds for the rest.

## Converting Regular to Capped

MongoDB provides a direct command to convert a regular collection to a capped collection:

```javascript
// Convert "logs" collection to a 50MB capped collection
db.runCommand({
  convertToCapped: "logs",
  size: 52428800  // 50MB in bytes
})
```

Important caveats:
- This acquires a database-level exclusive lock - run during maintenance
- Documents exceeding the cap are deleted starting from the oldest
- You cannot set a `max` document count during conversion (only size)
- Secondary indexes are not preserved - only the `_id` index is retained; recreate other indexes after conversion

```javascript
// Verify the conversion
db.logs.isCapped()           // true
db.getCollectionInfos({ name: "logs" })  // check options.capped
```

## Converting Capped Back to Regular

There is no direct command to un-cap a collection. You must recreate it:

```javascript
// Step 1: rename the capped collection
db.logs.renameCollection("logs_capped_backup")

// Step 2: create a new regular collection
db.createCollection("logs")

// Step 3: copy all documents
db.logs_capped_backup.find().forEach(doc => db.logs.insertOne(doc))

// Step 4: recreate indexes
db.logs.createIndex({ timestamp: -1 })
db.logs.createIndex({ level: 1, timestamp: -1 })

// Step 5: drop backup if satisfied
db.logs_capped_backup.drop()
```

## Converting Regular to Time Series

There is no direct conversion command. You must create a new time series collection and migrate data:

```javascript
// Step 1: create time series collection
db.createCollection("sensorReadingsTS", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"
  }
})

// Step 2: migrate data in batches
let batch = []
const BATCH_SIZE = 1000
db.sensorReadingsOld.find().forEach(doc => {
  // Transform document structure if needed
  batch.push({
    timestamp: doc.recordedAt,  // map old field to timeField
    metadata: { sensorId: doc.deviceId, location: doc.site },
    temperature: doc.temp,
    humidity: doc.hum
  })
  if (batch.length >= BATCH_SIZE) {
    db.sensorReadingsTS.insertMany(batch)
    batch = []
  }
})
if (batch.length > 0) {
  db.sensorReadingsTS.insertMany(batch)
}
```

## Converting Time Series Back to Regular

Time series collections also cannot be directly converted. Use the same recreate-and-migrate approach:

```javascript
// Create a new regular collection
db.createCollection("sensorReadingsFlat")

// Copy documents with optional transformation
db.sensorReadingsTS.find().forEach(doc => {
  db.sensorReadingsFlat.insertOne({
    deviceId: doc.metadata.sensorId,
    location: doc.metadata.location,
    recordedAt: doc.timestamp,
    temperature: doc.temperature,
    humidity: doc.humidity
  })
})
```

## Migrating While the App Is Running

For zero-downtime migrations, use a dual-write pattern:

```javascript
// Phase 1: write to both old and new collections
async function insertReading(reading) {
  await Promise.all([
    db.collection("sensorReadingsOld").insertOne(reading),
    db.collection("sensorReadingsTS").insertOne({
      timestamp: reading.timestamp,
      metadata: { sensorId: reading.sensorId },
      value: reading.value
    })
  ])
}

// Phase 2: backfill historical data
// Phase 3: switch reads to new collection
// Phase 4: stop writing to old collection
// Phase 5: drop old collection
```

## Validating After Conversion

```javascript
// Count documents to verify no data loss
const oldCount = db.sensorReadingsOld.countDocuments()
const newCount = db.sensorReadingsTS.countDocuments()
console.log(`Old: ${oldCount}, New: ${newCount}`)

// Spot check a few documents
db.sensorReadingsTS.findOne({ "metadata.sensorId": "sensor-001" })

// Compare storage size
db.sensorReadingsOld.stats({ scale: 1048576 }).storageSize
db.sensorReadingsTS.stats({ scale: 1048576 }).storageSize
```

## Summary

MongoDB does not support direct conversion between most collection types. Converting regular collections to capped is the only built-in command. For all other conversions - especially to time series - you must create the target collection and migrate documents in batches. Always validate document counts and spot-check data integrity after migration, and use dual-write patterns for zero-downtime migrations in production.
