# How to Clean Up Orphaned Documents in Sharded MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Administration, Cleanup, Maintenance

Description: Learn how orphaned documents occur in sharded MongoDB clusters and how to clean them up using cleanupOrphaned, cleanupReshardCollection, and rangeDeleter settings.

---

Orphaned documents are documents that exist on a shard but do not belong to that shard according to the cluster's routing metadata. They are a normal byproduct of chunk migrations and MongoDB provides built-in tools to remove them safely.

## Why Orphaned Documents Occur

During a chunk migration, MongoDB moves a chunk from one shard to another. If the migration fails or is interrupted after documents are copied but before the old copies are deleted, orphaned documents remain on the source shard. They do not affect query correctness for routed queries but consume unnecessary disk space and can cause confusing counts when querying individual shards directly.

## Detecting Orphaned Documents

Check if any orphaned ranges exist using `sh.status()`:

```javascript
sh.status()
```

Look for ongoing migrations that may have been interrupted. A more targeted check:

```javascript
use config
db.migrationCoordinators.find({ state: { $ne: "done" } })
```

Also check for pending range deletions on each shard's primary (connect directly to the shard, not through mongos):

```javascript
use config
db.rangeDeletions.find()
```

## Automatic Cleanup via rangeDeleter

MongoDB automatically schedules orphan cleanup after chunk migrations via the range deleter. It is enabled by default on shard servers. You can tune the delay before orphaned ranges are cleaned up via the `orphanCleanupDelaySecs` server parameter (default 900 seconds):

In `mongod.conf`:

```yaml
setParameter:
  orphanCleanupDelaySecs: 900
```

The range deleter runs in the background. Monitor its progress:

```javascript
db.adminCommand({ currentOp: true, desc: /range/ })
```

## Manual Cleanup with cleanupOrphaned

For MongoDB 4.x and earlier, use the `cleanupOrphaned` admin command on each shard's primary:

```javascript
// Run on the PRIMARY of each shard, not on mongos
use admin
db.runCommand({
  cleanupOrphaned: "myDatabase.myCollection",
  startingFromKey: { shardKeyField: MinKey },
  secondaryThrottle: false
})
```

Repeat with `startingFromKey` set to the `stoppedAtKey` value from the previous response until the cleanup is complete:

```javascript
let result = { stoppedAtKey: { shardKeyField: MinKey } };

while (result.stoppedAtKey) {
  result = db.runCommand({
    cleanupOrphaned: "myDatabase.myCollection",
    startingFromKey: result.stoppedAtKey
  });
  print(`Status: ${result.ok}, next: ${tojson(result.stoppedAtKey)}`);
}
print("Cleanup complete");
```

## MongoDB 6.0+ - Improved Auto-Cleanup

In MongoDB 6.0+, the range deleter has been significantly improved and handles all orphaned document cleanup automatically after chunk migrations and resharding operations. There is no need for manual intervention.

The `cleanupOrphaned` command was removed in MongoDB 6.0. If you are on 6.0 or later, rely on the automatic range deleter. You can monitor its progress using:

```javascript
db.adminCommand({ currentOp: true, desc: /range/ })
```

## Preventing Orphans

- Ensure the balancer runs during low-traffic windows.
- Monitor migration failures with `sh.isBalancerRunning()` and `sh.getBalancerState()`.
- Avoid stopping `mongod` processes during active chunk migrations.
- Use the `_waitForDelete` option during manual chunk operations.

```javascript
// Check balancer state
sh.isBalancerRunning()
sh.getBalancerState()

// Review recent migration failures
use config
db.changelog.find({ what: "moveChunk.error" }).sort({ time: -1 }).limit(10)
```

## Summary

Orphaned documents result from interrupted chunk migrations. MongoDB's range deleter removes them automatically after successful migrations. For manual cleanup on MongoDB 4.x, use `cleanupOrphaned` iteratively on each shard's primary. On MongoDB 6.0+, the `cleanupOrphaned` command was removed and the improved range deleter handles all post-migration orphan cleanup automatically.
