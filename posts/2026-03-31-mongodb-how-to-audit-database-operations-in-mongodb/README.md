# How to Audit Database Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Auditing, Security, Compliance, Operation

Description: Track and log MongoDB database operations including reads, writes, and schema changes to meet compliance requirements and investigate security incidents.

---

## Auditing Options in MongoDB

MongoDB offers several approaches to auditing database operations:

1. **Enterprise Auditing** - native, built-in audit log (requires MongoDB Enterprise)
2. **Change Streams** - application-level operation tracking (Community)
3. **Oplog monitoring** - monitor replica set oplog for write operations (Community)
4. **Database profiler** - capture slow queries and all operations (Community)

## Using the Database Profiler for Operation Audit

The profiler captures operation details to the `system.profile` collection and works in MongoDB Community.

```javascript
// Level 0: off, Level 1: slow ops only, Level 2: all ops
db.setProfilingLevel(2);

// Or set with slow operation threshold
db.setProfilingLevel(1, { slowms: 100 });
```

Query captured operations:

```javascript
db.system.profile.find({
  op: { $in: ["insert", "update", "remove"] },
  ts: { $gte: new Date("2026-03-31T00:00:00Z") }
}).sort({ ts: -1 }).limit(50);
```

## Using Change Streams for Application-Level Auditing

Change streams give applications a real-time feed of database changes. Write an audit consumer service:

```javascript
const collection = db.collection("payments");

const changeStream = collection.watch(
  [{ $match: { operationType: { $in: ["insert", "update", "delete"] } } }],
  { fullDocument: "updateLookup" }
);

changeStream.on("change", async (event) => {
  await db.collection("auditLog").insertOne({
    timestamp: new Date(),
    operation: event.operationType,
    collection: event.ns.coll,
    documentId: event.documentKey._id,
    userId: getCurrentUserId(), // from application context
    changes: event.updateDescription
  });
});
```

## Monitoring the Oplog Directly

The oplog is a capped collection on replica sets that records all write operations. You can monitor it for audit purposes:

```javascript
const oplog = client.db("local").collection("oplog.rs");
const lastTimestamp = new Timestamp({ t: Math.floor(Date.now() / 1000), i: 0 });

const cursor = oplog.find(
  {
    ts: { $gt: lastTimestamp },
    ns: { $regex: "^myapp\\." }  // Only your database
  },
  { tailable: true, awaitData: true }
);

cursor.on("data", op => {
  console.log(`Operation: ${op.op} on ${op.ns}`, op.o);
});
```

## Enterprise Audit Log for CRUD Operations

With MongoDB Enterprise, capture specific CRUD operations via the audit filter:

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{
    atype: "authCheck",
    "param.command": { "$in": ["insert", "update", "delete", "find"] },
    "param.ns": "myapp.payments"
  }'
```

## Parsing Audit Data

Aggregate audit events for a summary report:

```javascript
db.auditLog.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date("2026-03-01"), $lt: new Date("2026-04-01") }
    }
  },
  {
    $group: {
      _id: { operation: "$operation", userId: "$userId" },
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
]);
```

## Summary

MongoDB operation auditing can be implemented with the built-in profiler (all editions), change streams for real-time audit logs in application code, or MongoDB Enterprise's native audit log for comprehensive server-side capture. For compliance use cases, Enterprise auditing with filters targeting sensitive collections provides the most reliable and tamper-resistant audit trail.
