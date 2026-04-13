# How to Migrate from Regular Collections to Time Series in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Series, Migration, Schema Design, Performance

Description: Migrate an existing MongoDB regular collection to a time series collection to reduce storage, improve query performance, and enable time-series-specific operators.

---

If you have a regular MongoDB collection storing time-stamped documents (sensor data, metrics, logs), migrating to a time series collection can reduce storage by 50-90% through bucket compression and speed up range queries significantly. Time series collections cannot be converted in-place - you must create a new collection and copy data into it.

## Step 1: Understand Your Current Schema

```javascript
// Sample documents from a regular collection
db.metrics.findOne();
// {
//   "_id": ObjectId("..."),
//   "host": "web-01",
//   "region": "us-east",
//   "recordedAt": ISODate("2026-03-31T10:00:00Z"),
//   "cpuPercent": 42.5,
//   "memPercent": 67.3
// }
```

Identify:
- The timestamp field (`recordedAt`)
- Fields that identify the source/context (`host`, `region`) - these become the metaField
- Measurement values (`cpuPercent`, `memPercent`)

## Step 2: Create the Time Series Collection

```javascript
db.createCollection("metrics_ts", {
  timeseries: {
    timeField: "recordedAt",
    metaField: "metadata",
    granularity: "seconds"
  },
  expireAfterSeconds: 7776000  // optional: 90-day TTL
});
```

## Step 3: Migrate Data with Batched Inserts

MongoDB does not allow `$merge` to write into a time series collection. Use batched inserts to transform and copy documents from the old collection to the new one:

```javascript
const BATCH_SIZE = 10000;
let lastId = null;

while (true) {
  const query = lastId ? { _id: { $gt: lastId } } : {};
  const batch = await db.collection("metrics").find(query)
    .sort({ _id: 1 })
    .limit(BATCH_SIZE)
    .toArray();

  if (batch.length === 0) break;

  const transformed = batch.map((doc) => ({
    recordedAt: doc.recordedAt,
    metadata: { host: doc.host, region: doc.region },
    cpuPercent: doc.cpuPercent,
    memPercent: doc.memPercent
  }));

  await db.collection("metrics_ts").insertMany(transformed, { ordered: false });
  lastId = batch[batch.length - 1]._id;
  console.log(`Migrated up to _id: ${lastId}`);
}
```

## Step 4: Verify Row Count and Data Integrity

```javascript
const originalCount = await db.collection("metrics").countDocuments();
const tsCount = await db.collection("metrics_ts").countDocuments();

console.log(`Original: ${originalCount}, Time Series: ${tsCount}`);
console.assert(originalCount === tsCount, "Row count mismatch!");

// Spot-check a few documents
const sample = await db.collection("metrics_ts").findOne({
  "metadata.host": "web-01",
  recordedAt: ISODate("2026-03-31T10:00:00Z")
});
console.log(sample);
```

## Step 5: Update Application Code

Change your application queries to use the new field structure:

```javascript
// Old query
db.metrics.find({ host: "web-01", recordedAt: { $gte: start } });

// New query
db.metrics_ts.find({ "metadata.host": "web-01", recordedAt: { $gte: start } });
```

## Step 6: Switch Over and Drop Old Collection

Once the new collection is verified and your application is updated:

```javascript
// Rename the old regular collection out of the way
db.metrics.renameCollection("metrics_old");

// Time series collections cannot be renamed, so update your application
// to query "metrics_ts" directly, or create a view as an alias:
db.createView("metrics", "metrics_ts", []);

// After confirming the new setup works in production, drop the old one
db.metrics_old.drop();
```

## Storage Comparison

```javascript
// Compare storage before and after
db.metrics_old.aggregate([{ $collStats: { storageStats: {} } }]);
db.metrics_ts.aggregate([{ $collStats: { storageStats: {} } }]);
```

Typical compression ratios are 5-10x for numeric time series data with a well-designed metaField.

## Summary

Migrating from a regular collection to a time series collection involves creating the new collection with the correct `timeField`, `metaField`, and `granularity`, then copying documents with a shape transformation using batched inserts. Verify row counts and data integrity before switching application queries. Since time series collections cannot be renamed, update your application to use the new collection name or create a view as an alias, then drop the old collection after a successful cutover.
