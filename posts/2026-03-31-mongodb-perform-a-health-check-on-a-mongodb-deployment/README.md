# How to Perform a Health Check on a MongoDB Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Health Check, Monitoring

Description: Learn how to run comprehensive MongoDB health checks covering connectivity, replication status, index health, and storage engine metrics.

---

## What to Check in a MongoDB Health Check

A MongoDB health check goes beyond simply pinging the server. A healthy deployment requires healthy replication, adequate disk space, balanced connections, and no runaway queries. This guide walks through a systematic health check you can run manually or automate.

## Step 1: Connectivity and Server Status

```bash
# Basic connectivity check
mongosh --eval "db.adminCommand({ ping: 1 })"

# Full server status summary
mongosh --eval "db.serverStatus()" | head -100
```

Key fields to examine:

```javascript
// Get uptime and version
db.adminCommand({ buildInfo: 1 })

// Check for any active asserts (non-zero is concerning)
db.serverStatus().asserts
```

## Step 2: Replica Set Health

```bash
mongosh --eval "rs.status()"
```

Parse the output for members not in `PRIMARY` or `SECONDARY` state:

```javascript
rs.status().members.forEach(m => {
  if (!['PRIMARY', 'SECONDARY'].includes(m.stateStr)) {
    print(`WARN: ${m.name} is in state ${m.stateStr}`)
  }
})
```

Check replication lag:

```javascript
var status = rs.status()
var primary = status.members.find(m => m.stateStr === 'PRIMARY')
status.members.forEach(m => {
  if (m.stateStr === 'SECONDARY') {
    var lag = primary.optimeDate - m.optimeDate
    print(`${m.name} lag: ${lag / 1000}s`)
  }
})
```

## Step 3: Connection Pool Health

```javascript
var conns = db.serverStatus().connections
print(`Current: ${conns.current}, Available: ${conns.available}, Total created: ${conns.totalCreated}`)

var utilizationPct = (conns.current / (conns.current + conns.available)) * 100
if (utilizationPct > 75) {
  print(`WARN: Connection utilization at ${utilizationPct.toFixed(1)}%`)
}
```

## Step 4: WiredTiger Cache Health

```javascript
var wt = db.serverStatus().wiredTiger.cache
var dirtyPct = wt['tracked dirty bytes in the cache'] / wt['maximum bytes configured'] * 100
var usedPct  = wt['bytes currently in the cache'] / wt['maximum bytes configured'] * 100

print(`Cache used: ${usedPct.toFixed(1)}%, dirty: ${dirtyPct.toFixed(1)}%`)
```

Dirty cache above 20% or used cache above 95% are warning signs.

## Step 5: Disk Space

```bash
df -h /var/lib/mongodb
```

```javascript
// Check database sizes in MB
db.adminCommand({ listDatabases: 1 }).databases.forEach(d => {
  print(`${d.name}: ${(d.sizeOnDisk / 1024 / 1024).toFixed(1)} MB`)
})
```

## Step 6: Long-Running Operations

```javascript
db.currentOp({ "secs_running": { "$gt": 30 } }).inprog.forEach(op => {
  print(`OpId: ${op.opid}, Secs: ${op.secs_running}, ns: ${op.ns}, type: ${op.type}`)
})
```

## Automated Health Check Script

```bash
#!/bin/bash
MONGO_URI="mongodb://monitor:password@localhost:27017"

echo "=== MongoDB Health Check ==="
echo "Ping:"
mongosh "$MONGO_URI" --quiet --eval "db.adminCommand({ping:1})"

echo "Replica Set Status:"
mongosh "$MONGO_URI" --quiet --eval "rs.status().members.map(m => m.name + ': ' + m.stateStr)"

echo "Connections:"
mongosh "$MONGO_URI" --quiet --eval \
  "var c = db.serverStatus().connections; print('Current: ' + c.current + ', Available: ' + c.available)"
```

## Summary

A thorough MongoDB health check covers five areas: server connectivity, replica set state and replication lag, connection pool utilization, WiredTiger cache ratios, and long-running operations. Automate this check using a shell script and schedule it via cron or your monitoring system. Feed the results into your observability platform to build trend data over time.
