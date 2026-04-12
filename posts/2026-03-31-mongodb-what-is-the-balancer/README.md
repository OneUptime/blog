# What Is the MongoDB Balancer and How It Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Balancer, Sharding, Chunk, Sharded Cluster

Description: The MongoDB balancer is a background process that migrates chunks between shards to ensure data is evenly distributed across a sharded cluster.

---

## Overview

When you shard a MongoDB collection, data is divided into logical units called chunks. Over time, certain shards may accumulate more chunks than others - especially after bulk loads or when data is inserted with a monotonically increasing shard key. The balancer is the automated component that watches chunk distribution and migrates chunks between shards to keep the cluster balanced.

## How the Balancer Works

The balancer runs on the config server primary (in versions before MongoDB 3.4, it ran on one of the `mongos` instances). It continuously monitors the number of chunks on each shard. When the difference between the shard with the most chunks and the shard with the fewest exceeds a migration threshold, the balancer initiates a chunk migration.

A chunk migration:
1. Copies the chunk's documents from the source shard to the destination shard
2. Updates the chunk metadata on the config servers so queries are routed to the destination shard
3. Cleans up the orphaned documents from the source shard asynchronously

During migration, reads and writes continue to be served. The balancer is designed to minimize impact on production traffic.

## Checking Balancer Status

```javascript
// Check if the balancer is enabled
sh.getBalancerState()

// Check if balancing is currently running
sh.isBalancerRunning()

// View recent balancer activity
use config
db.changelog.find({ what: "moveChunk.from" }).sort({ time: -1 }).limit(5)
```

## Enabling and Disabling the Balancer

You may want to disable the balancer during maintenance windows or bulk imports:

```javascript
// Disable the balancer
sh.stopBalancer()

// Re-enable the balancer
sh.startBalancer()

// Wait for any in-progress migrations to complete before disabling
sh.stopBalancer(60000) // timeout in ms
```

## Balancer Window

To restrict balancing to off-peak hours, configure a balancer window:

```javascript
use config
db.settings.updateOne(
  { _id: "balancer" },
  {
    $set: {
      activeWindow: {
        start: "23:00",
        stop: "06:00"
      }
    }
  },
  { upsert: true }
)
```

## Chunk Size and Migration Thresholds

The default chunk size is 128 MB. Smaller chunks mean more migrations but finer granularity. You can adjust it:

```javascript
use config
db.settings.updateOne(
  { _id: "chunksize" },
  { $set: { value: 64 } }, // size in MB
  { upsert: true }
)
```

The migration threshold varies by number of chunks: if a shard has fewer than 20 chunks, the threshold is 2; up to 80 chunks, it is 4; above 80 chunks, it is 8.

## Monitoring Chunk Distribution

```javascript
// See chunk distribution across shards
sh.status()

// More detailed view
use config
db.chunks.aggregate([
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])
```

## Summary

The MongoDB balancer automatically distributes chunks across shards to prevent hot spots and ensure even storage and query load. It runs continuously in the background, migrates chunks when imbalances exceed thresholds, and can be scheduled to a maintenance window. Understanding the balancer is essential for operating a healthy sharded MongoDB cluster.
