# How to Monitor MongoDB Replication Lag Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replication, Monitoring, Replica Set, Performance

Description: Learn how to monitor MongoDB replication lag using rs.status(), oplog window metrics, and alerts to detect secondary members falling behind the primary.

---

## Introduction

Replication lag is the delay between when an operation is written to the primary and when it is applied on a secondary. High replication lag means secondaries are serving stale data and may be unable to catch up if the primary fails. Monitoring lag is critical for replica set health and ensuring secondary reads are sufficiently fresh.

## Checking Replication Lag with rs.status()

The primary source of lag metrics is `rs.status()`:

```javascript
const status = rs.status();

status.members.forEach((member) => {
  if (member.stateStr === "SECONDARY") {
    const lag = member.optimeDate
      ? (new Date() - member.optimeDate) / 1000
      : null;
    print(`${member.name}: lag = ${lag}s, state = ${member.stateStr}`);
  }
});
```

Key fields in `rs.status().members[]`:

```text
optimeDate    - Last oplog timestamp applied by this member
lastHeartbeat - Last time primary received heartbeat from this member
pingMs        - Network round-trip time to this member
stateStr      - SECONDARY, PRIMARY, ARBITER, RECOVERING
syncSourceHost - The member this secondary syncs from
```

## Computing Lag from Optime Dates

Compare the primary's optime with each secondary's optime:

```javascript
function getReplicationLag() {
  const status = rs.status();
  const primary = status.members.find((m) => m.stateStr === "PRIMARY");

  if (!primary) {
    print("No primary found");
    return;
  }

  status.members
    .filter((m) => m.stateStr === "SECONDARY")
    .forEach((secondary) => {
      const lagMs = primary.optimeDate - secondary.optimeDate;
      const lagSec = (lagMs / 1000).toFixed(1);
      print(`Secondary: ${secondary.name}`);
      print(`  Lag: ${lagSec}s`);
      print(`  Sync source: ${secondary.syncSourceHost || "N/A"}`);
    });
}

getReplicationLag();
```

## Using rs.printReplicationInfo()

A quick built-in view of the oplog window and primary write timestamps:

```javascript
rs.printReplicationInfo();
```

Sample output:

```text
configured oplog size:   2048MB
log length start to end: 86400secs (24hrs)
oplog first event time:  Mon Mar 30 2026 10:00:00 GMT+0000
oplog last event time:   Tue Mar 31 2026 10:00:00 GMT+0000
now:                     Tue Mar 31 2026 10:05:00 GMT+0000
```

## Using rs.printSecondaryReplicationInfo()

Check each secondary's lag:

```javascript
rs.printSecondaryReplicationInfo();
```

Sample output:

```text
source: secondary1:27017
    syncedTo: Tue Mar 31 2026 10:04:45 GMT+0000
    0 secs (0 hrs) behind the primary

source: secondary2:27017
    syncedTo: Tue Mar 31 2026 09:58:00 GMT+0000
    405 secs (0.11 hrs) behind the primary
```

## Monitoring Oplog Size and Window

Ensure the oplog window is large enough to survive maintenance periods:

```javascript
// Check oplog window on primary
use local
db.oplog.rs.stats().maxSize;  // Configured max size in bytes

// Calculate current oplog window
const first = db.oplog.rs.find().sort({ $natural: 1 }).limit(1).next();
const last = db.oplog.rs.find().sort({ $natural: -1 }).limit(1).next();
const windowHours = (last.ts.t - first.ts.t) / 3600;
print(`Oplog window: ${windowHours.toFixed(1)} hours`);
```

Recommended oplog window: at least 24-72 hours to allow recovery from secondary downtime.

## Setting Oplog Size

Configure a larger oplog to extend the window:

```yaml
# In mongod.conf
replication:
  oplogSizeMB: 10240  # 10 GB
```

Or change at runtime (MongoDB 3.6+):

```javascript
db.adminCommand({ replSetResizeOplog: 1, size: 10240 });
```

## Alerting on High Lag

Create a monitoring script that alerts when lag exceeds a threshold:

```javascript
function checkLagAlert(thresholdSeconds = 60) {
  const status = rs.status();
  const primary = status.members.find((m) => m.stateStr === "PRIMARY");

  if (!primary) return;

  status.members
    .filter((m) => m.stateStr === "SECONDARY")
    .forEach((secondary) => {
      const lagSec = (primary.optimeDate - secondary.optimeDate) / 1000;
      if (lagSec > thresholdSeconds) {
        print(
          `ALERT: ${secondary.name} is ${lagSec}s behind primary (threshold: ${thresholdSeconds}s)`
        );
      }
    });
}

checkLagAlert(30);
```

## Using mongostat for Live Replication Metrics

```bash
mongostat --uri "mongodb://localhost:27017" --discover 1
```

The `repl` column shows the replication state of each member.

## Common Causes of High Replication Lag

```text
1. Slow secondary hardware (disk I/O, CPU)
2. Secondary under high read load (readPreference: secondary)
3. Index builds on secondary blocking oplog application
4. Network congestion between primary and secondary
5. Oplog too small - secondary falls off the oplog
6. Large write operations (bulk updates) on primary
```

## Summary

Monitor MongoDB replication lag using `rs.status()` to compare optime dates between primary and secondaries, and `rs.printSecondaryReplicationInfo()` for a quick readable summary. Set up alerting when lag exceeds your acceptable threshold (typically 30-60 seconds), ensure the oplog window is at least 24 hours, and investigate causes such as secondary read load or slow hardware when lag consistently grows.
