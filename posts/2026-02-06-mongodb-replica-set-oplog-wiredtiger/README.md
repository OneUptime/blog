# How to Monitor MongoDB Replica Set Health, Oplog Window, and WiredTiger Cache with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, MongoDB, Replica Set, WiredTiger

Description: Monitor MongoDB replica set health, oplog window duration, and WiredTiger cache usage using the OpenTelemetry Collector MongoDB receiver for database visibility.

MongoDB replica sets provide high availability and read scaling. The oplog (operations log) drives replication between the primary and secondaries. The WiredTiger storage engine manages the cache that holds working data in memory. Monitoring all three components gives you a complete picture of MongoDB health.

## Collector Configuration

```yaml
receivers:
  mongodb:
    hosts:
      - endpoint: "mongodb-primary:27017"
    username: monitoring
    password: "${MONGODB_PASSWORD}"
    auth_source: admin
    collection_interval: 15s
    tls:
      insecure: true
    metrics:
      mongodb.operation.count:
        enabled: true
      mongodb.operation.time:
        enabled: true
      mongodb.connection.count:
        enabled: true
      mongodb.memory.usage:
        enabled: true
      mongodb.cache.operations:
        enabled: true
      mongodb.cursor.count:
        enabled: true
      mongodb.document.operation.count:
        enabled: true
      mongodb.network.io.receive:
        enabled: true
      mongodb.network.io.transmit:
        enabled: true
      mongodb.global_lock.time:
        enabled: true

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: mongodb
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [mongodb]
      processors: [resource, batch]
      exporters: [otlp]
```

## Replica Set Health

### Member Status

MongoDB replica set members can be in several states:

```
PRIMARY (1)    - The writable member
SECONDARY (2)  - Read-only replica, in sync with primary
RECOVERING (3) - Catching up to the primary
ARBITER (7)    - Voting member with no data
DOWN (8)       - Unreachable
```

Query replica set status:

```javascript
// Run on any replica set member
rs.status()
```

### Replication Lag

```
mongodb.replication.lag - Seconds behind the primary
```

You can also calculate lag from oplog timestamps:

```javascript
// On the primary
var primary = rs.status().members.find(m => m.stateStr === "PRIMARY");
var secondary = rs.status().members.find(m => m.stateStr === "SECONDARY");

var lagSeconds = (primary.optimeDate - secondary.optimeDate) / 1000;
print("Replication lag: " + lagSeconds + " seconds");
```

## Oplog Window

The oplog is a capped collection that stores recent write operations. The "oplog window" is the time span of operations stored in the oplog. If a secondary falls behind by more than the oplog window, it cannot catch up and requires a full resync.

### Checking Oplog Window

```javascript
// Run on the primary
var oplog = db.getSiblingDB("local").oplog.rs;
var first = oplog.find().sort({$natural: 1}).limit(1).next();
var last = oplog.find().sort({$natural: -1}).limit(1).next();

var windowSeconds = (last.ts.getTime() - first.ts.getTime());
var windowHours = windowSeconds / 3600;
print("Oplog window: " + windowHours.toFixed(1) + " hours");
```

### Oplog Size

```javascript
var stats = db.getSiblingDB("local").oplog.rs.stats();
print("Oplog size: " + (stats.maxSize / 1024 / 1024) + " MB");
print("Oplog used: " + (stats.size / 1024 / 1024) + " MB");
```

## WiredTiger Cache Metrics

### Cache Usage

```
mongodb.cache.operations{type="read_into"}   - Pages read into cache
mongodb.cache.operations{type="written_from"} - Pages written from cache (evictions)
mongodb.memory.usage{type="resident"}         - Resident memory
mongodb.memory.usage{type="virtual"}          - Virtual memory
```

### WiredTiger-Specific Metrics

The serverStatus command provides detailed WiredTiger metrics:

```javascript
var status = db.serverStatus();
var wt = status.wiredTiger.cache;

print("Cache size: " + (wt["maximum bytes configured"] / 1024 / 1024) + " MB");
print("Cache used: " + (wt["bytes currently in the cache"] / 1024 / 1024) + " MB");
print("Dirty bytes: " + (wt["tracked dirty bytes in the cache"] / 1024 / 1024) + " MB");
print("Read into cache: " + wt["pages read into cache"]);
print("Written from cache: " + wt["pages written from cache"]);
```

### Cache Hit Ratio

```
cache_hit_ratio = 1 - (pages_read_into_cache / (pages_read_into_cache + pages_found_in_cache))
```

A ratio above 95% means most reads are served from memory.

## Creating a Monitoring User

```javascript
use admin
db.createUser({
    user: "monitoring",
    pwd: "monitor_password",
    roles: [
        { role: "clusterMonitor", db: "admin" },
        { role: "read", db: "local" }
    ]
});
```

The `clusterMonitor` role provides read-only access to monitoring data. The `read` role on `local` allows reading the oplog.

## Alert Conditions

```yaml
# Replica set member down
- alert: MongoDBReplicaDown
  condition: mongodb.member.state != 1 and mongodb.member.state != 2 and mongodb.member.state != 7
  severity: critical
  message: "MongoDB replica set member {{ member }} is in state {{ state }}"

# High replication lag
- alert: MongoDBReplicationLag
  condition: mongodb.replication.lag > 30
  for: 5m
  severity: warning
  message: "MongoDB secondary is {{ value }} seconds behind primary"

# Oplog window too small
- alert: MongoDBOplogWindowSmall
  condition: oplog_window_hours < 12
  severity: warning
  message: "Oplog window is only {{ value }} hours. Risk of requiring full resync."

# WiredTiger cache pressure
- alert: MongoDBCachePressure
  condition: wiredtiger_cache_used / wiredtiger_cache_max > 0.9
  for: 10m
  severity: warning
  message: "WiredTiger cache is {{ value }}% utilized"

# High connection count
- alert: MongoDBHighConnections
  condition: mongodb.connection.count > 5000
  for: 5m
  severity: warning
  message: "{{ value }} active connections to MongoDB"

# Global lock contention
- alert: MongoDBLockContention
  condition: rate(mongodb.global_lock.time[5m]) > 0.5
  for: 10m
  severity: warning
```

## Docker Compose Example

```yaml
version: "3.8"

services:
  mongo-primary:
    image: mongo:7
    command: mongod --replSet rs0
    ports:
      - "27017:27017"

  mongo-secondary:
    image: mongo:7
    command: mongod --replSet rs0
    depends_on:
      - mongo-primary

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    environment:
      MONGODB_PASSWORD: monitor_password
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
```

## Summary

MongoDB monitoring with OpenTelemetry covers three critical areas: replica set health (member states, replication lag), oplog management (window duration, size), and WiredTiger cache performance (usage, hit ratio, evictions). The MongoDB receiver collects operation counts, connection metrics, and memory usage. Supplement this with custom scripts that query replica set status, oplog window, and WiredTiger cache details. Alert on replication lag, small oplog windows, cache pressure, and member state changes to maintain database availability.
