# How to Handle MongoDB Cluster Network Partitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Network Partition, High Availability, Replica Set, CAP Theorem

Description: Learn how MongoDB handles network partitions in replica sets, how to configure write and read concerns for partition tolerance, and how to recover.

---

## Introduction

A network partition occurs when some members of a MongoDB replica set cannot communicate with others. MongoDB's replica set design prioritizes consistency and partition tolerance (CP in CAP theorem). When a partition occurs, the majority partition continues to serve writes, while the minority partition becomes read-only or steps down. Understanding this behavior helps you design applications that handle partitions gracefully.

## How MongoDB Responds to Network Partitions

When a network partition splits a 3-member replica set into a 1-member group and a 2-member group:

```text
Before partition:
  Primary   (P)  -- can communicate with all
  Secondary (S1) -- can communicate with all
  Secondary (S2) -- can communicate with all

After partition (S2 isolated):
  Majority partition: P + S1
    - Primary continues accepting writes
    - S1 continues replicating

  Minority partition: S2 alone
    - S2 cannot reach majority (1/3 < majority)
    - S2 remains a secondary but cannot participate in elections
    - S2 returns errors for writes, may serve stale reads to clients configured for secondary reads
```

## Write Concern and Partition Tolerance

Using `writeConcern: { w: "majority" }` ensures writes are only acknowledged when a majority of members confirm them:

```javascript
await db.collection("orders").insertOne(
  { orderId: "ORD-001", status: "pending" },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
);
```

If a write cannot reach the majority (e.g., due to partition), it fails with a timeout rather than silently succeeding on the minority.

## Read Concern for Partition Safety

```javascript
// linearizable - reads only from primary, guarantees latest committed data
const order = await db.collection("orders").findOne(
  { orderId: "ORD-001" },
  { readConcern: { level: "linearizable" } }
);

// majority - reads data confirmed by majority of replica set
const stats = await db.collection("stats").findOne(
  {},
  { readConcern: { level: "majority" } }
);
```

Avoid `readPreference: "secondary"` with `readConcern: "local"` during partitions - you may read stale data from the isolated secondary.

## Configuring Read Preference for Resilience

```javascript
const client = new MongoClient(uri, {
  readPreference: "primaryPreferred",
  // Falls back to secondary only when primary is unavailable
});
```

For analytics workloads that can tolerate stale reads:

```javascript
const client = new MongoClient(uri, {
  readPreference: "secondaryPreferred",
  readConcern: { level: "majority" }
  // Uses secondary when available, falls back to primary
});
```

## Detecting a Partition in Your Application

Handle the `NotPrimaryError` and `NotWritablePrimary` errors that occur during partitions:

```javascript
const { MongoServerError } = require("mongodb");

async function safeWrite(collection, doc) {
  try {
    return await collection.insertOne(doc, {
      writeConcern: { w: "majority", wtimeout: 10000 }
    });
  } catch (err) {
    if (err instanceof MongoServerError) {
      if (err.code === 10107 || err.code === 91) {
        // NotWritablePrimary or ShutdownInProgress
        throw new Error("Primary unavailable - possible network partition");
      }
      if (err.code === 64) {
        // WriteConcernTimeout - majority not reached
        throw new Error("Write concern failed - possible network partition");
      }
    }
    throw err;
  }
}
```

## Python Error Handling

```python
from pymongo import WriteConcern
from pymongo.errors import NotPrimaryError, ConnectionFailure, WriteConcernError

def safe_write(collection, document):
    try:
        wc = WriteConcern("majority", wtimeout=10000)
        coll = collection.with_options(write_concern=wc)
        result = coll.insert_one(document)
        return result
    except NotPrimaryError:
        raise RuntimeError("Node is not primary - network partition suspected")
    except WriteConcernError as e:
        raise RuntimeError(f"Write concern failed: {e.details}")
    except ConnectionFailure:
        raise RuntimeError("Connection lost - network partition suspected")
```

## Checking Replica Set State After a Partition

After connectivity is restored, verify replica set health:

```javascript
rs.status();
// Check all members are PRIMARY or SECONDARY
// Watch for members in RECOVERING state - they are syncing
```

Check if any member needs to roll back:

```javascript
rs.status().members.forEach(m => {
  if (m.stateStr === "ROLLBACK") {
    print(`ALERT: ${m.name} is rolling back uncommitted writes`);
  }
});
```

## Rollback After Partition Recovery

If a former primary accepted writes that were not replicated to the majority before the partition, those writes will be rolled back when the member rejoins:

```text
Scenario:
1. Primary P accepts write W1 (not yet replicated to majority)
2. Network partition isolates P
3. S1 + S2 elect a new primary S1
4. S1 accepts new writes W2, W3
5. Partition heals - P rejoins as secondary
6. MongoDB detects W1 was never committed to majority
7. P rolls back W1 (W1 is saved to rollback directory)
```

Rollback files are saved to `<dbpath>/rollback/<collectionUUID>/` for manual review.

## Configuring Election Timeouts

Tune how quickly MongoDB detects a failed primary and holds a new election:

```javascript
rs.conf().settings;

rs.reconfig({
  ...rs.conf(),
  settings: {
    heartbeatTimeoutSecs: 10,     // Default: 10s
    electionTimeoutMillis: 10000,  // Default: 10000ms
    catchUpTimeoutMillis: -1       // -1 = unlimited catch-up
  }
});
```

Lower values mean faster failover but more sensitivity to transient network issues.

## Summary

MongoDB handles network partitions by maintaining consistency - the majority partition continues serving writes while the minority becomes read-only. Use `writeConcern: "majority"` and `readConcern: "majority"` to avoid reading or writing to isolated minority members. Handle `NotPrimaryError` and `WriteConcernFailed` errors in your application to detect partition scenarios, and monitor `rs.status()` after partition recovery to catch any members in `ROLLBACK` state that need attention.
