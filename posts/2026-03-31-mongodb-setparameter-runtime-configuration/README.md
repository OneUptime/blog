# How to Use setParameter for Runtime Configuration in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, setParameter, Configuration, Performance, Administration

Description: Learn how to use MongoDB's setParameter command to change runtime configuration without restarting mongod, including key parameters for performance and diagnostics.

---

MongoDB's `setParameter` command allows you to change many server configuration values at runtime without restarting `mongod`. This is essential for production tuning, incident response, and A/B testing configuration changes.

## Basic Usage

```javascript
// Set a parameter
db.adminCommand({ setParameter: 1, <parameterName>: <value> });

// Get current value
db.adminCommand({ getParameter: 1, <parameterName>: 1 });
```

## Viewing All Settable Parameters

```javascript
db.adminCommand({ getParameter: "*" })
```

This returns a large document with all current parameter values.

## Common Performance Parameters

### Slow Operation Threshold

```javascript
// Set slow op threshold to 200ms
db.adminCommand({ setParameter: 1, slowOpThresholdMs: 200 });

// Verify
db.adminCommand({ getParameter: 1, slowOpThresholdMs: 1 });
```

### Profiling Mode

Profiling is not controlled via `setParameter`. Use the `profile` command or the shell helper instead:

```javascript
// 0=off, 1=slow ops, 2=all
db.setProfilingLevel(1);

// Or equivalently:
db.runCommand({ profile: 1 });
```

### WiredTiger Engine Settings

```javascript
// Resize cache at runtime
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "cache_size=8G"
});

// Add eviction threads
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "eviction=(threads_min=4,threads_max=8)"
});
```

### Transaction Lifetime

```javascript
db.adminCommand({ setParameter: 1, transactionLifetimeLimitSeconds: 30 });
```

### TTL Monitor Sleep Interval

```javascript
// Run TTL cleanup every 30 seconds instead of 60
db.adminCommand({ setParameter: 1, ttlMonitorSleepSecs: 30 });
```

### Concurrent Transactions (Tickets)

```javascript
// MongoDB 6.0+ (renamed from wiredTigerConcurrent*Transactions)
db.adminCommand({ setParameter: 1, storageEngineConcurrentReadTransactions: 256 });
db.adminCommand({ setParameter: 1, storageEngineConcurrentWriteTransactions: 128 });
```

## Diagnostic Parameters

### Enable Flow Control

```javascript
// Flow control prevents lagging from replication pressure
db.adminCommand({ setParameter: 1, enableFlowControl: true });
```

### Chunk Migration Concurrency

```javascript
// For sharded clusters (MongoDB 6.0+)
db.adminCommand({ setParameter: 1, chunkMigrationConcurrency: 1 });
```

### Log Verbosity

```javascript
// Increase query logging verbosity
db.adminCommand({
  setParameter: 1,
  logComponentVerbosity: {
    query: { verbosity: 2 }
  }
});

// Reset to default
db.adminCommand({
  setParameter: 1,
  logComponentVerbosity: {
    query: { verbosity: 0 }
  }
});
```

## Important Limitations

Not all parameters can be set via `setParameter`:

```text
Can set at runtime:    slowOpThresholdMs, transactionLifetimeLimitSeconds,
                       wiredTigerEngineRuntimeConfig, ttlMonitorSleepSecs

Requires restart:      storage.wiredTiger.engineConfig.cacheSizeGB (in config file),
                       replication.oplogSizeMB (use replSetResizeOplog instead),
                       net.port
```

## Verifying Parameter Persistence

`setParameter` changes **do not persist** across restarts. Always update `mongod.conf` to make changes permanent:

```yaml
operationProfiling:
  slowOpThresholdMs: 200
  mode: slowOp
```

Then verify your live setting matches the config:

```javascript
const live   = db.adminCommand({ getParameter: 1, slowOpThresholdMs: 1 }).slowOpThresholdMs;
const config = 200;  // your expected value from mongod.conf
print("Live:", live, "Config:", config, "Match:", live === config);
```

## Summary

`setParameter` is your primary tool for runtime configuration changes in MongoDB. Use it for immediate tuning during incidents (cache size, eviction threads, slow op threshold) and diagnostic tasks (log verbosity, profiling). Remember that these changes are ephemeral - always update `mongod.conf` to preserve them across restarts. Test parameter changes in staging before applying to production, and document what you changed and why for operational runbooks.
