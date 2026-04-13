# How to Troubleshoot MongoDB Replication Lag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replication, Replica Set, Lag, Operation

Description: Learn how to diagnose and fix MongoDB replication lag using rs.status(), oplog window analysis, and secondary performance tuning.

---

## What Is Replication Lag?

Replication lag is the delay between a write being acknowledged on the primary and being applied on a secondary. Causes include:
- Secondary is I/O or CPU bound
- Network bandwidth saturation between primary and secondary
- Secondary is doing background operations (index builds, compact)
- Oplog entries are being applied slower than they are generated
- Secondary hardware is underpowered compared to the primary

## Checking Current Replication Lag

```javascript
// Connect to any replica set member and run:
rs.status()

// Look for each member's optimeDate vs the primary's
rs.status().members.forEach(m => {
  print(`${m.name} [${m.stateStr}]: optimeDate=${m.optimeDate}, lag=${m.lastHeartbeatMessage || "n/a"}`)
})
```

```javascript
// More detailed: calculate lag in seconds
const status = rs.status()
const primary = status.members.find(m => m.stateStr === "PRIMARY")

status.members
  .filter(m => m.stateStr === "SECONDARY")
  .forEach(m => {
    const lagSeconds = (primary.optimeDate - m.optimeDate) / 1000
    print(`Secondary ${m.name}: lag = ${lagSeconds.toFixed(1)} seconds`)
  })
```

## Checking Oplog Window

Replication lag exceeding the oplog window means the secondary has fallen too far behind to catch up:

```javascript
// Connect to the primary
use local
db.oplog.rs.find().sort({ $natural: 1 }).limit(1)   // oldest entry
db.oplog.rs.find().sort({ $natural: -1 }).limit(1)  // newest entry

// Or use printReplicationInfo
rs.printReplicationInfo()
/*
configured oplog size:   50000MB
log length start to end: 86400 secs (24 hrs)
oplog first event time:  Mon Jun 03 2024 00:00:01 GMT+0000
oplog last event time:   Tue Jun 04 2024 00:00:01 GMT+0000
*/

// If lag > oplog window, secondary needs full resync
// Check replication info on secondaries
rs.printSecondaryReplicationInfo()
/*
source: secondary1:27017
    syncedTo: Mon Jun 03 2024 22:15:30 GMT+0000
    1 hrs, 44 mins (6270 secs) behind the primary
*/
```

## Network as a Bottleneck

```bash
# Check network throughput between primary and secondary
# On primary - monitor outgoing bytes
mongosh --eval "db.serverStatus().network.bytesOut"

# Check network interface saturation
sar -n DEV 1 5
# Look for txkB/s close to interface maximum

# Ping latency between nodes
ping secondary1.internal

# Check MongoDB network metrics
mongosh --eval "db.serverStatus().network"
```

## Secondary CPU and I/O

```bash
# On the secondary - check if it is CPU or I/O bound
top -b -n 1 | grep mongod
iostat -x 1 5 | grep -A 1 "Device"

# Check WiredTiger cache eviction (sign of memory pressure)
mongosh --eval "db.serverStatus().wiredTiger.cache"
# "pages evicted by application threads": 0 is ideal
# High values indicate memory pressure slowing secondaries
```

## Checking Secondary Replication Status

```javascript
// Connect directly to a secondary (use directConnection)
// mongosh --directConnection mongodb://secondary1:27017

db.adminCommand({ hello: 1 })
// "isWritablePrimary": false, "secondary": true, "hosts": [...], "primary": "primary:27017"

// Check the secondary's applied optime
db.adminCommand({ replSetGetStatus: 1 }).optimes.appliedOpTime

// Batch apply stats
db.serverStatus().metrics.repl.buffer
```

## Priority and Votes Impact on Lag

```javascript
// Check replica set configuration
rs.conf()

// A secondary with low priority might be intentionally delayed
// (e.g., analytics queries)
rs.conf().members.forEach(m => {
  print(`${m.host}: priority=${m.priority}, hidden=${m.hidden}, secondaryDelaySecs=${m.secondaryDelaySecs || 0}`)
})
```

## Forcing a Resync

If a secondary has fallen behind the oplog window:

```bash
# Method 1: Initial sync (restart with empty data directory)
# Stop the secondary
systemctl stop mongod

# Remove data directory contents
rm -rf /var/lib/mongodb/*

# Start mongod - it will perform initial sync from primary
systemctl start mongod

# Monitor sync progress
mongosh --directConnection --eval "db.adminCommand({ replSetGetStatus: 1 }).members"
```

```javascript
// Monitor initial sync progress from the primary
db.adminCommand({ replSetGetStatus: 1 }).members
  .filter(m => m.state === 5)  // 5 = STARTUP2 (initial sync)
  .forEach(m => print(`${m.name}: state=${m.stateStr}`))

// For detailed sync progress, connect directly to the syncing secondary:
// db.adminCommand({ replSetGetStatus: 1 }).initialSyncStatus
```

## Fixing Persistent Lag

```javascript
// 1. Increase oplog size if lag is intermittent but recoverable
db.adminCommand({ replSetResizeOplog: 1, size: 100000 })  // 100GB

// 2. Reduce read load on secondary
// Move application reads to primary temporarily
// Or add a fourth member to distribute reads

// 3. Check for long-running operations on secondary
db.adminCommand({ currentOp: true, active: true })
```

```bash
# 4. Upgrade secondary hardware
# Secondaries should match primary specs for I/O and RAM
# WiredTiger cache should be large enough to hold working set

# 5. Check for network issues
mtr secondary1.internal  # persistent packet loss = replication lag
```

## Summary

Diagnose MongoDB replication lag using `rs.status()` to compare `optimeDate` between primary and secondaries, `rs.printReplicationInfo()` to verify lag is within the oplog window, and system monitoring to identify CPU, I/O, or network bottlenecks on secondaries. Fix lag by increasing oplog size for intermittent issues, upgrading secondary hardware for sustained lag, and performing a full resync if a secondary has fallen outside the oplog window.
