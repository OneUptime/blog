# How to Shard Time Series Collections in MongoDB 8.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Time Series, Sharding, Scalability, MongoDB 8.0

Description: Configure sharding for MongoDB time series collections in MongoDB 8.0 to scale write throughput and storage across multiple shards using metaField-based shard keys.

---

MongoDB 8.0 significantly improved sharding support for time series collections. You can now shard a time series collection on a metaField subfield, a combination of metaField subfields, or a hashed metaField - enabling horizontal scaling for high-volume IoT, metrics, and event data.

## Prerequisites

- MongoDB 8.0 sharded cluster
- Sharding enabled on the database
- Time series collection created with a `metaField`

## Creating a Shardable Time Series Collection

```javascript
db.createCollection("sensorReadings", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds"
  }
});
```

## Sharding the Time Series Collection

In MongoDB 8.0, you can shard on a metaField subfield. Starting in MongoDB 6.0, you no longer need to call `sh.enableSharding()` - databases are automatically enabled for sharding.

Starting in MongoDB 8.0, shard keys containing the `timeField` are deprecated. Use only `metaField` subfields for the shard key:

```javascript
// Shard by a subfield of the metaField
sh.shardCollection("iot.sensorReadings", {
  "metadata.region": 1
});
```

This routes writes for the same region to the same shard, improving bucket fill efficiency and reducing cross-shard operations for region-scoped queries.

## Using Hashed Sharding for Even Distribution

If writes are highly concentrated on a few metaField values, use hashed sharding to distribute them evenly:

```javascript
sh.shardCollection("iot.sensorReadings", {
  "metadata.sensorId": "hashed"
});
```

**Trade-off:** Hashed sharding distributes writes evenly but scatter-gathers queries that do not include `metadata.sensorId` in the predicate.

## Verifying Shard Distribution

```javascript
// Check chunk distribution
sh.status();

// Check collection stats per shard
db.sensorReadings.getShardDistribution();
```

Aim for even document counts across shards. Large imbalances indicate a poor shard key choice or jumbo chunks.

## Pre-Splitting Chunks for Known MetaField Values

If you know the set of regions or sensor groups in advance, pre-split chunks before inserting data to avoid the initial hotspot on the primary shard:

```javascript
const regions = ["us-east", "us-west", "eu-central", "ap-southeast"];

for (const region of regions) {
  sh.splitAt("iot.sensorReadings", {
    "metadata.region": region
  });
}

// Move chunks to specific shards
sh.moveChunk("iot.sensorReadings", { "metadata.region": "eu-central" }, "shard2");
```

## Zone Sharding Limitation

Zone sharding is **not supported** for time series collections. The balancer always distributes data in sharded time series collections evenly across all shards in the cluster. If you need data locality for time series workloads, consider using separate sharded clusters per region instead.

## Query Routing

Queries that include the shard key field are routed to specific shards. Queries without it are broadcast to all shards:

```javascript
// Targeted query (includes shard key - fast)
db.sensorReadings.find({
  "metadata.region": "us-east",
  timestamp: { $gte: ISODate("2026-03-31T00:00:00Z") }
});

// Scatter-gather query (missing shard key - slower)
db.sensorReadings.find({
  timestamp: { $gte: ISODate("2026-03-31T00:00:00Z") },
  temperature: { $gt: 80 }
});
```

## Summary

MongoDB 8.0 enables sharding time series collections on metaField subfields, allowing horizontal scaling for high-volume workloads. Note that shard keys containing the `timeField` are deprecated in MongoDB 8.0 - use only `metaField` subfields. Choose a shard key that balances write distribution and query targeting - range-based sharding on a low-cardinality field like region works well for geo-scoped queries, while hashed sharding on a high-cardinality field ensures even distribution at the cost of scatter-gather reads.
