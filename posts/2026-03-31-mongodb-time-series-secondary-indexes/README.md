# How to Use Secondary Indexes on Time Series Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Series, Index, Query Performance, Secondary Index

Description: Create and use secondary indexes on MongoDB time series collections to accelerate queries that filter on measurement values, metaField subfields, and computed fields.

---

MongoDB time series collections automatically create a clustered index on `(metaField, timeField)`. For queries that filter on measurement values or additional metaField subfields not covered by the default index, you can add secondary indexes.

## What Indexes are Created Automatically?

When you create a time series collection, MongoDB automatically creates:
- A clustered index on the internal bucket document's `(meta, control.min.time, control.max.time)` fields
- This supports queries filtering by metaField value and time range

```javascript
// This query uses the automatic clustered index
db.sensorReadings.find({
  "metadata.sensorId": "sensor-42",
  timestamp: { $gte: ISODate("2026-03-31T00:00:00Z") }
});
```

## Checking Existing Indexes

```javascript
db.sensorReadings.getIndexes();
// Shows the default clustered index on the bucket collection
```

## Creating a Secondary Index on a MetaField Subfield

If you frequently filter on multiple metaField subfields, add a compound index:

```javascript
// Index for queries filtering by location AND sensorId
db.sensorReadings.createIndex({
  "metadata.location": 1,
  "metadata.sensorId": 1,
  "timestamp": 1
});
```

Query that uses this index:

```javascript
db.sensorReadings.find({
  "metadata.location": "warehouse-north",
  "metadata.sensorId": "sensor-42",
  timestamp: { $gte: ISODate("2026-03-31T00:00:00Z") }
});
```

## Creating an Index on Measurement Values

Secondary indexes can cover measurement fields, which is useful for threshold-based queries:

```javascript
// Index for queries finding high temperature readings
db.sensorReadings.createIndex({ temperature: 1 });

// Query that uses this index
db.sensorReadings.find({ temperature: { $gt: 90 } });
```

Note: For time series collections, MongoDB indexes measurement fields at the bucket level using `control.min` and `control.max` values. A bucket is only scanned if its `control.max.temperature` is above the threshold, significantly reducing the number of buckets opened.

## Partial Index for Alerting Queries

Reduce index size by indexing only the documents that match an alerting condition:

```javascript
db.sensorReadings.createIndex(
  { temperature: 1, "metadata.sensorId": 1 },
  {
    partialFilterExpression: { temperature: { $gt: 80 } }
  }
);
```

## Compound Index with Measurement and MetaField

```javascript
// Useful for per-sensor threshold queries
db.sensorReadings.createIndex({
  "metadata.sensorId": 1,
  temperature: -1,
  timestamp: -1
});

// Query: top 10 highest temperature readings per sensor in last hour
db.sensorReadings.aggregate([
  {
    $match: {
      "metadata.sensorId": "sensor-42",
      timestamp: { $gte: new Date(Date.now() - 3600000) }
    }
  },
  { $sort: { temperature: -1 } },
  { $limit: 10 }
]);
```

## Using explain() to Verify Index Usage

```javascript
db.sensorReadings.find({
  "metadata.location": "warehouse-north",
  temperature: { $gt: 80 }
}).explain("executionStats");
```

Look for `IXSCAN` in the winning plan and check `totalDocsExamined` vs `totalDocsReturned`. A high ratio indicates the index is not selective enough or the query needs a better index.

## Index Limitations on Time Series Collections

- Text indexes are not supported on time series collections. 2dsphere indexes are supported on metaField subfields (MongoDB 6.3+) but not on measurement fields. Check the release notes for your version.
- Wildcard indexes are not supported on time series collections.
- You cannot create a unique index on a time series collection.

## Dropping Unused Indexes

```javascript
// Check index usage statistics
db.sensorReadings.aggregate([{ $indexStats: {} }]);

// Drop an index if accesses is 0 or very low
db.sensorReadings.dropIndex("temperature_1");
```

## Summary

MongoDB time series collections support secondary indexes on metaField subfields and measurement values, in addition to the automatic clustered index. Add indexes when queries filter on measurement thresholds or additional metadata dimensions. Use `explain()` to verify index usage, partial indexes to reduce index size for alerting queries, and `$indexStats` to identify and remove unused indexes.
