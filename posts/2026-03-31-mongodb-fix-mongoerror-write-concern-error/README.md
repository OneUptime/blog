# How to Fix MongoError: Write Concern Error in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Concern, Replica Set, Error, Durability

Description: Learn why MongoDB write concern errors occur and how to fix them by tuning write concern settings, replica set health, and timeout configuration.

---

## Understanding the Error

A write concern error means MongoDB accepted the write but could not satisfy the requested acknowledgment level within the given timeout. The write may have been applied to the primary, but not yet replicated to the required number of secondaries:

```text
MongoServerError: Write concern error: { w: "majority", wtimeout: 5000 }
    code: 64, codeName: 'WriteConcernFailed'
```

## How Write Concern Works

Write concern controls how many replica set members must acknowledge a write before the driver considers it successful:

- `w: 1` - acknowledged by the primary only
- `w: "majority"` - acknowledged by a majority of voting members
- `w: 2` or higher - acknowledged by a specific number of members
- `j: true` - written to the journal on disk

## Cause 1: Unhealthy Replica Set

If one or more secondaries are lagging, down, or recovering, the primary cannot achieve majority acknowledgment within `wtimeout`:

```javascript
// Check replica set status
rs.status()
```

Look for members with `stateStr: "RECOVERING"` or `health: 0`. Fix the underlying secondary issues first (disk space, network connectivity, etc.).

## Cause 2: Write Concern Timeout Is Too Low

For high-write workloads or slow networks, the default timeout may be too short:

```javascript
// Increase wtimeoutMS in the connection string
const client = new MongoClient(uri, {
  writeConcern: {
    w: 'majority',
    wtimeoutMS: 30000 // 30 seconds
  }
});
```

Or per-operation:

```javascript
await db.collection('orders').insertOne(
  { orderId: '123', total: 99.99 },
  { writeConcern: { w: 'majority', wtimeoutMS: 10000 } }
);
```

## Cause 3: Not Enough Healthy Voting Members

If your replica set has 3 members but 2 are down, majority (2) cannot be achieved. Either restore the members or temporarily reduce write concern:

```javascript
// Fallback to w:1 during degraded operations (less durable)
await db.collection('logs').insertOne(
  { message: 'event', ts: new Date() },
  { writeConcern: { w: 1 } }
);
```

## Cause 4: Misconfigured Replica Set Topology

If a replica set member is misconfigured (e.g., removed from the config but the application still connects to it as a standalone), `w: "majority"` may not behave as expected. Note that on a true standalone mongod, MongoDB treats `w: "majority"` as equivalent to `w: 1`, so it will not time out. However, if you are intentionally running standalone, explicitly set `w: 1` for clarity:

```javascript
// For standalone, use w:1 for clarity
const client = new MongoClient(uri, {
  writeConcern: { w: 1, j: true }
});
```

## Recommended Write Concern by Use Case

```javascript
// Critical financial data - highest durability
const criticalConcern = { w: 'majority', j: true, wtimeoutMS: 30000 };

// General application data - balance of durability and speed
const defaultConcern = { w: 'majority', wtimeoutMS: 10000 };

// High-volume logging - speed over durability
const fastConcern = { w: 1, j: false };
```

## Monitoring Replication Lag

```javascript
// In mongosh
const status = db.adminCommand({ replSetGetStatus: 1 });
const primary = status.members.find(m => m.stateStr === 'PRIMARY');
status.members.forEach(m => {
  const lagMs = primary ? primary.optimeDate - m.optimeDate : 0;
  print(`${m.name}: state=${m.stateStr} lagMs=${lagMs} health=${m.health}`);
});
```

## Summary

Write concern errors mean replication acknowledgment failed within the timeout. Fix replica set health issues first, then tune `wtimeoutMS` to match your network and replication lag. For standalone instances, use `w: 1`. For critical data, use `w: "majority"` with `j: true` and a generous timeout.
