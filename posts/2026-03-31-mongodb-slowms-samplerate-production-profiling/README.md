# How to Use slowms and sampleRate for Profiling in Production MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Profiler, Production, Performance, Slow Query

Description: Configure MongoDB's slowms threshold and sampleRate to capture actionable slow query data in production with minimal performance overhead.

---

Profiling in production requires balancing observability with performance. The `slowms` threshold and `sampleRate` parameters let you capture meaningful slow queries without overwhelming your database or filling the `system.profile` collection in seconds.

## The Performance Cost of Profiling

Every profiled operation writes a document to `system.profile`, a capped collection in the profiled database. At high throughput, even Level 1 profiling can add measurable overhead. The key is capturing enough data to diagnose problems while limiting write amplification.

## Understanding slowms

`slowms` defines the minimum execution time (in milliseconds) for an operation to be captured by the profiler at Level 1. Operations faster than this threshold are ignored.

```javascript
// Current setting
db.getProfilingStatus()
// { was: 1, slowms: 100, sampleRate: 1 }
```

### Choosing the Right slowms Value

| Context | Recommended slowms |
|---------|-------------------|
| Development/debug | 0-10 ms |
| Production baseline | 100 ms |
| High-throughput OLTP | 200-500 ms |
| Batch/analytics workloads | 1000+ ms |

Start with the 95th percentile query latency as your baseline. If most queries complete in 20 ms, profiling at 100 ms captures the tail without noise.

```javascript
// Enable with 200ms threshold
db.setProfilingLevel(1, { slowms: 200 });
```

## Understanding sampleRate

`sampleRate` (0.0 to 1.0) controls what fraction of operations exceeding `slowms` are actually profiled. Setting it below 1.0 is useful when you have many slow operations and want to reduce write pressure.

```javascript
// Profile 25% of operations slower than 100ms
db.setProfilingLevel(1, { slowms: 100, sampleRate: 0.25 });
```

### When to Use a Lower sampleRate

- Your database performs 10,000+ ops/sec and many hit the slowms threshold
- You are troubleshooting a pattern, not individual queries
- You need to run profiling continuously without filling disk

```javascript
// High throughput production: catch patterns without full capture
db.setProfilingLevel(1, { slowms: 50, sampleRate: 0.05 });
```

At 5% sample rate, you still see the distribution of slow queries but write only 1 in 20 to `system.profile`.

## Combining slowms and sampleRate Strategically

During an incident, lower slowms and raise sampleRate temporarily:

```javascript
// Incident investigation: capture everything >= 50ms
db.setProfilingLevel(1, { slowms: 50, sampleRate: 1.0 });

// Post-incident: return to normal
db.setProfilingLevel(1, { slowms: 200, sampleRate: 0.1 });
```

## Persistent Configuration in mongod.conf

```yaml
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 200
  slowOpSampleRate: 0.1
```

Note: `sampleRate` in the config file is `slowOpSampleRate` and was added in MongoDB 3.6 (extended to `mongos` in 4.0).

## Monitoring the system.profile Collection Fill Rate

```javascript
// Check how full system.profile is
const profile = db.system.profile.stats();
print("Used (bytes):", profile.size);
print("Max (bytes):", profile.maxSize);
print("Fill %:", (profile.size / profile.maxSize * 100).toFixed(1));
print("Entry count:", profile.count);
```

If it fills in under an hour at your current settings, increase `slowms` or decrease `sampleRate`.

## Automating slowms Adjustment

Some teams write a script that adjusts `slowms` based on current p95 latency:

```javascript
function autoTuneProfiling() {
  const p95 = measureP95Latency(); // custom function
  const newSlowms = Math.max(p95 * 3, 50);  // 3x p95, minimum 50ms
  db.setProfilingLevel(1, { slowms: newSlowms, sampleRate: 0.1 });
  print("Set slowms to:", newSlowms);
}
```

## Summary

In production, set `slowms` to 2-5x your typical query latency to capture only the genuine outliers. Use `sampleRate` below 1.0 on high-throughput databases to limit the write overhead of profiling itself. During incident investigation, temporarily lower `slowms` and raise `sampleRate` to get complete data, then return to conservative settings afterward. Monitor `system.profile` fill rate to ensure your settings don't cause the collection to roll over too quickly.
