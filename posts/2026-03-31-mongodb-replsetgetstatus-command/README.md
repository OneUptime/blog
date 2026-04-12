# How to Use the replSetGetStatus Command in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Replication, Monitoring, Command

Description: Learn how to use replSetGetStatus in MongoDB to inspect replica set health, member states, replication lag, and oplog positions in real time.

---

## What Is replSetGetStatus?

`replSetGetStatus` is a MongoDB administrative command that returns the current status of the replica set from the perspective of the member you are querying. It is the primary tool for monitoring replica set health, understanding member roles, and diagnosing replication issues.

You must run this command against a `mongod` instance that is part of a replica set. Running it on a standalone instance returns an error.

## Running replSetGetStatus

Use `mongosh` to run the command:

```javascript
rs.status()
```

Or use the full form:

```javascript
db.adminCommand({ replSetGetStatus: 1 })
```

Both return the same document. The `rs.status()` helper is more commonly used in interactive sessions.

## Understanding the Output

A typical response includes several key fields:

```json
{
  "set": "rs0",
  "date": "2026-03-31T10:00:00.000Z",
  "myState": 1,
  "term": 12,
  "heartbeatIntervalMillis": 2000,
  "members": [
    {
      "_id": 0,
      "name": "mongo1:27017",
      "health": 1,
      "state": 1,
      "stateStr": "PRIMARY",
      "uptime": 86400,
      "optime": { "ts": { "$timestamp": {} }, "t": 12 },
      "optimeDate": "2026-03-31T10:00:00.000Z",
      "lastHeartbeat": "2026-03-31T09:59:58.000Z",
      "pingMs": 1,
      "syncSourceHost": ""
    },
    {
      "_id": 1,
      "name": "mongo2:27017",
      "health": 1,
      "state": 2,
      "stateStr": "SECONDARY",
      "uptime": 86300,
      "optime": { "ts": { "$timestamp": {} }, "t": 12 },
      "lastHeartbeat": "2026-03-31T09:59:58.000Z",
      "pingMs": 3,
      "syncSourceHost": "mongo1:27017"
    }
  ],
  "ok": 1
}
```

Key fields to watch:

- `myState` and `stateStr` - the integer state code and human-readable label (1=PRIMARY, 2=SECONDARY, 6=UNKNOWN)
- `health` - 1 means reachable, 0 means unreachable from this member's perspective
- `optime` - the timestamp of the last operation applied; compare across members to measure replication lag
- `syncSourceHost` - which member this secondary is replicating from
- `pingMs` - round-trip heartbeat latency in milliseconds

## Checking Replication Lag

Calculate replication lag by comparing `optimeDate` values between the primary and each secondary:

```javascript
const status = rs.status();
const primary = status.members.find(m => m.stateStr === "PRIMARY");
const secondaries = status.members.filter(m => m.stateStr === "SECONDARY");

secondaries.forEach(s => {
  const lagMs = primary.optimeDate - s.optimeDate;
  print(`${s.name} lag: ${lagMs}ms`);
});
```

A lag above a few seconds warrants investigation, especially if `w:majority` write concern is in use.

## Member States Reference

MongoDB defines several member states you will see in `stateStr`:

```text
PRIMARY     (1) - Accepts reads and writes
SECONDARY   (2) - Replicates from primary
ARBITER     (7) - Votes but holds no data
STARTUP     (0) - Starting up
RECOVERING  (3) - Catching up or maintenance
UNKNOWN     (6) - Not yet known to another member
DOWN        (8) - Unreachable
ROLLBACK    (9) - Rolling back writes after a failover
```

## Filtering the Output

In scripts, filter to specific fields to keep output manageable:

```javascript
db.adminCommand({ replSetGetStatus: 1 }).members.map(m => ({
  name: m.name,
  state: m.stateStr,
  lag: m.optimeDate,
  ping: m.pingMs
}));
```

## Monitoring With replSetGetStatus

Integrate `replSetGetStatus` into your monitoring pipeline by polling it on an interval and alerting when:

- Any member `health` drops to 0
- Replication lag exceeds a threshold (e.g., 30 seconds)
- The number of voting members with `stateStr === "PRIMARY"` is not exactly 1
- A member enters `ROLLBACK` state

Tools like OneUptime can scrape these metrics from your MongoDB monitoring scripts and fire alerts automatically when thresholds are breached.

## Summary

`replSetGetStatus` gives you a real-time snapshot of your replica set topology. Monitor member health, replication lag via `optimeDate` differences, and sync source chains to catch replication issues early. Automate alerts on state changes to maintain high availability.
