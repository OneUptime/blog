# How to Stop and Start the Balancer in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Balancer, Administration, Database

Description: Learn how to stop and start the MongoDB sharded cluster balancer, check its current state, and safely pause it during maintenance operations.

---

The MongoDB balancer migrates chunks between shards to maintain data balance. There are scenarios where you need to temporarily stop it: during backups, shard maintenance, large data imports, or when investigating performance issues caused by balancer migrations.

## Check Balancer State

Always check the current state before making changes:

```javascript
sh.getBalancerState()
// Returns: true (enabled) or false (disabled)

sh.isBalancerRunning()
// Returns: true if actively migrating chunks right now
```

## Stop the Balancer

```javascript
sh.stopBalancer()
```

This sets a flag to stop new migrations. Any migration currently in progress will complete before the balancer fully stops.

To wait up to 30 seconds for in-progress migrations to finish, use the admin command with `maxTimeMS`:

```javascript
db.adminCommand({ balancerStop: 1, maxTimeMS: 30000 })
```

Verify the balancer has stopped:

```javascript
sh.isBalancerRunning()
// Should return false
```

## Start the Balancer

```javascript
sh.startBalancer()
```

The balancer will begin evaluating and migrating chunks again. If the cluster is already balanced, no migrations will occur immediately.

## Using the Admin Command Directly

Equivalent admin commands:

```javascript
// Stop
db.adminCommand({ balancerStop: 1 })

// Start
db.adminCommand({ balancerStart: 1 })

// Status
db.adminCommand({ balancerStatus: 1 })
```

Sample `balancerStatus` output:

```javascript
{
  mode: 'full',
  inBalancerRound: false,
  numBalancerRounds: 1847,
  ok: 1
}
```

`mode: 'full'` means enabled. `mode: 'off'` means disabled.

## Safe Backup Procedure

The recommended procedure for taking a consistent backup of a sharded cluster:

```javascript
// 1. Stop the balancer
sh.stopBalancer()

// 2. Confirm it stopped
assert(!sh.isBalancerRunning(), "Balancer still running!")

// 3. Take backup (e.g., mongodump each shard + config servers)
// ... your backup commands here ...

// 4. Restart the balancer
sh.startBalancer()
```

## Safe Shard Maintenance Procedure

Before adding, removing, or restarting shard members:

```javascript
sh.stopBalancer()

// Perform maintenance: restart mongod, apply patches, etc.

sh.startBalancer()
```

## Stop Balancing for a Single Collection

If you only want to pause balancing for one collection:

```javascript
sh.disableBalancing("myapp.events")

// Later, re-enable
sh.enableBalancing("myapp.events")
```

This is useful during large imports into one collection while allowing other collections to continue balancing.

## Monitor Balancer After Restarting

After restarting the balancer, confirm migrations are starting if the cluster was imbalanced:

```javascript
// Check if the balancer is actively migrating
db.adminCommand({ balancerStatus: 1 })

// Watch recent migration events
use config
db.changelog.find({ what: "moveChunk.from" }).sort({ time: -1 }).limit(5)
```

## Summary

Use `sh.stopBalancer()` before backups, shard maintenance, or large imports to avoid incomplete chunk migrations corrupting the operation. Always verify with `sh.isBalancerRunning()` that the balancer has actually stopped before proceeding. Restart with `sh.startBalancer()` when done, and use `sh.disableBalancing()` to pause balancing on specific collections without affecting the rest of the cluster.

