# How to Monitor MongoDB Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Performance Monitoring, Metrics, Observability, Database Monitoring, Operations, DevOps

Description: A comprehensive guide to monitoring MongoDB performance, covering key metrics, built-in tools, external monitoring solutions, alerting strategies, and performance troubleshooting.

---

Effective MongoDB monitoring is essential for maintaining database health, identifying bottlenecks, and preventing outages. This guide covers the metrics that matter, tools to collect them, and strategies for proactive performance management.

## Key MongoDB Metrics

```mermaid
graph TD
    A[MongoDB Metrics] --> B[Operations]
    A --> C[Resources]
    A --> D[Replication]
    A --> E[Storage]

    B --> B1[Queries/sec]
    B --> B2[Insert/Update/Delete]
    B --> B3[Command latency]

    C --> C1[CPU Usage]
    C --> C2[Memory Usage]
    C --> C3[Connections]

    D --> D1[Replication Lag]
    D --> D2[Oplog Window]
    D --> D3[Election Count]

    E --> E1[Data Size]
    E --> E2[Index Size]
    E --> E3[Disk I/O]
```

## Built-in Monitoring Commands

### serverStatus

```javascript
// Get comprehensive server statistics
db.serverStatus()

// Key sections to monitor
const status = db.serverStatus();

// Connections
print(`Current connections: ${status.connections.current}`);
print(`Available connections: ${status.connections.available}`);

// Operations
print(`Queries: ${status.opcounters.query}`);
print(`Inserts: ${status.opcounters.insert}`);
print(`Updates: ${status.opcounters.update}`);
print(`Deletes: ${status.opcounters.delete}`);

// Memory
print(`Resident memory: ${status.mem.resident} MB`);
print(`Virtual memory: ${status.mem.virtual} MB`);

// WiredTiger cache
print(`Cache used: ${status.wiredTiger.cache['bytes currently in the cache']}`);
print(`Cache max: ${status.wiredTiger.cache['maximum bytes configured']}`);
```

### currentOp

```javascript
// View current operations
db.currentOp()

// Find slow operations (running > 5 seconds)
db.currentOp({
  "active": true,
  "secs_running": { "$gt": 5 }
})

// Find operations on specific collection
db.currentOp({
  "active": true,
  "ns": "mydb.users"
})

// Find operations waiting for locks
db.currentOp({
  "waitingForLock": true
})

// Kill a long-running operation
db.killOp(opId)
```

### dbStats and collStats

```javascript
// Database statistics
db.stats()

// Collection statistics
db.collection.stats()

// Detailed collection stats with index sizes
const stats = db.collection.stats({ indexDetails: true });
print(`Document count: ${stats.count}`);
print(`Data size: ${stats.size / 1024 / 1024} MB`);
print(`Storage size: ${stats.storageSize / 1024 / 1024} MB`);
print(`Index size: ${stats.totalIndexSize / 1024 / 1024} MB`);
```

## Command-Line Monitoring Tools

### mongostat

```bash
# Real-time statistics
mongostat --host localhost:27017

# With authentication
mongostat --host localhost:27017 -u admin -p password --authenticationDatabase admin

# Output key metrics
# insert query update delete - operations per second
# qrw arw - read/write queue lengths
# conn - current connections
# res - resident memory (MB)
# time - timestamp

# Discover all replica set members
mongostat --discover --host rs0/primary:27017
```

### mongotop

```bash
# Track time spent on collections
mongotop 5  # Refresh every 5 seconds

# Output
#                    ns    total    read   write
# mydb.users                10ms     8ms     2ms
# mydb.orders               25ms    15ms    10ms

# With authentication
mongotop --host localhost:27017 -u admin -p password --authenticationDatabase admin
```

## Profiler for Query Analysis

```javascript
// Enable profiling (level 1 = slow queries only)
db.setProfilingLevel(1, { slowms: 100 })

// Enable profiling for all operations (use cautiously)
db.setProfilingLevel(2)

// Query the profiler
db.system.profile.find().sort({ ts: -1 }).limit(10).pretty()

// Find slow queries by collection
db.system.profile.find({
  ns: "mydb.users",
  millis: { $gt: 100 }
}).sort({ millis: -1 })

// Find collection scans
db.system.profile.find({
  "planSummary": "COLLSCAN"
}).sort({ ts: -1 })

// Analyze query patterns
db.system.profile.aggregate([
  { $match: { ns: "mydb.users" } },
  { $group: {
    _id: "$command.filter",
    count: { $sum: 1 },
    avgTime: { $avg: "$millis" },
    maxTime: { $max: "$millis" }
  }},
  { $sort: { count: -1 } }
])
```

## Monitoring Replication

```javascript
// Replica set status
rs.status()

// Check replication lag
rs.printSecondaryReplicationInfo()

// Monitor oplog size and window
rs.printReplicationInfo()

// Automated lag monitoring
const checkReplicationLag = () => {
  const status = rs.status();
  const primary = status.members.find(m => m.stateStr === 'PRIMARY');

  status.members.forEach(member => {
    if (member.stateStr === 'SECONDARY') {
      const lagSeconds = (primary.optimeDate - member.optimeDate) / 1000;
      print(`${member.name}: ${lagSeconds}s lag`);

      if (lagSeconds > 10) {
        print(`WARNING: High replication lag on ${member.name}`);
      }
    }
  });
};
```

## External Monitoring Solutions

### Prometheus and MongoDB Exporter

```yaml
# docker-compose.yml for MongoDB exporter
version: '3'
services:
  mongodb-exporter:
    image: percona/mongodb_exporter:0.40
    environment:
      - MONGODB_URI=mongodb://user:pass@mongodb:27017
    ports:
      - "9216:9216"
    command:
      - '--collect-all'
      - '--compatible-mode'
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']
```

### Key Prometheus Queries

```promql
# Operations per second
rate(mongodb_op_counters_total[5m])

# Connection utilization
mongodb_connections{state="current"} / mongodb_connections{state="available"} * 100

# Replication lag in seconds
mongodb_mongod_replset_member_replication_lag

# Memory usage
mongodb_memory{type="resident"}

# Cache hit ratio
rate(mongodb_wiredtiger_cache_bytes_read_into_cache[5m]) /
(rate(mongodb_wiredtiger_cache_bytes_read_into_cache[5m]) +
 rate(mongodb_wiredtiger_cache_bytes_written_from_cache[5m]))

# Query targeting efficiency
mongodb_mongod_metrics_query_executor_total{state="scanned_objects"} /
mongodb_mongod_metrics_query_executor_total{state="returned"}
```

### Grafana Dashboard Panels

```json
{
  "panels": [
    {
      "title": "Operations/sec",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(mongodb_op_counters_total[5m])",
          "legendFormat": "{{type}}"
        }
      ]
    },
    {
      "title": "Active Connections",
      "type": "gauge",
      "targets": [
        {
          "expr": "mongodb_connections{state='current'}"
        }
      ]
    },
    {
      "title": "Replication Lag",
      "type": "graph",
      "targets": [
        {
          "expr": "mongodb_mongod_replset_member_replication_lag",
          "legendFormat": "{{member}}"
        }
      ]
    }
  ]
}
```

## Custom Monitoring Script

```javascript
// monitoring.js - Custom monitoring script
const MongoClient = require('mongodb').MongoClient;

class MongoDBMonitor {
  constructor(uri) {
    this.client = new MongoClient(uri);
    this.metrics = {};
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db('admin');
  }

  async collectMetrics() {
    const serverStatus = await this.db.command({ serverStatus: 1 });

    this.metrics = {
      timestamp: new Date(),

      // Connections
      connections: {
        current: serverStatus.connections.current,
        available: serverStatus.connections.available,
        utilization: (serverStatus.connections.current /
          (serverStatus.connections.current + serverStatus.connections.available)) * 100
      },

      // Operations
      operations: {
        query: serverStatus.opcounters.query,
        insert: serverStatus.opcounters.insert,
        update: serverStatus.opcounters.update,
        delete: serverStatus.opcounters.delete
      },

      // Memory
      memory: {
        resident: serverStatus.mem.resident,
        virtual: serverStatus.mem.virtual
      },

      // WiredTiger
      cache: {
        bytesInCache: serverStatus.wiredTiger.cache['bytes currently in the cache'],
        maxBytes: serverStatus.wiredTiger.cache['maximum bytes configured'],
        utilization: (serverStatus.wiredTiger.cache['bytes currently in the cache'] /
          serverStatus.wiredTiger.cache['maximum bytes configured']) * 100
      },

      // Replication (if replica set)
      replication: await this.getReplicationMetrics()
    };

    return this.metrics;
  }

  async getReplicationMetrics() {
    try {
      const replStatus = await this.db.command({ replSetGetStatus: 1 });
      const primary = replStatus.members.find(m => m.stateStr === 'PRIMARY');

      return {
        setName: replStatus.set,
        members: replStatus.members.map(m => ({
          name: m.name,
          state: m.stateStr,
          health: m.health,
          lagSeconds: primary && m.stateStr === 'SECONDARY'
            ? (primary.optimeDate - m.optimeDate) / 1000
            : 0
        }))
      };
    } catch (e) {
      return null; // Not a replica set
    }
  }

  async checkHealth() {
    const metrics = await this.collectMetrics();
    const issues = [];

    // Check connection utilization
    if (metrics.connections.utilization > 80) {
      issues.push({
        severity: 'warning',
        message: `High connection utilization: ${metrics.connections.utilization.toFixed(1)}%`
      });
    }

    // Check cache utilization
    if (metrics.cache.utilization > 95) {
      issues.push({
        severity: 'critical',
        message: `WiredTiger cache nearly full: ${metrics.cache.utilization.toFixed(1)}%`
      });
    }

    // Check replication lag
    if (metrics.replication) {
      metrics.replication.members.forEach(member => {
        if (member.lagSeconds > 10) {
          issues.push({
            severity: 'warning',
            message: `High replication lag on ${member.name}: ${member.lagSeconds}s`
          });
        }
      });
    }

    return {
      healthy: issues.filter(i => i.severity === 'critical').length === 0,
      metrics,
      issues
    };
  }
}

// Usage
const monitor = new MongoDBMonitor('mongodb://localhost:27017');
await monitor.connect();

setInterval(async () => {
  const health = await monitor.checkHealth();
  console.log(JSON.stringify(health, null, 2));

  // Send to monitoring system
  if (!health.healthy) {
    // Send alert
  }
}, 60000); // Every minute
```

## Alerting Strategy

### Critical Alerts (Page immediately)

| Metric | Threshold | Condition |
|--------|-----------|-----------|
| Replica set has no primary | N/A | Primary unavailable |
| Replication lag | > 60 seconds | Extended lag |
| Connection pool exhausted | > 95% utilized | Connections maxed |
| Disk space | < 10% free | Disk nearly full |

### Warning Alerts (Notify team)

| Metric | Threshold | Condition |
|--------|-----------|-----------|
| Slow queries | > 50/minute | Query performance degrading |
| Cache hit ratio | < 80% | Memory pressure |
| Replication lag | > 10 seconds | Lag building |
| Connection utilization | > 70% | Approaching limit |

### Example Alert Rules

```yaml
# Prometheus alert rules
groups:
  - name: mongodb-alerts
    rules:
      - alert: MongoDBDown
        expr: up{job="mongodb"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB instance down"

      - alert: MongoDBHighConnections
        expr: mongodb_connections{state="current"} / mongodb_connections{state="available"} > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB connection utilization > 80%"

      - alert: MongoDBReplicationLag
        expr: mongodb_mongod_replset_member_replication_lag > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB replication lag > 10 seconds"

      - alert: MongoDBNoPrimary
        expr: mongodb_mongod_replset_member_state{state="PRIMARY"} != 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB replica set has no primary"
```

## Performance Troubleshooting Checklist

1. **Check current operations** - `db.currentOp()` for stuck queries
2. **Review slow query log** - `db.system.profile` for patterns
3. **Verify index usage** - `explain()` on slow queries
4. **Monitor replication** - `rs.status()` for lag
5. **Check resource utilization** - CPU, memory, disk I/O
6. **Review connection count** - Connection pool exhaustion
7. **Analyze cache efficiency** - WiredTiger cache hit ratio
8. **Examine lock contention** - `serverStatus().locks`

## Summary

Effective MongoDB monitoring combines built-in tools like `serverStatus` and the profiler with external solutions like Prometheus and Grafana. Focus on the metrics that matter most - connections, operations, replication lag, and resource utilization. Set up meaningful alerts that catch problems before they become outages, and establish regular review processes to identify trends and optimization opportunities. With proper monitoring in place, you can maintain healthy MongoDB deployments and quickly resolve issues when they arise.
