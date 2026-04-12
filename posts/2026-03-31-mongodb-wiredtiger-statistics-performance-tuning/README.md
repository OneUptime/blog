# How to Interpret WiredTiger Statistics for Performance Tuning in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Performance, Monitoring, Statistics

Description: Learn how to read and act on WiredTiger statistics from MongoDB's serverStatus command to diagnose cache, eviction, concurrency, and I/O bottlenecks.

---

MongoDB exposes hundreds of WiredTiger internal statistics through `db.serverStatus().wiredTiger`. Knowing which metrics matter and what they mean is essential for effective performance tuning.

## Accessing WiredTiger Statistics

```javascript
const wt = db.serverStatus().wiredTiger;
```

Top-level sections:
- `wt.cache` - memory usage and eviction
- `wt.transaction` - commit, rollback, and checkpoint data
- `wt.concurrentTransactions` - read/write ticket availability
- `wt.log` - journal write statistics
- `wt.session` - open sessions and cursors

## Cache Statistics

```javascript
const c = db.serverStatus().wiredTiger.cache;

printjson({
  cacheSizeGB:        (c["maximum bytes configured"] / 1e9).toFixed(2),
  usedPct:            (c["bytes currently in the cache"] / c["maximum bytes configured"] * 100).toFixed(1) + "%",
  dirtyPct:           (c["tracked dirty bytes in the cache"] / c["maximum bytes configured"] * 100).toFixed(1) + "%",
  appEvictions:       c["pages evicted by application threads"],
  pagesReadIntoCache: c["pages read into cache"]
});
```

**Action triggers:**
- usedPct > 90% - increase cache or reduce working set
- dirtyPct > 20% - increase eviction threads or slow write rate
- appEvictions > 0 (sustained) - critical, cache cannot keep up

## Concurrent Transaction Tickets

```javascript
const ct = db.serverStatus().wiredTiger.concurrentTransactions;
printjson({
  readAvailable:  ct.read.available,
  readOut:        ct.read.out,
  writeAvailable: ct.write.available,
  writeOut:       ct.write.out
});
```

MongoDB uses a ticket system to control concurrent reads (128 tickets by default) and writes (128 tickets). When `available` approaches 0, operations queue.

**Action trigger:** If `writeAvailable` regularly drops below 10, increase write tickets or investigate slow operations holding tickets.

```javascript
db.adminCommand({ setParameter: 1, wiredTigerConcurrentWriteTransactions: 256 });
```

## Transaction Statistics

```javascript
const txn = db.serverStatus().wiredTiger.transaction;
printjson({
  commits:         txn["transactions committed"],
  rollbacks:       txn["transactions rolled back"],
  checkpoints:     txn["transaction checkpoints"],
  checkpointMaxMs: txn["transaction checkpoint max time (msecs)"],
  conflicts:       txn["transaction conflicts between operations"]
});
```

High `rollbacks` or `conflicts` indicate write contention on the same documents.

## Log (Journal) Statistics

```javascript
const log = db.serverStatus().wiredTiger.log;
printjson({
  bytesWritten:      log["log bytes written"],
  syncOperations:    log["log sync operations"],
  writeOperations:   log["log write operations"],
  maxLogSize:        log["maximum log file size"],
  currentLogNumber:  log["current log file number"]
});
```

`syncOperations` counts journal flushes. High sync counts with `j: true` write concern means your write rate is driving frequent fsync calls.

## Interpreting Read vs Write Pressure

```javascript
const ct = db.serverStatus().wiredTiger.concurrentTransactions;
const readPressure  = 1 - (ct.read.available / (ct.read.available + ct.read.out));
const writePressure = 1 - (ct.write.available / (ct.write.available + ct.write.out));

print("Read ticket pressure:", (readPressure * 100).toFixed(1) + "%");
print("Write ticket pressure:", (writePressure * 100).toFixed(1) + "%");
```

## Creating a Dashboard Snapshot

```javascript
function wtSnapshot() {
  const wt = db.serverStatus().wiredTiger;
  return {
    cacheUsedPct:     +(wt.cache["bytes currently in the cache"] / wt.cache["maximum bytes configured"] * 100).toFixed(1),
    dirtyPct:         +(wt.cache["tracked dirty bytes in the cache"] / wt.cache["maximum bytes configured"] * 100).toFixed(1),
    appEvictions:     wt.cache["pages evicted by application threads"],
    writeTickets:     wt.concurrentTransactions.write.available,
    checkpointMs:     wt.transaction["transaction checkpoint most recent time (msecs)"],
    conflicts:        wt.transaction["transaction conflicts between operations"]
  };
}
printjson(wtSnapshot());
```

## Summary

WiredTiger statistics fall into four categories: cache pressure (utilization and dirty ratios), concurrency (ticket availability), checkpoints (duration and frequency), and journal (sync operations). Monitor cache utilization and application thread evictions as your primary health signals. Track write ticket availability and transaction conflicts to detect contention. Use these metrics to drive specific tuning actions rather than guessing at configuration changes.
