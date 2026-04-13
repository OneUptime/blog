# How to Audit Data Changes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Audit, Change Stream, Logging, Compliance

Description: Learn how to audit data changes in MongoDB using change streams, the MongoDB audit log, and application-level audit trails for compliance and debugging.

---

## Three Approaches to Auditing MongoDB

You can audit MongoDB changes at three levels: the MongoDB server audit log, change streams, and application-level audit records. Each serves a different purpose.

## Approach 1: MongoDB Audit Log

Available on MongoDB Enterprise and Atlas, the audit log captures authentication events, authorization failures, and CRUD operations. Configure it in `mongod.conf`:

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{ atype: { $in: ["authCheck", "authenticate"] } }'
```

On Atlas, enable auditing from the Security > Advanced tab. Audit log entries look like:

```json
{
  "atype": "authCheck",
  "ts": { "$date": "2026-03-31T10:00:00.000Z" },
  "local": { "ip": "127.0.0.1", "port": 27017 },
  "remote": { "ip": "10.0.1.5", "port": 52341 },
  "users": [{ "user": "appUser", "db": "shop" }],
  "roles": [{ "role": "readWrite", "db": "shop" }],
  "param": {
    "command": "update",
    "ns": "shop.orders",
    "args": {
      "update": "orders",
      "updates": [{ "q": { "_id": "..." }, "u": { "$set": { "status": "cancelled" } } }]
    }
  },
  "result": 0
}
```

## Approach 2: Change Streams for Real-Time Auditing

Change streams watch a collection, database, or entire cluster for changes and emit events in real time:

```javascript
const pipeline = [
  { $match: {
    "ns.coll": { $in: ["orders", "accounts"] },
    operationType: { $in: ["insert", "update", "delete", "replace"] }
  }}
];

const changeStream = db.watch(pipeline, {
  fullDocument: "updateLookup",
  fullDocumentBeforeChange: "whenAvailable"
});

changeStream.on("change", async (event) => {
  await db.auditLog.insertOne({
    timestamp: new Date(),
    operation: event.operationType,
    collection: event.ns.coll,
    documentId: event.documentKey._id,
    before: event.fullDocumentBeforeChange,  // requires pre-image enabled
    after: event.fullDocument,
    changedFields: Object.keys(event.updateDescription?.updatedFields || {})
  });
});
```

Enable pre-images to capture the document before the change (MongoDB 6.0+):

```javascript
db.runCommand({
  collMod: "orders",
  changeStreamPreAndPostImages: { enabled: true }
});
```

Then use `fullDocumentBeforeChange: "whenAvailable"` in the change stream options.

## Approach 3: Application-Level Audit Trail

Embed audit records directly in your data service layer:

```javascript
async function updateOrderStatus(orderId, newStatus, actor) {
  const order = await db.orders.findOne({ _id: orderId });

  await db.orders.updateOne(
    { _id: orderId },
    { $set: { status: newStatus, updatedAt: new Date() } }
  );

  await db.auditTrail.insertOne({
    entityType: "order",
    entityId: orderId,
    action: "status_change",
    actor: actor,
    before: { status: order.status },
    after: { status: newStatus },
    timestamp: new Date(),
    ip: actor.ip
  });
}
```

## Querying the Audit Trail

```javascript
// All changes to a specific order
db.auditTrail.find({ entityId: orderId })
  .sort({ timestamp: -1 });

// All actions by a specific user in the last 24 hours
const since = new Date(Date.now() - 86400000);
db.auditTrail.find({ "actor.userId": userId, timestamp: { $gte: since } })
  .sort({ timestamp: -1 });
```

## Index the Audit Collection

```javascript
db.auditTrail.createIndex({ entityId: 1, timestamp: -1 });
db.auditTrail.createIndex({ "actor.userId": 1, timestamp: -1 });
db.auditTrail.createIndex({ timestamp: 1 }, { expireAfterSeconds: 365 * 86400 });
```

## Summary

Auditing MongoDB data changes combines the server-level audit log (for authentication and authorization events), change streams (for real-time, automatic capture of all CRUD operations with before/after images), and application-level audit records (for business-context-aware logging). Use the server audit log for compliance reporting, change streams for reactive alerting, and application audit trails for per-entity history visible in your product's UI.
