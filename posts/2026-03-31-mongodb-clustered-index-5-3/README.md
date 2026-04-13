# How to Create a Clustered Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Clustered Index, Performance, Storage

Description: Learn how to create a clustered collection in MongoDB, a feature introduced in 5.3 and available in later releases, to store documents ordered by _id for efficient range scans.

---

MongoDB 5.3 introduced clustered indexes, a storage-level feature that physically orders documents in the collection by the clustered key. This is different from regular indexes, which are separate B-tree structures pointing back to the data.

## What is a Clustered Index?

In a clustered collection:
- Documents are stored on disk in clustered key order
- The clustered key serves as the `_id` field
- Range scans on the clustered key avoid random I/O
- There is no separate index structure for the `_id` field - the collection IS the index

This is particularly valuable for time-series or sequential access patterns.

## Creating a Clustered Collection

A clustered index is specified at collection creation time and cannot be added to an existing collection:

```javascript
db.createCollection("sensorReadings", {
  clusteredIndex: {
    key: { _id: 1 },
    unique: true,
    name: "clusterIdx"
  }
})
```

Currently, the clustered key must be `{ _id: 1 }`. MongoDB does not support clustering on arbitrary fields for general collections (time series collections handle this differently via `timeField`).

## Inserting Data

Insert data as usual. For time-ordered access patterns, use timestamps or sequential ObjectIDs as `_id`:

```javascript
db.sensorReadings.insertMany([
  { _id: new Date("2025-01-01T00:00:00Z"), sensorId: "s1", value: 23.4 },
  { _id: new Date("2025-01-01T00:01:00Z"), sensorId: "s1", value: 23.7 },
  { _id: new Date("2025-01-01T00:02:00Z"), sensorId: "s1", value: 23.5 }
])
```

## Querying with Range Scans

Range queries on `_id` in a clustered collection are highly efficient because documents are physically adjacent on disk:

```javascript
db.sensorReadings.find({
  _id: {
    $gte: new Date("2025-01-01T00:00:00Z"),
    $lt: new Date("2025-01-02T00:00:00Z")
  }
})
```

This query reads a contiguous block of storage rather than jumping around via a secondary index.

## Verifying Clustered Index

Use `listCollections` to inspect the collection metadata and confirm the `clusteredIndex` settings:

```javascript
db.runCommand({ listCollections: 1, filter: { name: "sensorReadings" } })
```

Check the collection's `options.clusteredIndex` block in the output for the key, name, and uniqueness settings.

## Adding Secondary Indexes

You can still create secondary indexes on clustered collections:

```javascript
db.sensorReadings.createIndex({ sensorId: 1, _id: 1 })
```

Secondary indexes on clustered collections store the clustered key value (the `_id` field) as the record locator instead of a compact internal RecordId. This means secondary indexes on clustered collections may be slightly larger than on non-clustered collections, especially with large `_id` values. The overall storage savings come from eliminating the separate `_id` index entirely.

## Clustered vs Regular Collections - When to Choose

| Scenario | Use Clustered |
|----------|--------------|
| Primary access is by `_id` range | Yes |
| Time-series / sequential inserts | Yes |
| Random `_id` lookups dominate | No (no benefit) |
| Need to cluster on non-`_id` field | Not supported |

## TTL with Clustered Collections

Clustered collections support TTL-like expiration natively via `expireAfterSeconds` without a separate TTL index:

```javascript
db.createCollection("sessionLogs", {
  clusteredIndex: { key: { _id: 1 }, unique: true },
  expireAfterSeconds: 3600
})
```

When `_id` is a date, MongoDB automatically expires documents older than the specified seconds.

## Summary

Clustered collections in MongoDB, introduced in 5.3 and available in later releases, co-locate documents on disk by the `_id` key. They are best suited for time-ordered or sequential data accessed primarily by `_id` ranges. Combined with `expireAfterSeconds` on date-based `_id` values, they provide an efficient alternative to maintaining a separate TTL index for simpler use cases.
