# How to Optimize Compression for Time Series Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Series, Compression, Storage, WiredTiger

Description: Optimize MongoDB time series collection compression by tuning bucket size, granularity, metaField cardinality, and WiredTiger settings to minimize storage usage.

---

MongoDB time series collections use a column-oriented bucket format internally. When configured correctly, numeric sensor data compresses at ratios of 5-20x compared to regular collections. Poor configuration can negate most of these gains.

## How MongoDB Compresses Time Series Data

MongoDB groups measurements into "bucket" documents. Each bucket holds up to 1,000 measurements for the same metaField value within a time window. Inside the bucket, values for each field are stored column-wise - all `temperature` values together, all `humidity` values together - which makes delta encoding and Zstd compression extremely effective for numeric sequences.

## Checking Current Compression

```javascript
const stats = db.sensorReadings.stats({ scale: 1024 * 1024 });
console.log("Storage size (MB):", stats.storageSize);
console.log("Total index size (MB):", stats.totalIndexSize);
console.log("Average object size (B):", stats.avgObjSize);

// Check bucket-level stats
db.system.buckets.sensorReadings.stats();
```

You can also compare the logical data size against physical storage:

```javascript
const logicalSize = stats.size;        // sum of all document sizes
const physicalSize = stats.storageSize; // compressed on-disk size
console.log("Compression ratio:", (logicalSize / physicalSize).toFixed(1) + "x");
```

## Granularity Affects Bucket Time Spans

The `granularity` setting controls how wide the time window for each bucket is:

| Granularity | Max bucket span |
|-------------|----------------|
| `seconds` | 1 hour |
| `minutes` | 24 hours |
| `hours` | 30 days |

Buckets that are more full compress better. If your sensors write every second, use `seconds` granularity. If they write every 5 minutes, use `minutes`.

```javascript
// Correct granularity for 1-minute sampling
db.createCollection("hourlyMetrics", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"
  }
});
```

## MetaField Cardinality

High metaField cardinality means more buckets with fewer documents each, which reduces compression efficiency.

```text
1,000 sensors writing 1 reading/second:
  - With granularity "seconds": ~4 buckets per sensor per hour, ~900 docs/bucket (near the 1,000 cap - good compression)
  - With granularity "hours":   1 bucket per sensor per 30 days = 2,592,000 docs/bucket (far exceeds cap, splits frequently)
```

Target bucket fill rate of 80-100%. Monitor with:

```javascript
db.system.buckets.sensorReadings.aggregate([
  { $group: { _id: null, avgCount: { $avg: "$control.count" }, maxCount: { $max: "$control.count" } } }
]);
```

## WiredTiger Block Compressor

Time series collections default to Zstd compression since MongoDB 5.0. Verify and configure in `mongod.conf`:

```yaml
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: zstd
```

Zstd provides better compression than snappy for numeric sequences at comparable decompression speed.

## Avoiding Out-of-Order Inserts

Out-of-order inserts (backfill or late-arriving data) can reopen closed buckets or create new small buckets, degrading compression:

```javascript
// Bad: inserting with a timestamp 2 hours in the past for an active sensor
await collection.insertOne({
  timestamp: new Date(Date.now() - 7200000),  // 2 hours ago
  metadata: { sensorId: "s1" },
  temperature: 21.0
});
```

In MongoDB 6.3+, the `bucketRoundingSeconds` and `bucketMaxSpanSeconds` parameters give fine-grained control over bucket boundaries. For backfill operations, use a separate collection and merge after the fact.

## Running compact to Consolidate Buckets

After large backfills or collection migrations, run `compact` to rewrite fragmented buckets:

```javascript
db.runCommand({ compact: "sensorReadings" });
```

On standalone instances, `compact` blocks writes on the target collection. On replica sets, use rolling compaction (compact each member in turn).

## Storage Size Benchmarks

Typical compression ratios achieved in practice:

```text
Float fields (temperature, pressure)  ->  8-15x compression
Integer counters                       ->  10-20x compression
String fields (status, labels)         ->  2-5x compression (less compressible)
Mixed (numeric + string metaField)     ->  5-10x compression
```

## Summary

MongoDB time series compression is maximized when buckets are full: choose a granularity that matches your write frequency, keep metaField cardinality manageable, insert data in chronological order, and use Zstd as the block compressor. After backfills or migrations, run `compact` to consolidate fragmented buckets and reclaim disk space.
