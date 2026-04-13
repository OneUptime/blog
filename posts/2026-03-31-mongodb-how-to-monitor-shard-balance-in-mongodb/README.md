# How to Monitor Shard Balance in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Monitoring, Balancer, Performance

Description: Learn how to monitor MongoDB shard balance using sh.status(), chunk counts, and balancer logs to ensure even data distribution across shards.

---

## Why Monitor Shard Balance

An unbalanced sharded cluster means some shards hold significantly more chunks than others. This leads to uneven resource utilization - some shards become I/O and CPU bottlenecks while others sit underutilized. Regular monitoring lets you catch imbalances before they affect application performance.

## Quick Overview with sh.status()

The fastest way to check balance is `sh.status()`:

```javascript
mongos> sh.status();
```

Look for the `chunks` line in each shard section:

```text
shards:
  { "_id" : "shard01", ... }
  { "_id" : "shard02", ... }

databases:
  { "_id" : "mydb", ... }
    mydb.orders
      shard key: { "customerId" : 1 }
      chunks:
        shard01  245
        shard02  248
        shard03  247
```

A well-balanced cluster shows similar chunk counts across all shards.

## Detailed Chunk Counts per Shard

Query the config database for precise counts:

```javascript
use config;

const collUUID = db.collections.findOne({ _id: "mydb.orders" }).uuid;

db.chunks.aggregate([
  { $match: { uuid: collUUID } },
  {
    $group: {
      _id: "$shard",
      chunkCount: { $sum: 1 }
    }
  },
  { $sort: { chunkCount: -1 } }
]);
```

Example output:

```javascript
[
  { "_id": "shard01", "chunkCount": 412 },
  { "_id": "shard02", "chunkCount": 198 },
  { "_id": "shard03", "chunkCount": 190 }
]
```

Shard01 has more than twice the chunks of others - a clear imbalance.

## Checking the Balancer State

```javascript
sh.getBalancerState();
db.adminCommand({ balancerStatus: 1 });
```

View the last few balancer rounds:

```javascript
use config;
db.actionlog.find({ what: "balancer.round" }).sort({ time: -1 }).limit(5);
```

Look at each round's details:

```javascript
db.actionlog.find(
  { what: "balancer.round" },
  { time: 1, details: 1 }
).sort({ time: -1 }).limit(3).pretty();
```

The `details.candidateChunks` field shows how many chunks were eligible for migration. If it is consistently above 0 but migrations are slow, the balancer is falling behind writes.

## Checking Active Migrations

```javascript
use config;
db.migrations.find();
```

During active rebalancing, this collection shows in-flight chunk migrations. An empty collection means no migrations are running.

## Monitoring Chunk Splits

```javascript
use config;
db.changelog.find({ what: "split" }).sort({ time: -1 }).limit(10);
```

Frequent splits on the same chunk indicate a hotspot - a single chunk is receiving so many writes that it must be repeatedly split.

## Checking for Jumbo Chunks

Jumbo chunks cannot be split or migrated, causing imbalance to persist:

```javascript
use config;
const collUUID = db.collections.findOne({ _id: "mydb.orders" }).uuid;
db.chunks.find({ jumbo: true, uuid: collUUID });
```

If jumbo chunks exist, investigate the shard key distribution for those key ranges - they likely have extremely high document frequency for those values.

## Automating Balance Monitoring

A simple shell script to alert on imbalance:

```bash
#!/bin/bash
THRESHOLD=1.5
COUNTS=$(mongosh --quiet --eval "
  use config;
  const collUUID = db.collections.findOne({ _id: 'mydb.orders' }).uuid;
  const res = db.chunks.aggregate([
    { \$match: { uuid: collUUID } },
    { \$group: { _id: '\$shard', c: { \$sum: 1 } } }
  ]).toArray();
  const counts = res.map(r => r.c);
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  print(max / min);
")
echo "Max/min chunk ratio: $COUNTS"
if (( $(echo "$COUNTS > $THRESHOLD" | bc -l) )); then
  echo "ALERT: Shard imbalance detected"
fi
```

## Balancer Window Configuration

Restrict balancing to off-peak hours to reduce production impact:

```javascript
use config;
db.settings.updateOne(
  { _id: "balancer" },
  {
    $set: {
      activeWindow: { start: "02:00", stop: "06:00" }
    }
  },
  { upsert: true }
);
```

## Summary

Monitor shard balance using `sh.status()` for quick overviews and `config.chunks` aggregations for precise counts. Check `config.actionlog` to verify the balancer is making progress and `config.chunks` for jumbo chunks that block migration. Set up automated ratio checks and restrict the balancer window to off-peak hours to minimize impact on production workloads.
