# How to Configure MongoDB Monitoring for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Production, Metric, Observability

Description: Learn how to configure comprehensive MongoDB monitoring for production using Atlas monitoring, mongostat, mongotop, and custom serverStatus metrics.

---

## Key Metrics to Monitor in Production

Production MongoDB monitoring should cover five areas:
- **Replication** - replica set health and replication lag
- **Queries** - slow operations, cache hit rate, index utilization
- **Connections** - active connections vs pool limits
- **Memory** - WiredTiger cache usage, page faults
- **Disk I/O** - dirty bytes in cache, flush frequency

## Step 1: Enable Slow Operation Profiling

Configure MongoDB to log operations exceeding your threshold:

```yaml
# mongod.conf
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
  slowOpSampleRate: 0.5  # Sample 50% of slow ops
```

Or set dynamically without restarting:

```javascript
db.setProfilingLevel(1, { slowms: 100, sampleRate: 0.5 });
```

Query the profiler:

```javascript
// Find the slowest queries in the last hour
db.system.profile.find({
  ts: { $gt: new Date(Date.now() - 3600000) }
}).sort({ millis: -1 }).limit(10).pretty();
```

## Step 2: Monitor Key Metrics with serverStatus

Create a monitoring script that captures essential metrics:

```javascript
function getMonitoringSnapshot() {
  const status = db.adminCommand({ serverStatus: 1 });

  return {
    timestamp: new Date(),

    // Connections
    connectionsActive: status.connections.current,
    connectionsAvailable: status.connections.available,

    // Operations (cumulative counters)
    opsInsert: status.opcounters.insert,
    opsQuery: status.opcounters.query,
    opsUpdate: status.opcounters.update,
    opsDelete: status.opcounters.delete,

    // WiredTiger cache
    cacheUsedBytes: status.wiredTiger.cache["bytes currently in the cache"],
    cacheMaxBytes: status.wiredTiger.cache["maximum bytes configured"],
    cacheDirtyBytes: status.wiredTiger.cache["tracked dirty bytes in the cache"],
    cacheReadIntoCacheMiss: status.wiredTiger.cache["pages read into cache"],

    // Memory
    residentMB: status.mem.resident,
    virtualMB: status.mem.virtual
  };
}

const snap = getMonitoringSnapshot();
const cacheUtilPct = (snap.cacheUsedBytes / snap.cacheMaxBytes * 100).toFixed(1);
print(`Cache: ${cacheUtilPct}% | Connections: ${snap.connectionsActive} | Resident: ${snap.residentMB}MB`);
```

## Step 3: Set Up mongostat for Real-Time Monitoring

Use `mongostat` to stream live metrics to your monitoring system:

```bash
# Output key metrics every 5 seconds
mongostat \
  --uri="mongodb+srv://monitor:pass@cluster.mongodb.net" \
  --rowcount=0 \
  -o "insert,query,update,delete,conn,netIn,netOut,res,faults,qrw,arw,time" \
  5
```

Pipe to a log file for ingestion by Prometheus or Datadog:

```bash
mongostat --uri="$MONGO_URI" --rowcount=0 60 \
  >> /var/log/mongodb/mongostat.log 2>&1 &
```

## Step 4: Monitor Replication Lag

Check replication lag across all replica set members:

```javascript
function checkReplicationLag() {
  const rsStatus = rs.status();
  const primary = rsStatus.members.find(m => m.state === 1);

  rsStatus.members.forEach(member => {
    if (member.state === 2) { // SECONDARY
      const lagSecs = (primary.optimeDate - member.optimeDate) / 1000;
      print(`${member.name}: replication lag = ${lagSecs.toFixed(1)}s`);

      if (lagSecs > 30) {
        print(`  WARNING: Lag exceeds 30 seconds!`);
      }
    }
  });
}

checkReplicationLag();
```

## Step 5: Set Up Atlas Monitoring Alerts

Configure automated alerts in MongoDB Atlas:

```bash
# Create a metric threshold alert for high connection count
curl -u "PUBLIC_KEY:PRIVATE_KEY" \
  --digest \
  -X POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/alertConfigs" \
  -H "Content-Type: application/json" \
  -d '{
    "eventTypeName": "CONNECTIONS_PERCENT_OVER_CONFIGURED_LIMIT",
    "enabled": true,
    "threshold": {
      "operator": "GREATER_THAN",
      "threshold": 80
    },
    "notifications": [{
      "typeName": "EMAIL",
      "emailEnabled": true,
      "emailAddress": "ops@example.com",
      "intervalMin": 5,
      "delayMin": 5
    }]
  }'
```

## Step 6: Export Metrics to Prometheus

Use the MongoDB exporter for Prometheus integration:

```bash
# Run the MongoDB Prometheus exporter
docker run -d \
  --name mongodb-exporter \
  -p 9216:9216 \
  percona/mongodb_exporter:latest \
  --mongodb.uri="mongodb://monitor:pass@mongo:27017" \
  --collect-all \
  --compatible-mode
```

Key metrics to alert on in Prometheus:

```yaml
# prometheus-alerts.yml
- alert: MongoDBHighReplicationLag
  expr: mongodb_mongod_replset_member_replication_lag_seconds > 30
  for: 2m
  labels:
    severity: warning

- alert: MongoDBLowCacheHitRatio
  expr: rate(mongodb_wiredtiger_cache_read_into_cache_total[5m]) > 100
  for: 5m
  labels:
    severity: warning
```

## Summary

Configuring MongoDB monitoring for production requires enabling slow operation profiling, capturing key `serverStatus` metrics covering connections, WiredTiger cache, and opcounters, using `mongostat` for real-time streaming, monitoring replication lag on all secondaries, and routing metrics to alerting systems like Atlas Alerts or Prometheus. Establish alert thresholds before launch so you are notified of issues before users are affected.
