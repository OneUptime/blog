# How to Configure logLevel and slowOpThresholdMs in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Logging, Performance, Configuration

Description: Learn how to configure MongoDB logLevel and slowOpThresholdMs to control log verbosity and capture slow operations for performance tuning and debugging.

---

MongoDB's logging system provides detailed visibility into server operations. Two of the most important logging parameters are `logLevel` (controls verbosity) and `slowOpThresholdMs` (defines what counts as a "slow" operation). Configuring both correctly lets you capture actionable performance data without drowning in noise.

## Understanding logLevel

MongoDB supports log levels from 0 (default, informational and above) to 5 (maximum verbosity). You can set a global level or per-component levels.

**Log levels:**

```text
0 - Default (informational, warning, error, and fatal messages)
1 - Debug level 1
2-5 - Debug levels (increasing detail)
```

**Set global log level at runtime:**

```javascript
db.adminCommand({ setParameter: 1, logLevel: 1 });
```

**Set component-specific log level (recommended):**

```javascript
db.setLogLevel(2, "query");       // Verbose query logging
db.setLogLevel(1, "replication"); // Info for replication
db.setLogLevel(0, "network");     // Quiet network logs
```

**Via mongod.conf:**

```yaml
systemLog:
  verbosity: 1
  component:
    query:
      verbosity: 2
    replication:
      verbosity: 1
```

## Understanding slowOpThresholdMs

`slowOpThresholdMs` defines the threshold (in milliseconds) above which an operation is logged as "slow." The default is **100ms**. Operations exceeding this threshold appear in the MongoDB log with a `"Slow query"` message.

**Set at runtime:**

```javascript
db.adminCommand({
  setParameter: 1,
  slowOpThresholdMs: 200
});
```

**Via mongod.conf:**

```yaml
operationProfiling:
  slowOpThresholdMs: 200
```

**Verify current value:**

```javascript
db.adminCommand({ getParameter: 1, slowOpThresholdMs: 1 });
```

## Reading Slow Operation Log Entries

A slow operation log entry looks like:

```text
{"t":{"$date":"2026-03-31T10:05:23.411Z"},"s":"I","c":"COMMAND",
"msg":"Slow query","attr":{"type":"command","ns":"mydb.orders",
"command":{"find":"orders","filter":{"status":"pending"}},
"planSummary":"COLLSCAN","durationMillis":345}}
```

Key fields to watch:
- `planSummary`: `COLLSCAN` means no index was used
- `durationMillis`: actual operation duration
- `keysExamined` vs `docsExamined`: high ratios suggest poor index selectivity

## Combining with the Profiler

The `slowOpThresholdMs` setting also affects the database profiler (level 1). Enable profiling for slow ops only:

```javascript
db.setProfilingLevel(1, { slowms: 200 });
```

Query the profiler collection to analyze slow operations:

```javascript
db.system.profile.find({
  millis: { $gt: 200 }
}).sort({ millis: -1 }).limit(10);
```

## Recommended Production Settings

```yaml
systemLog:
  verbosity: 0
  component:
    query:
      verbosity: 1

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
```

Start with verbosity 0 globally and raise individual components only when debugging. Keep `slowOpThresholdMs` at 100ms for general production use; lower it to 50ms during active performance investigations.

## Summary

`logLevel` controls how much detail MongoDB writes to its log, with component-level granularity available for targeted debugging. `slowOpThresholdMs` marks operations as slow when they exceed the threshold, enabling the profiler and log-based performance analysis. Use both together to capture actionable data while keeping log volume manageable in production.
