# How to Configure MongoDB maxIncomingConnections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Connection, Configuration, Performance, Operation

Description: Learn how to configure MongoDB's maxIncomingConnections setting, choose the right limit for your workload, and monitor connection usage to prevent exhaustion.

---

## Introduction

MongoDB has a configurable limit on the number of simultaneous incoming connections. Each connection consumes memory (approximately 1 MB per connection for the connection buffer plus overhead). Setting `maxIncomingConnections` prevents a connection storm from exhausting server memory and helps you enforce a connection budget across your application.

## Default Connection Limits

The default `maxIncomingConnections` is 65536. In practice, the real limit is bounded by the lower of this setting, available file descriptors, and system memory.

Check the current limit:

```javascript
db.adminCommand({ serverStatus: 1 }).connections
```

Output:

```javascript
{
  current: 45,
  available: 65491,     // maxIncomingConnections - current
  totalCreated: 312,
  rejected: 0,
  active: 12,
  threaded: 12,
  exhaustIsMaster: 0,
  exhaustHello: 5
}
```

## Setting maxIncomingConnections

### Via mongod.conf (Persistent)

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0
  maxIncomingConnections: 5000
```

Restart mongod:

```bash
sudo systemctl restart mongod
```

### Via setParameter (Runtime, No Restart)

```javascript
db.adminCommand({
  setParameter: 1,
  maxIncomingConnections: 5000
})
```

Verify:

```javascript
db.adminCommand({ getParameter: 1, maxIncomingConnections: 1 })
```

## Calculating the Right Limit

A rough formula:

```text
maxIncomingConnections = (Available RAM for connections) / (Memory per connection)
```

Each connection uses approximately:
- 1 MB minimum (connection buffer)
- Additional memory for in-flight operations

Example for a 32 GB server with 8 GB reserved for WiredTiger cache and 4 GB for OS:

```text
Available for connections: 32 - 8 - 4 = 20 GB = 20,000 MB
Safe max connections: 20,000 / 1 MB = ~20,000 (conservative estimate)
```

However, consider that connections from connection pools should be sized at the application level too.

## System File Descriptors (ulimit)

MongoDB requires one file descriptor per connection. Check the limit:

```bash
ulimit -n    # Soft limit
ulimit -Hn   # Hard limit

# Increase if needed (add to /etc/security/limits.conf)
mongod soft nofile 64000
mongod hard nofile 64000
```

Check the file descriptor limit from MongoDB:

```javascript
db.adminCommand({ serverStatus: 1 }).extra_info
```

## Monitoring Connection Usage

```javascript
// Real-time connection breakdown
var conn = db.adminCommand({ serverStatus: 1 }).connections
print("Current connections:", conn.current)
print("Available remaining:", conn.available)
print("Total ever created:", conn.totalCreated)
print("Rejected (limit hit):", conn.rejected)

// Check if connections are from expected clients
db.adminCommand({ currentOp: 1, $all: true }).inprog.forEach(op => {
  if (op.client) print(op.client, op.appName || "no-app-name")
})
```

## Alerting on High Connection Usage

Set up a monitoring script that alerts when usage exceeds a threshold:

```javascript
function checkConnections(warnPercent, critPercent) {
  var s = db.adminCommand({ serverStatus: 1 }).connections
  var max = s.current + s.available
  var usedPercent = (s.current / max) * 100

  print("Used:", s.current + "/" + max + " (" + usedPercent.toFixed(1) + "%)")

  if (usedPercent >= critPercent) {
    print("CRITICAL: Connection usage above " + critPercent + "%")
  } else if (usedPercent >= warnPercent) {
    print("WARNING: Connection usage above " + warnPercent + "%")
  } else {
    print("OK")
  }
}

checkConnections(70, 90)
```

## Connection Pooling Best Practices

Reducing unnecessary connections is more effective than increasing the limit. Configure your application driver's connection pool:

```javascript
// Node.js - limit the pool size
const client = new MongoClient("mongodb://localhost:27017/", {
  maxPoolSize: 10,      // Max connections per mongod (default: 100)
  minPoolSize: 2,       // Keep minimum connections open
  maxIdleTimeMS: 60000  // Close idle connections after 60 seconds
})
```

```properties
# Spring Boot application.properties
spring.data.mongodb.uri=mongodb://localhost:27017/mydb?maxPoolSize=20&minPoolSize=5
```

## Separate Limits for mongos Routers

In a sharded cluster, configure `maxIncomingConnections` on both mongos and mongod:

```yaml
# mongos.conf
net:
  maxIncomingConnections: 10000   # Limit from application clients

# mongod.conf (shard)
net:
  maxIncomingConnections: 5000    # Limit from mongos routers
```

## What Happens When the Limit Is Reached

When a connection attempt exceeds `maxIncomingConnections`, MongoDB:

1. Rejects the connection immediately
2. Returns: `connection refused: too many open connections`
3. Increments `connections.rejected` in serverStatus

```javascript
// Check rejected connections over time
db.adminCommand({ serverStatus: 1 }).connections.rejected
```

## Summary

Configure `maxIncomingConnections` in `mongod.conf` or at runtime via `setParameter` to prevent connection exhaustion. Calculate the limit based on available RAM and expected connection memory usage. Always tune your application's connection pool size to keep total connections well below the server limit. Monitor `connections.current`, `connections.available`, and `connections.rejected` with your observability tooling and alert before the limit is reached.
