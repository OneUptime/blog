# How to Tune maxNumActiveUserIndexBuilds in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Performance, Configuration, Administration

Description: Learn how to configure maxNumActiveUserIndexBuilds in MongoDB to control index build concurrency and prevent index builds from impacting production query performance.

---

Starting with MongoDB 4.4, index builds use a new mechanism that runs on both the primary and secondaries simultaneously. The `maxNumActiveUserIndexBuilds` parameter controls how many concurrent user-initiated index builds can run, preventing runaway index build resource consumption.

## What Is maxNumActiveUserIndexBuilds?

This parameter limits the number of simultaneous index builds initiated by users (as opposed to internal system index builds). When more index builds are requested than the limit allows, additional builds queue until a slot opens.

## Default Value

```javascript
db.adminCommand({ getParameter: 1, maxNumActiveUserIndexBuilds: 1 })
// { maxNumActiveUserIndexBuilds: 3, ok: 1 }
```

The default is 3 concurrent index builds. This parameter was introduced in MongoDB 4.4 alongside the simultaneous index build mechanism.

## Why Limit Index Build Concurrency?

Index builds are resource-intensive:
- They scan every document in the collection (I/O-heavy)
- They sort index keys in memory or on disk (CPU and RAM)
- They consume WiredTiger cache space for dirty pages
- They can impact foreground query performance

Running many index builds simultaneously can saturate I/O and degrade query latency for production traffic.

## Setting the Limit

```javascript
// Allow only 1 concurrent user index build
db.adminCommand({ setParameter: 1, maxNumActiveUserIndexBuilds: 1 });

// Allow 2 concurrent builds (for maintenance windows)
db.adminCommand({ setParameter: 1, maxNumActiveUserIndexBuilds: 2 });
```

In `mongod.conf`:

```yaml
setParameter:
  maxNumActiveUserIndexBuilds: 1
```

## Monitoring Active Index Builds

```javascript
// See current index builds
db.adminCommand({ currentOp: true, "command.createIndexes": { $exists: true } }).inprog;
```

Or more verbosely:

```javascript
db.currentOp().inprog
  .filter(op => op.command && op.command.createIndexes)
  .map(op => ({
    collection: op.command.createIndexes,
    index:      op.command.indexes,
    progress:   op.progress,
    secsRunning: op.secs_running
  }));
```

## Impact on Replica Sets

In MongoDB 4.4+, the primary waits for a commit quorum of data-bearing voting members to finish building the index before it can commit. If a build takes hours on a large collection, the index commit is delayed until enough members complete the build. Long-running builds can also increase replication lag on secondaries. Limit concurrent builds to reduce this exposure:

```javascript
// Recommended for replica sets with large collections
db.adminCommand({ setParameter: 1, maxNumActiveUserIndexBuilds: 1 });
```

## Queuing Multiple Index Builds

When the limit is reached, new `createIndex` commands wait in the operation queue:

```javascript
// These will queue if maxNumActiveUserIndexBuilds is 1
db.orders.createIndex({ customerId: 1 });     // starts immediately
db.orders.createIndex({ status: 1 });         // queues
db.orders.createIndex({ createdAt: -1 });     // queues
```

Create multiple indexes in a single `createIndexes` call to avoid queuing:

```javascript
db.orders.createIndexes([
  { key: { customerId: 1 } },
  { key: { status: 1 } },
  { key: { createdAt: -1 } }
]);
```

A single `createIndexes` call with multiple indexes counts as one build.

## Tuning Strategy by Environment

| Environment         | Recommended Value | Notes                                 |
|---------------------|-------------------|---------------------------------------|
| Production (live)   | 1                 | Protect query latency                 |
| Maintenance window  | 2-3               | Finish builds faster, traffic is low  |
| Development/test    | 3+ (default)      | Build indexes quickly                 |

## Summary

`maxNumActiveUserIndexBuilds` controls how many user-initiated index builds run concurrently. Set it to 1 in production to prevent index builds from saturating I/O and degrading query performance. Increase it temporarily during maintenance windows to build multiple indexes faster. Use a single `createIndexes` call with multiple index definitions to avoid splitting a related set of builds into separately queued operations.
