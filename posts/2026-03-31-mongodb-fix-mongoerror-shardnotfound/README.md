# How to Fix MongoError: ShardNotFound in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Shard, Sharding, Error, Cluster Administration

Description: Learn why MongoDB throws ShardNotFound errors and how to fix them by verifying shard registration, chunk distribution, and mongos configuration.

---

## Understanding the Error

`MongoServerError: ShardNotFound` (error code 70) means a `mongos` router or `mongod` config server references a shard that no longer exists in the cluster's metadata, or a requested shard ID is not registered:

```text
MongoServerError: shard not found
    code: 70, codeName: 'ShardNotFound'
```

This typically appears when:
- A shard was removed from the cluster without being properly drained
- `mongos` cached stale routing information
- A direct connection to a shard attempts operations that require cluster awareness

## Step 1: List All Registered Shards

Connect to `mongos` and verify what shards the config server knows about:

```javascript
// Connect to mongos
use admin
db.adminCommand({ listShards: 1 })
```

Compare the output with the shards that are actually running and accessible.

## Step 2: Check for Stale Routing in mongos

`mongos` caches routing tables. Force a refresh:

```javascript
// Flush cached routing table
use admin
db.adminCommand({ flushRouterConfig: 1 })
```

Then retry the failing operation.

## Step 3: Verify Shard Connection Strings

Check that `mongos` can reach all registered shards:

```javascript
// Check shard status
db.adminCommand({ listShards: 1 }).shards.forEach(shard => {
  print(`Shard: ${shard._id}, host: ${shard.host}`);
})
```

Test connectivity from the `mongos` host to each shard's port. If a shard host has changed IP or DNS, update the replica set configuration on the shard itself:

```javascript
// Connect directly to the shard's replica set primary
rs.reconfig({
  _id: "rs1",
  members: [
    { _id: 0, host: "newhost1:27017" },
    { _id: 1, host: "newhost2:27017" }
  ]
})
```

The `mongos` routers and config servers will automatically detect the updated replica set membership.

## Step 4: Properly Remove a Decommissioned Shard

If you removed a shard without running `removeShard`, the config server still references it:

```javascript
// Proper shard removal - first drain the shard
use admin
db.adminCommand({ removeShard: "shard1" })

// Wait for draining to complete (run repeatedly until state == "completed")
db.adminCommand({ removeShard: "shard1" })
// { "msg": "draining completed successfully", "state": "completed" }
```

Never delete a shard's data files directly without running `removeShard` first.

## Step 5: Re-register a Missing Shard

If a shard was accidentally removed from the config server metadata but the data is intact:

```javascript
// Add the shard back
use admin
db.adminCommand({
  addShard: "rs1/shard1host1:27017,shard1host2:27017,shard1host3:27017",
  name: "shard1"
})
```

## Step 6: Check for Zone Configuration Issues

`ShardNotFound` also appears when a zone (tag range) references a shard that no longer exists:

```javascript
// List zones
db.getSiblingDB("config").tags.find()

// Remove stale zone assignment
db.adminCommand({
  updateZoneKeyRange: "mydb.orders",
  min: { region: "us-east" },
  max: { region: "us-east~" },
  zone: null // removes the zone assignment
})
```

## Monitoring Cluster Health

```javascript
// Check cluster health from mongos
db.adminCommand({ connPoolStats: 1 })
sh.status() // overall shard status
```

## Summary

`ShardNotFound` occurs when the routing metadata references a shard that is unreachable or unregistered. Fix it by flushing the `mongos` router config, verifying shard connectivity, re-registering removed shards, properly draining shards before removal, and cleaning up stale zone assignments. Always use `removeShard` to decommission shards rather than deleting them directly.
