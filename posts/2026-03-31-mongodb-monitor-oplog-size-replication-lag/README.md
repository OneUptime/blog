# How to Monitor Oplog Size and Replication Lag in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Replication, Monitoring, Replica Set

Description: Learn how to monitor MongoDB oplog size and replication lag using built-in commands, serverStatus metrics, and Prometheus-based alerting.

---

Oplog size and replication lag are two of the most critical metrics for MongoDB replica sets. An undersized oplog risks secondaries falling out of sync. High replication lag means your secondaries are stale, which affects read-from-secondary workloads and failover safety.

## Checking Oplog Size and Window

```javascript
rs.printReplicationInfo()
```

Sample output:

```text
configured oplog size: 5120 MB
log length start to end: 259200 secs (72 hrs)
oplog first event time:  Mon Mar 29 2026 00:00:00 GMT+0000
oplog last event time:   Wed Mar 31 2026 00:00:00 GMT+0000
now:                     Wed Mar 31 2026 10:30:00 GMT+0000
```

The "log length" is your oplog window. If it drops below 24 hours, resize the oplog.

## Checking Replication Lag

```javascript
rs.printSecondaryReplicationInfo()
```

Sample output:

```text
source: mongo-secondary-1:27017
    syncedTo: Wed Mar 31 2026 10:29:55 GMT+0000
    0 secs (0 hrs) behind the primary
source: mongo-secondary-2:27017
    syncedTo: Wed Mar 31 2026 10:27:30 GMT+0000
    150 secs (0.04 hrs) behind the primary
```

## Programmatic Lag Calculation

```javascript
const status = db.adminCommand({ replSetGetStatus: 1 });
const primary = status.members.find(m => m.stateStr === "PRIMARY");

status.members
  .filter(m => m.stateStr === "SECONDARY")
  .forEach(m => {
    const lagSecs = (primary.optimeDate.getTime() - m.optimeDate.getTime()) / 1000;
    print(`${m.name}: lag = ${lagSecs.toFixed(1)}s`);
  });
```

## Oplog Stats via serverStatus

```javascript
const oplog = db.getSiblingDB("local").oplog.rs.stats();
print("Oplog size (MB):", (oplog.maxSize / 1048576).toFixed(0));
print("Used (MB):",       (oplog.size / 1048576).toFixed(0));
print("Count:",           oplog.count);
```

## Metrics from replSetGetStatus

```javascript
const status = db.adminCommand({ replSetGetStatus: 1 });
status.members.forEach(m => {
  printjson({
    name:       m.name,
    state:      m.stateStr,
    health:     m.health,
    lastHeartbeat: m.lastHeartbeat,
    optime:     m.optime
  });
});
```

## Prometheus Alerts for Replication Lag

```yaml
- alert: MongoDBReplicationLagHigh
  expr: mongodb_mongod_replset_member_replication_lag > 30
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "MongoDB replication lag > 30 seconds on {{ $labels.member }}"

- alert: MongoDBOplogWindowLow
  expr: mongodb_mongod_replset_oplog_tail_timestamp - mongodb_mongod_replset_oplog_head_timestamp < 86400
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "MongoDB oplog window < 24 hours"
```

## Common Causes of Replication Lag

```text
1. Slow secondary disk - writes take longer to apply
2. Secondary CPU saturated - cannot apply oplog fast enough
3. Large write burst on primary overwhelming secondary apply threads
4. Network latency or packet loss between members
5. Index builds on secondary consuming I/O
```

Diagnose slow secondaries:

```bash
mongostat --host mongo-secondary-1:27017 --rowcount 10
```

Look for high `qr` (queued reads) or `qw` (queued writes) and compare `getmore` counts across members.

## Summary

Monitor oplog window with `rs.printReplicationInfo()` and replication lag with `rs.printSecondaryReplicationInfo()`. Set alerts when the oplog window drops below 24 hours or lag exceeds 30 seconds. For continuous monitoring, use the MongoDB exporter with Prometheus and alert on `mongodb_mongod_replset_member_replication_lag`. Replication lag above a few minutes is a warning sign that secondaries may miss the oplog window if the primary fails.
