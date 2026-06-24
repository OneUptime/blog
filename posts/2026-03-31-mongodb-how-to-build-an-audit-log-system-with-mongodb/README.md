# How to Build an Audit Log System with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Audit Log, Compliance, Schema, Index, Change Stream

Description: Learn how to build an immutable audit log system with MongoDB for compliance and security, using capped collections, change streams, and TTL policies.

---

## Introduction

Audit logs record who did what and when in a system. They are essential for security investigations, compliance requirements (SOX, HIPAA, GDPR), and debugging unexpected data changes. MongoDB offers several features that make audit log storage and querying efficient.

## Audit Log Document Schema

```javascript
{
  _id: ObjectId(),
  timestamp: ISODate("2026-03-31T12:00:00Z"),
  actor: {
    userId: "usr-123",
    email: "alice@example.com",
    ip: "192.168.1.10",
    userAgent: "Mozilla/5.0..."
  },
  action: "UPDATE",
  resource: {
    type: "order",
    id: "ORD-456",
    collection: "orders"
  },
  before: { status: "pending", amount: 100 },
  after: { status: "shipped", amount: 100 },
  metadata: { requestId: "req-789", sessionId: "sess-abc" }
}
```

## Inserting Audit Events

Write audit events as append-only inserts:

```javascript
async function logAuditEvent(actor, action, resource, before, after) {
  await db.collection("auditLogs").insertOne({
    timestamp: new Date(),
    actor,
    action,
    resource,
    before,
    after,
    metadata: { requestId: generateId(), sessionId: actor.sessionId }
  });
}

// Call before and after data modifications
await logAuditEvent(
  { userId: "usr-123", email: "alice@example.com", ip: "192.168.1.10" },
  "UPDATE",
  { type: "order", id: "ORD-456", collection: "orders" },
  { status: "pending" },
  { status: "shipped" }
);
```

## Indexing for Common Queries

```javascript
db.auditLogs.createIndex({ timestamp: -1 });
db.auditLogs.createIndex({ "actor.userId": 1, timestamp: -1 });
db.auditLogs.createIndex({ "resource.id": 1, timestamp: -1 });
db.auditLogs.createIndex({ action: 1, timestamp: -1 });
```

## Querying Audit History

Retrieve all actions by a specific user:

```javascript
db.auditLogs.find(
  { "actor.userId": "usr-123" },
  { timestamp: 1, action: 1, resource: 1 }
).sort({ timestamp: -1 }).limit(50);
```

Find all changes to a specific resource:

```javascript
db.auditLogs.find(
  { "resource.id": "ORD-456" }
).sort({ timestamp: 1 });
```

## Using Change Streams for Real-Time Audit

Capture changes automatically using a change stream. First, enable pre- and post-images on the collection (requires MongoDB 6.0+):

```javascript
db.runCommand({
  collMod: "orders",
  changeStreamPreAndPostImages: { enabled: true }
});
```

Then open the change stream with both `fullDocument` and `fullDocumentBeforeChange` options:

```javascript
const pipeline = [{ $match: { operationType: { $in: ["insert", "update", "delete"] } } }];
const changeStream = db.collection("orders").watch(pipeline, {
  fullDocument: "required",
  fullDocumentBeforeChange: "required"
});

changeStream.on("change", async (change) => {
  await db.collection("auditLogs").insertOne({
    timestamp: new Date(),
    action: change.operationType.toUpperCase(),
    resource: { type: "order", id: change.documentKey._id.toString(), collection: "orders" },
    before: change.fullDocumentBeforeChange,
    after: change.fullDocument
  });
});
```

## TTL for Log Retention

Add a TTL index to automatically expire old audit logs per your retention policy:

```javascript
db.auditLogs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 }  // 90 days
);
```

## Summary

MongoDB is effective for audit logging due to its flexible schema for before/after state capture, rich query capabilities, and change stream support for automatic audit trail generation. TTL indexes automate retention policy enforcement, while compound indexes on actor, resource, and timestamp fields keep queries fast. Treat audit logs as append-only to preserve their integrity.
