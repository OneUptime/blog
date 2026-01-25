# How to Monitor MongoDB with Profiler and Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Profiler, Performance, Metrics

Description: Learn how to use MongoDB's database profiler and metrics to identify slow queries, monitor performance, and troubleshoot database issues with practical examples.

---

Slow queries can bring your application to a crawl, but finding them requires visibility into what MongoDB is actually doing. The database profiler captures detailed information about operations, while server metrics give you the big picture of resource usage and throughput.

## Understanding the MongoDB Profiler

The profiler records operations that exceed a time threshold, storing them in a capped collection called `system.profile`. You can then query this collection to analyze slow operations.

```javascript
// Check current profiler status
db.getProfilingStatus()
// Returns: { was: 0, slowms: 100 }
// was: 0 = off, 1 = slow ops only, 2 = all ops

// Set profiler to capture slow operations (>100ms)
db.setProfilingLevel(1, { slowms: 100 })

// Set profiler to capture all operations (use sparingly!)
db.setProfilingLevel(2)

// Disable profiler
db.setProfilingLevel(0)
```

## Configuring the Profiler

Configure profiling at startup or dynamically per database.

```yaml
# mongod.conf - startup configuration
operationProfiling:
  # 0=off, 1=slowOps, 2=all
  mode: slowOp
  # Threshold in milliseconds
  slowOpThresholdMs: 100
  # Sample rate for profiling (1.0 = 100%)
  slowOpSampleRate: 1.0
```

```javascript
// Dynamic configuration per database
// Profile queries slower than 50ms, sample 50% of them
db.setProfilingLevel(1, {
  slowms: 50,
  sampleRate: 0.5
});

// Verify settings
const status = db.getProfilingStatus();
print(`Profiling level: ${status.was}`);
print(`Slow threshold: ${status.slowms}ms`);
print(`Sample rate: ${status.sampleRate * 100}%`);
```

## Analyzing Profiler Output

The `system.profile` collection contains rich operation details.

```javascript
// Find the 10 slowest queries in the last hour
db.system.profile.find({
  ts: { $gt: new Date(Date.now() - 3600000) },
  op: "query"  // Filter to only query operations
}).sort({ millis: -1 }).limit(10).forEach(doc => {
  print(`\n--- Slow Query (${doc.millis}ms) ---`);
  print(`Collection: ${doc.ns}`);
  print(`Query: ${JSON.stringify(doc.command.filter || doc.command)}`);
  print(`Docs examined: ${doc.docsExamined}`);
  print(`Keys examined: ${doc.keysExamined}`);
  print(`Plan summary: ${doc.planSummary}`);
});

// Find queries doing collection scans (missing indexes)
db.system.profile.find({
  planSummary: "COLLSCAN",
  ts: { $gt: new Date(Date.now() - 86400000) }  // Last 24 hours
}).forEach(doc => {
  print(`COLLSCAN on ${doc.ns}: ${JSON.stringify(doc.command.filter)}`);
});

// Find operations with high document examination ratio
db.system.profile.aggregate([
  {
    $match: {
      ts: { $gt: new Date(Date.now() - 3600000) },
      nreturned: { $gt: 0 }
    }
  },
  {
    $project: {
      ns: 1,
      millis: 1,
      docsExamined: 1,
      nreturned: 1,
      ratio: { $divide: ["$docsExamined", "$nreturned"] },
      query: "$command.filter"
    }
  },
  {
    $match: { ratio: { $gt: 100 } }  // Examined 100x more docs than returned
  },
  { $sort: { ratio: -1 } },
  { $limit: 10 }
]);
```

## Key Server Metrics

MongoDB exposes metrics through `serverStatus` and `currentOp` commands.

```javascript
// Get comprehensive server statistics
const stats = db.serverStatus();

// Connection metrics
print("=== Connections ===");
print(`Current: ${stats.connections.current}`);
print(`Available: ${stats.connections.available}`);
print(`Total created: ${stats.connections.totalCreated}`);

// Operation counters
print("\n=== Operations ===");
const opcounters = stats.opcounters;
print(`Inserts: ${opcounters.insert}`);
print(`Queries: ${opcounters.query}`);
print(`Updates: ${opcounters.update}`);
print(`Deletes: ${opcounters.delete}`);
print(`Commands: ${opcounters.command}`);

// Memory usage
print("\n=== Memory ===");
const mem = stats.mem;
print(`Resident: ${mem.resident} MB`);
print(`Virtual: ${mem.virtual} MB`);
print(`Mapped: ${mem.mapped || 'N/A'} MB`);

// WiredTiger cache
if (stats.wiredTiger) {
  print("\n=== WiredTiger Cache ===");
  const cache = stats.wiredTiger.cache;
  print(`Cache size: ${Math.round(cache['maximum bytes configured'] / 1024 / 1024)} MB`);
  print(`Currently in cache: ${Math.round(cache['bytes currently in the cache'] / 1024 / 1024)} MB`);
  print(`Dirty bytes: ${Math.round(cache['tracked dirty bytes in the cache'] / 1024 / 1024)} MB`);
}
```

## Monitoring Active Operations

```javascript
// View currently running operations
db.currentOp({
  active: true,
  secs_running: { $gt: 5 }  // Running longer than 5 seconds
}).inprog.forEach(op => {
  print(`\n--- Active Operation ---`);
  print(`OpId: ${op.opid}`);
  print(`Type: ${op.op}`);
  print(`Namespace: ${op.ns}`);
  print(`Running for: ${op.secs_running}s`);
  print(`Client: ${op.client}`);
  if (op.command) {
    print(`Command: ${JSON.stringify(op.command).substring(0, 200)}`);
  }
});

// Kill a long-running operation
// db.killOp(opid)  // Use with caution!
```

## Building a Monitoring Dashboard

Create a script that collects key metrics for dashboards.

```javascript
// metrics-collector.js
// Collects MongoDB metrics and outputs JSON for monitoring systems

async function collectMetrics() {
  const stats = db.serverStatus();
  const replStatus = rs.status ? rs.status() : null;

  const metrics = {
    timestamp: new Date().toISOString(),

    // Connection metrics
    connections: {
      current: stats.connections.current,
      available: stats.connections.available,
      utilization: (stats.connections.current /
        (stats.connections.current + stats.connections.available) * 100).toFixed(2)
    },

    // Operation rates (calculate delta between collections for rate)
    operations: {
      insert: stats.opcounters.insert,
      query: stats.opcounters.query,
      update: stats.opcounters.update,
      delete: stats.opcounters.delete
    },

    // Memory
    memory: {
      residentMB: stats.mem.resident,
      virtualMB: stats.mem.virtual
    },

    // Replication lag (if replica set)
    replication: replStatus ? {
      state: replStatus.myState,
      lag: calculateReplicationLag(replStatus)
    } : null,

    // Slow queries in last minute
    slowQueries: db.system.profile.countDocuments({
      ts: { $gt: new Date(Date.now() - 60000) }
    }),

    // Index usage
    indexStats: await getIndexUsage()
  };

  return metrics;
}

function calculateReplicationLag(replStatus) {
  const primary = replStatus.members.find(m => m.stateStr === 'PRIMARY');
  const self = replStatus.members.find(m => m.self);

  if (!primary || !self || self.stateStr === 'PRIMARY') {
    return 0;
  }

  const primaryOptime = primary.optimeDate.getTime();
  const selfOptime = self.optimeDate.getTime();
  return (primaryOptime - selfOptime) / 1000;  // Lag in seconds
}

async function getIndexUsage() {
  const collections = await db.getCollectionNames();
  const usage = [];

  for (const coll of collections.slice(0, 10)) {  // Limit for performance
    const stats = await db[coll].aggregate([{ $indexStats: {} }]).toArray();
    for (const idx of stats) {
      if (idx.accesses.ops === 0) {
        usage.push({
          collection: coll,
          index: idx.name,
          unused: true
        });
      }
    }
  }

  return usage;
}

// Output metrics as JSON
printjson(collectMetrics());
```

## Setting Up Alerts

Define thresholds for alerting based on metrics.

```javascript
// alert-check.js
// Check metrics against thresholds and return alert status

const THRESHOLDS = {
  connectionUtilization: 80,      // Alert if >80% connections used
  replicationLagSeconds: 10,      // Alert if lag >10 seconds
  slowQueriesPerMinute: 50,       // Alert if >50 slow queries/min
  cacheEvictionRate: 1000         // Alert if >1000 evictions/sec
};

function checkAlerts() {
  const stats = db.serverStatus();
  const alerts = [];

  // Check connection utilization
  const connUtil = stats.connections.current /
    (stats.connections.current + stats.connections.available) * 100;
  if (connUtil > THRESHOLDS.connectionUtilization) {
    alerts.push({
      severity: 'warning',
      metric: 'connection_utilization',
      value: connUtil.toFixed(2),
      threshold: THRESHOLDS.connectionUtilization,
      message: `High connection utilization: ${connUtil.toFixed(2)}%`
    });
  }

  // Check replication lag
  try {
    const replStatus = rs.status();
    const primary = replStatus.members.find(m => m.stateStr === 'PRIMARY');
    const self = replStatus.members.find(m => m.self);

    if (primary && self && self.stateStr !== 'PRIMARY') {
      const lag = (primary.optimeDate - self.optimeDate) / 1000;
      if (lag > THRESHOLDS.replicationLagSeconds) {
        alerts.push({
          severity: 'critical',
          metric: 'replication_lag',
          value: lag,
          threshold: THRESHOLDS.replicationLagSeconds,
          message: `Replication lag: ${lag} seconds`
        });
      }
    }
  } catch (e) {
    // Not a replica set, skip
  }

  // Check slow queries
  const slowCount = db.system.profile.countDocuments({
    ts: { $gt: new Date(Date.now() - 60000) }
  });
  if (slowCount > THRESHOLDS.slowQueriesPerMinute) {
    alerts.push({
      severity: 'warning',
      metric: 'slow_queries',
      value: slowCount,
      threshold: THRESHOLDS.slowQueriesPerMinute,
      message: `High slow query count: ${slowCount}/min`
    });
  }

  return {
    timestamp: new Date().toISOString(),
    status: alerts.length > 0 ? 'alerting' : 'healthy',
    alerts: alerts
  };
}

printjson(checkAlerts());
```

## Index Usage Analysis

Monitor which indexes are being used and which are wasting resources.

```javascript
// Analyze index usage across collections
async function analyzeIndexUsage(db) {
  const collections = await db.listCollections().toArray();
  const report = [];

  for (const coll of collections) {
    if (coll.name.startsWith('system.')) continue;

    const indexStats = await db.collection(coll.name)
      .aggregate([{ $indexStats: {} }])
      .toArray();

    for (const idx of indexStats) {
      report.push({
        collection: coll.name,
        index: idx.name,
        accesses: idx.accesses.ops,
        since: idx.accesses.since,
        isUnused: idx.accesses.ops === 0,
        spec: idx.key
      });
    }
  }

  // Sort by usage (unused first)
  report.sort((a, b) => a.accesses - b.accesses);

  print("\n=== Unused Indexes (candidates for removal) ===");
  report.filter(r => r.isUnused && r.index !== '_id_').forEach(r => {
    print(`${r.collection}.${r.index}: ${JSON.stringify(r.spec)}`);
  });

  print("\n=== Most Used Indexes ===");
  report.filter(r => !r.isUnused).slice(-10).forEach(r => {
    print(`${r.collection}.${r.index}: ${r.accesses} accesses`);
  });

  return report;
}
```

## Summary

Effective MongoDB monitoring combines profiler analysis with server metrics:

- Use profiler level 1 to capture slow operations without significant overhead
- Query `system.profile` to identify missing indexes and inefficient queries
- Monitor `serverStatus` for connections, operations, and memory trends
- Track replication lag in replica sets to catch falling behind early
- Analyze index usage regularly to remove unused indexes
- Set up alerts on key thresholds before issues become outages

Start with basic monitoring, then add depth as you learn your application's patterns.
