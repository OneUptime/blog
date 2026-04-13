# How to Enable and Configure the MongoDB Profiler (Levels 0, 1, 2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Profiler, Performance, Slow Query, Monitoring

Description: Learn how to enable and configure the MongoDB profiler at levels 0, 1, and 2, set custom slowms thresholds, and manage the system.profile collection size.

---

The MongoDB profiler captures information about operations executed against a database. It writes profiling data to the `system.profile` collection, which you can query to find slow operations, missing indexes, and performance bottlenecks.

## Profiler Levels

| Level | Description                               |
|-------|-------------------------------------------|
| 0     | Off - no profiling                        |
| 1     | Profile operations slower than `slowms`   |
| 2     | Profile all operations                    |

Level 2 on a production database will significantly impact performance. Use Level 1 with a tuned `slowms` threshold in production.

## Checking Current Profiler Status

```javascript
db.getProfilingStatus()
// { was: 0, slowms: 100, sampleRate: 1.0 }
```

## Enabling Level 1 Profiling

```javascript
// Profile operations slower than 200ms
db.setProfilingLevel(1, { slowms: 200 });

// Verify
db.getProfilingStatus()
// { was: 1, slowms: 200, sampleRate: 1.0 }
```

## Enabling Level 2 for Debugging

```javascript
// Profile everything - use only temporarily in dev/test
db.setProfilingLevel(2);
```

Turn it off after debugging:

```javascript
db.setProfilingLevel(0);
```

## Using sampleRate to Reduce Overhead

`sampleRate` (0.0 to 1.0) controls what fraction of slow operations are profiled. Use it to reduce profiling overhead on high-throughput systems:

```javascript
// Profile 10% of operations slower than 100ms
db.setProfilingLevel(1, { slowms: 100, sampleRate: 0.1 });
```

## Setting the system.profile Collection Size

By default, `system.profile` holds up to 1 MB of data. On busy systems, this fills quickly. Create it with a larger cap before enabling profiling:

```javascript
// Disable profiling first, then drop and recreate with larger cap
db.setProfilingLevel(0);
db.system.profile.drop();
db.createCollection("system.profile", {
  capped: true,
  size: 104857600  // 100 MB
});

db.setProfilingLevel(1, { slowms: 100 });
```

## Configuring Profiler in mongod.conf

For persistent configuration across restarts, set `slowOpThresholdMs` in `mongod.conf`:

```yaml
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
  slowOpSampleRate: 0.5
```

Valid `mode` values: `off`, `slowOp`, `all`

## Temporarily Profiling All Operations

To capture all operations regardless of duration, set `slowms` to -1. This is a global setting that affects all queries on the database:

```javascript
// Profile all operations (everything exceeds -1ms)
db.setProfilingLevel(1, { slowms: -1 });
```

Use `comment` to tag specific queries so you can find them easily in the profiler output:

```javascript
db.orders.find({ status: "pending" }).comment("debug-order-query");

// Then filter profiler data by comment
db.system.profile.find({ "command.comment": "debug-order-query" });
```

Restore your normal threshold when done:

```javascript
db.setProfilingLevel(1, { slowms: 100 });
```

## Reading Profile Data

```javascript
db.system.profile.find().sort({ ts: -1 }).limit(5).pretty();
```

Key fields in each profile entry:
- `op` - operation type (query, insert, update, command)
- `ns` - namespace
- `millis` - execution time
- `keysExamined`, `docsExamined` - efficiency metrics
- `planSummary` - the query plan used

## Summary

The MongoDB profiler operates at three levels: off (0), slow-op capture (1), and full capture (2). In production, use Level 1 with a `slowms` threshold that captures meaningful slow operations without overwhelming the `system.profile` collection. Set `sampleRate` below 1.0 on high-throughput databases to limit profiling overhead. Pre-create `system.profile` as a larger capped collection to avoid losing profile data too quickly.
