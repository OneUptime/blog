# How to Handle Hot Shard Problems in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Hot Shard, Performance, Balancer

Description: Learn how to identify hot shard problems in MongoDB sharded clusters and apply strategies to redistribute load including chunk splitting and shard key changes.

---

## Overview

A hot shard occurs when one shard in a MongoDB cluster receives a disproportionate share of reads or writes compared to other shards. This bottleneck limits overall cluster throughput and can cause latency spikes, CPU saturation, and disk I/O pressure on the affected shard while other shards sit underutilized.

## Diagnosing a Hot Shard

### Check Shard Distribution

```javascript
// Run on mongos
db.orders.getShardDistribution()
```

Example output showing a hot shard:

```text
Shard shard0 at shard0/mongo-0:27018
  data: 45.2GiB  docs: 12,000,000  chunks: 256

Shard shard1 at shard1/mongo-1:27018
  data: 1.1GiB   docs:   300,000   chunks: 8

Shard shard2 at shard2/mongo-2:27018
  data: 1.3GiB   docs:   350,000   chunks: 10
```

`shard0` holds 94% of the data - clearly a hot shard.

### Monitor Live Operations

```bash
mongostat --host mongos:27017 --discover
```

Watch for one shard with significantly higher `insert`, `query`, or `update` counts.

### Check CPU and I/O on Shard Nodes

```javascript
// Run on the hot shard's primary node
db.adminCommand({ serverStatus: 1 }).opcounters
```

## Common Causes

1. **Monotonically increasing shard key** - All new documents land in the "max key" chunk on one shard.
2. **Low-cardinality shard key** - For example, a `status` field with only 3 values causes 3 chunks maximum.
3. **Popular data concentration** - Most queries target a narrow key range that falls on one shard.

## Solution 1: Split Large Chunks Manually

If the balancer is not splitting and migrating chunks fast enough, force a split:

```javascript
// Connect to mongos
use admin
db.adminCommand({
  split: 'shop.orders',
  middle: { tenantId: 'acme-mid-value' }
})
```

After splitting, the balancer migrates chunks to less-loaded shards automatically (if balancing is enabled).

## Solution 2: Enable and Tune the Balancer

```javascript
// Verify balancer is running
sh.getBalancerState()

// Enable balancer if disabled
sh.startBalancer()

// Check current migrations
sh.isBalancerRunning()

// View balancer configuration
db.getSiblingDB('config').settings.findOne({ _id: 'balancer' })
```

Increase the balancer window if it is currently restricted:

```javascript
db.getSiblingDB('config').settings.updateOne(
  { _id: 'balancer' },
  { $unset: { activeWindow: 1 } }
);
```

## Solution 3: Refine the Shard Key (MongoDB 4.4+)

If the hot shard is caused by a poor shard key, use `refineCollectionShardKey` to add a suffix that increases cardinality:

```javascript
// Original shard key: { tenantId: 1 }
// Add userId to increase cardinality and distribution

db.adminCommand({
  refineCollectionShardKey: 'shop.orders',
  key: { tenantId: 1, userId: 1 }
})
```

Note: you must first create an index on the refined key before refining.

```javascript
db.orders.createIndex({ tenantId: 1, userId: 1 })
```

## Solution 4: Zone Sharding for Controlled Distribution

Use zone sharding to explicitly assign a key range to specific shards:

```javascript
// Assign shard0 and shard1 to handle different tenant zones
sh.addShardToZone('shard0', 'tenants-a-m')
sh.addShardToZone('shard1', 'tenants-n-z')

sh.updateZoneKeyRange('shop.orders',
  { tenantId: 'a' },
  { tenantId: 'n' },
  'tenants-a-m'
)

sh.updateZoneKeyRange('shop.orders',
  { tenantId: 'n' },
  { tenantId: MaxKey },
  'tenants-n-z'
)
```

## Summary

Hot shards in MongoDB are caused by poor shard key selection, low-cardinality keys, or monotonically increasing write patterns. Diagnose them with `getShardDistribution()` and `mongostat`. Fix them by splitting large chunks, ensuring the balancer is active, refining the shard key in MongoDB 4.4+, or using zone sharding to explicitly control data placement. Monitor distribution regularly after changes to confirm the hotspot has been resolved.
