# How to Optimize MongoDB for High Insert Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Performance, Insert, Throughput, Write Optimization

Description: Learn the key techniques to maximize MongoDB insert throughput including bulk writes, index reduction, write concern tuning, and WiredTiger cache configuration.

---

High insert workloads - IoT telemetry, event streams, log ingestion - demand careful MongoDB tuning. Default settings favor durability and consistency, not raw throughput. Here are the most impactful optimizations.

## 1. Use Bulk Inserts

Single-document inserts have per-round-trip overhead. Batch them:

```javascript
const docs = Array.from({ length: 1000 }, (_, i) => ({
  sensorId: `sensor_${i % 100}`,
  timestamp: new Date(),
  value: Math.random() * 100
}))

db.readings.insertMany(docs, { ordered: false })
```

`ordered: false` allows MongoDB to continue inserting after an error and enables parallel processing.

## 2. Reduce Index Count

Every index must be updated on each insert. Audit your indexes and remove unused ones:

```javascript
// Check index usage statistics
db.readings.aggregate([{ $indexStats: {} }])

// Drop indexes with zero accesses
db.readings.dropIndex("unused_field_1")
```

Keep only the indexes essential for read queries.

## 3. Tune Write Concern

For workloads where occasional data loss is tolerable (metrics, telemetry), reduce write concern:

```javascript
db.readings.insertMany(docs, {
  writeConcern: { w: 1, j: false }  // acknowledged by primary, no journal flush
})
```

For maximum throughput at the risk of potential data loss:

```javascript
db.readings.insertMany(docs, {
  writeConcern: { w: 0 }  // unacknowledged - fire and forget
})
```

Always match write concern to your durability requirements.

## 4. Use Time Series Collections for Timestamped Data

MongoDB time series collections have built-in optimizations for high-frequency inserts:

```javascript
db.createCollection("sensor_readings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "sensorId",
    granularity: "seconds"
  }
})
```

Time series collections compress data and reduce write amplification significantly for sensor-like workloads.

## 5. Disable the Profiler in Production

The query profiler adds overhead to every operation:

```javascript
db.setProfilingLevel(0)   // disable profiling
```

## 6. Shard the Collection

For multi-node deployments, shard on a high-cardinality, write-distributed key:

```javascript
sh.shardCollection("mydb.readings", { sensorId: "hashed" })
```

Hashed shard keys distribute inserts evenly across shards, preventing hot spots.

## 7. Configure WiredTiger Cache

Ensure WiredTiger has enough cache for your working set. Set in `mongod.conf`:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8   # typically 50% of available RAM
```

## 8. Pre-split Chunks on Sharded Clusters

Avoid chunk split storms during initial bulk loads. For hashed shard keys, specify `numInitialChunks` when sharding the collection:

```javascript
// Pre-split into 100 chunks distributed evenly across shards
sh.shardCollection("mydb.readings", { sensorId: "hashed" }, false, {
  numInitialChunks: 100
})
```

This replaces a plain `sh.shardCollection` call (as in step 6) and distributes chunks evenly across the hash space from the start.

## Summary

Maximize MongoDB insert throughput by batching with `insertMany` and `ordered: false`, minimizing index count, relaxing write concern for non-critical data, using time series collections for timestamped workloads, and sharding with hashed keys to distribute load evenly.
