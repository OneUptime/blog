# How to Remove a Shard from a MongoDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Administration, Cluster, Database

Description: Learn how to safely remove a shard from a MongoDB sharded cluster by draining its data, monitoring migration progress, and verifying successful removal.

---

Removing a shard from a MongoDB sharded cluster is a multi-step process. MongoDB must migrate all chunks off the shard before it can be safely decommissioned. This process can take minutes to hours depending on data volume.

## Prerequisites

- Connected to `mongos`
- The cluster must have at least one other shard to receive the migrated data
- No databases should have the shard set as their primary shard (or those must be moved first)

## Step 1 - Identify the Shard to Remove

```javascript
sh.status()
```

Note the shard name (e.g., `shard2`) and its associated replica set name.

## Step 2 - Initiate the Removal

```javascript
db.adminCommand({ removeShard: "shard2" })
```

This command starts the draining process. MongoDB begins migrating chunks from `shard2` to other shards.

**Important:** The command returns immediately with a status, not when draining is complete.

## Step 3 - Monitor Draining Progress

Run the command repeatedly to check progress:

```javascript
db.adminCommand({ removeShard: "shard2" })
```

Sample response while draining:

```javascript
{
  msg: 'draining ongoing',
  state: 'ongoing',
  remaining: {
    chunks: 14,
    dbs: 0,
    jumboChunks: 0
  },
  ok: 1
}
```

Wait until `remaining.chunks` reaches 0.

## Step 4 - Move Primary Databases

If any databases have `shard2` as their primary shard, move them:

```javascript
db.adminCommand({ movePrimary: "myapp", to: "shard1" })
```

Run `removeShard` again to check if there are remaining databases:

```javascript
db.adminCommand({ removeShard: "shard2" })
// remaining.dbs should be 0 before proceeding
```

## Step 5 - Confirm Removal Complete

Once all chunks and primary databases are migrated:

```javascript
{
  msg: 'removeshard completed successfully',
  state: 'completed',
  shard: 'shard2',
  ok: 1
}
```

## Step 6 - Verify Shard is Gone

```javascript
sh.status()
```

`shard2` should no longer appear in the shards list.

Also verify in the config database:

```javascript
use config
db.shards.find({ _id: "shard2" })
// Should return empty
```

## Step 7 - Decommission the Physical Shard

Once removal is confirmed, shut down the shard's replica set members:

```bash
sudo systemctl stop mongod
```

## Troubleshooting Slow Draining

If draining is taking too long:

**Enable the balancer if it is paused:**

```javascript
sh.startBalancer()
```

**Check for jumbo chunks** (chunks too large to migrate automatically):

```javascript
db.adminCommand({ removeShard: "shard2" }).remaining.jumboChunks
```

Clear jumbo flags using the `clearJumboFlag` command:

```javascript
db.adminCommand({
  clearJumboFlag: "mydb.mycollection",
  find: { <shardKeyField>: <value> }
})
```

**Monitor balancer migrations:**

```javascript
use config
db.changelog.find({ what: /moveChunk/ }).sort({ time: -1 }).limit(10)
```

## Summary

Removing a shard from MongoDB requires initiating the drain with `removeShard`, waiting for all chunks to migrate to other shards, moving any primary databases off the shard, and confirming completion by running `removeShard` until it reports `completed`. Large shards can take significant time to drain - monitor progress regularly and ensure the balancer is running. Only decommission the physical servers after the removal is confirmed in `sh.status()`.

