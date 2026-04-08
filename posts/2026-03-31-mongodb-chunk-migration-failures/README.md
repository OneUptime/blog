# How to Troubleshoot Chunk Migration Failures in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Chunk Migration, Balancer, Troubleshooting

Description: Learn how to diagnose and resolve chunk migration failures in MongoDB sharded clusters, including common causes, log analysis, and balancer configuration tips.

---

Chunk migrations move data between shards as MongoDB balances the cluster. When migrations fail, the cluster becomes imbalanced and performance degrades. Understanding why migrations fail helps you fix the root cause quickly.

## Check Balancer Status

Start by verifying the balancer is running and checking for recent failures:

```javascript
// Check if balancer is enabled
sh.getBalancerState()

// Check balancer status
sh.isBalancerRunning()

// View recent balancer rounds
use config
db.actionlog.find({ what: "moveChunk.from" }).sort({ time: -1 }).limit(10).pretty()
```

Look for `"errmsg"` fields in the action log entries to identify failure reasons.

## Common Failure Causes

**1. Insufficient disk space on the destination shard**

```bash
# Check disk usage on each shard host
df -h /var/lib/mongodb
```

MongoDB requires free space roughly equal to the chunk size on the destination shard.

**2. Network issues between shards**

```bash
# Test connectivity from source to destination shard port
nc -zv shard2.example.com 27018
```

**3. Long-running operations blocking migration**

```javascript
// Check for blocking operations on the source shard
db.adminCommand({ currentOp: true, secs_running: { $gte: 1 } })
```

Migrations wait for conflicting operations to complete. Long-running queries or transactions can delay or fail migrations.

## Inspect Migration Logs

Check `mongod` logs on the source shard for migration error details:

```bash
grep "moveChunk" /var/log/mongodb/mongod.log | grep -i "error\|fail" | tail -20
```

Common log messages:
- `"aborted"` - migration was cancelled
- `"stale config"` - chunk metadata is out of sync
- `"not primary"` - source or destination changed primary during migration

## Force a Chunk Move Manually

To test whether migrations work, move a specific chunk manually:

```javascript
use admin
db.runCommand({
  moveChunk: "myapp.orders",
  find: { customerId: "C100" },
  to: "shard2"
})
```

If this fails, the error message will point to the specific issue.

## Tune Migration Settings

Adjust throttle and cleanup settings to reduce migration pressure:

```javascript
use config
db.settings.updateOne(
  { _id: "balancer" },
  { $set: { _secondaryThrottle: true, waitForDelete: false } },
  { upsert: true }
)
```

Control balancer window to limit migrations to off-peak hours:

```javascript
db.settings.updateOne(
  { _id: "balancer" },
  {
    $set: {
      activeWindow: {
        start: "02:00",
        stop: "06:00"
      }
    }
  },
  { upsert: true }
)
```

## Fix Stale Chunk Metadata

If you see stale metadata errors, flush routing table caches on all `mongos` instances:

```javascript
db.adminCommand({ flushRouterConfig: 1 })
```

## Summary

Chunk migration failures are usually caused by disk space constraints, network issues, or long-running operations on the source shard. Check the balancer action log and `mongod` logs to identify the exact failure reason. Tuning the balancer window and throttle settings helps prevent migrations from impacting production workloads.
