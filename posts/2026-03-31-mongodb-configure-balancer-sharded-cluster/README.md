# How to Configure the Balancer in a MongoDB Sharded Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Balancer, Administration, Database

Description: Learn how to configure the MongoDB sharded cluster balancer, including enabling/disabling, scheduling maintenance windows, and tuning migration behavior.

---

The MongoDB balancer is a background process that migrates chunks between shards to maintain an even distribution. By default it runs continuously, but you can configure when it runs, how aggressively it migrates, and stop it during maintenance.

## Check Balancer State

```javascript
sh.getBalancerState()   // true = enabled, false = disabled
sh.isBalancerRunning()  // true = currently migrating chunks
```

## Enable and Disable the Balancer

```javascript
// Disable
sh.stopBalancer()

// Enable
sh.startBalancer()

// With timeout - wait up to 30s for current migration to finish
sh.stopBalancer(30000)
```

Disabling the balancer does not stop in-progress migrations immediately. It waits for the current migration round to complete.

## Set a Balancer Window

Schedule the balancer to run only during low-traffic hours to reduce production impact:

```javascript
use config
db.settings.updateOne(
  { _id: "balancer" },
  {
    $set: {
      activeWindow: {
        start: "01:00",   // 1 AM
        stop: "05:00"     // 5 AM
      }
    }
  },
  { upsert: true }
)
```

Times are in 24-hour `HH:MM` format. On MongoDB Atlas, times are interpreted as UTC. On self-managed deployments, times are relative to the time zone of the config server replica set primary. The balancer only migrates chunks during this window.

## Remove the Balancer Window

```javascript
use config
db.settings.updateOne(
  { _id: "balancer" },
  { $unset: { activeWindow: "" } }
)
```

## Configure Chunk Size

Smaller chunk sizes mean more chunks, more migrations, and finer distribution granularity:

```javascript
use config
db.settings.updateOne(
  { _id: "chunksize" },
  { $set: { value: 64 } },  // 64 MB (default is 128 MB)
  { upsert: true }
)
```

Changes are not applied retroactively to all existing chunks at once. They take effect gradually as chunks undergo split, merge, or migration operations. If you decrease the chunk size, existing oversized chunks split over time. If you increase it, existing chunks grow through inserts until they reach the new size.

## Disable Balancing for a Specific Collection

You can stop the balancer for one collection without affecting others:

```javascript
sh.disableBalancing("myapp.reports")
sh.enableBalancing("myapp.reports")
```

Or using the config database directly:

```javascript
use config
db.collections.updateOne(
  { _id: "myapp.reports" },
  { $set: { noBalance: true } }
)
```

## Monitor Balancer Activity

```javascript
// Check if the balancer is currently running
sh.isBalancerRunning()

// View migration history (switch to config database first)
use config
db.changelog.find({ what: /moveChunk/ }).sort({ time: -1 }).limit(10)

// Count migrations per hour
db.changelog.aggregate([
  { $match: { what: "moveChunk.from" } },
  { $group: {
    _id: { $dateToString: { format: "%Y-%m-%dT%H", date: "$time" } },
    count: { $sum: 1 }
  }},
  { $sort: { _id: -1 } }
])
```

## Balancer and Maintenance Windows

Always stop the balancer before performing maintenance that involves stopping or restarting shards:

```javascript
sh.stopBalancer()
// ... perform maintenance ...
sh.startBalancer()
```

This prevents incomplete migrations from leaving chunks in an inconsistent state.

## Automatic Balancing Thresholds

The balancer only migrates chunks when the data distribution across shards is sufficiently uneven. In MongoDB 6.0.3 and later, the balancer uses a data-size-based threshold: a collection is considered balanced when the data size difference between shards is less than three times the configured range size (e.g., 384 MB for the default 128 MB range size).

In earlier MongoDB versions (before 6.0.3), the balancer used chunk-count-based thresholds:

| Total Chunks | Migration Threshold |
|---|---|
| < 20 | 2 |
| 20 - 79 | 4 |
| >= 80 | 8 |

You cannot change these thresholds directly.

## Summary

The MongoDB balancer runs automatically to keep chunk distribution even. Configure a maintenance window with `activeWindow` to limit migrations to off-peak hours. Disable balancing per-collection for collections where migration impact outweighs distribution benefits. Always stop the balancer during shard maintenance and monitor `config.changelog` for migration history and frequency.

