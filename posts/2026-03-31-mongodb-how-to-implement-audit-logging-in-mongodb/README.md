# How to Implement Audit Logging in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Audit Logging, Security, Compliance, Change Stream

Description: Implement audit logging in MongoDB to track who made what changes and when, for security, compliance, and debugging using Change Streams and middleware.

---

## Overview

Audit logging records every significant action in your system - who did what, to which resource, and when. It is required for compliance standards like SOC 2, HIPAA, GDPR, and PCI DSS. MongoDB supports audit logging at two levels: the database level (via the `mongod` audit log feature in Enterprise/Atlas) and the application level (via Change Streams or middleware). This guide covers both approaches.

## Approach 1 - MongoDB Enterprise Audit Log

MongoDB Enterprise and Atlas Advanced tiers include a built-in audit log that captures authentication, authorization, and DDL/DML events at the database level.

Configure in `mongod.conf`:

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{
    $or: [
      {
        atype: {
          $in: [
            "authenticate",
            "createCollection",
            "dropCollection",
            "createIndex",
            "dropIndex"
          ]
        }
      },
      {
        atype: "authCheck",
        "param.command": {
          $in: ["find", "insert", "update", "delete"]
        }
      }
    ]
  }'
```

Note: CRUD operations (find, insert, update, delete) are not their own audit event types. They are captured via `authCheck` events where `param.command` indicates the operation. To log successful CRUD operations, you must also enable `auditAuthorizationSuccess`:

```yaml
setParameter:
  auditAuthorizationSuccess: true
```

Sample audit log entry for an insert operation:

```json
{
  "atype": "authCheck",
  "ts": { "$date": "2026-03-31T12:00:00.000Z" },
  "local": { "ip": "127.0.0.1", "port": 27017 },
  "remote": { "ip": "10.0.0.5", "port": 54321 },
  "users": [{ "user": "appuser", "db": "myapp" }],
  "roles": [{ "role": "readWrite", "db": "myapp" }],
  "param": {
    "command": "insert",
    "ns": "myapp.orders",
    "args": {
      "insert": "orders",
      "ordered": true,
      "$db": "myapp"
    }
  },
  "result": 0
}
```

## Approach 2 - Application-Level Audit with Change Streams

For richer context (user IDs, HTTP request info, business fields), use Change Streams.

To use `fullDocumentBeforeChange` (pre-images), you must first enable `changeStreamPreAndPostImages` on each collection you want to watch:

```javascript
db.runCommand({
  collMod: "orders",
  changeStreamPreAndPostImages: { enabled: true }
})
```

Without this, `fullDocumentBeforeChange` will be `null` even with the `"whenAvailable"` option.

### Audit Log Schema

```javascript
// audit_logs collection
{
  _id: ObjectId("..."),
  timestamp: ISODate("2026-03-31T12:00:00Z"),
  action: "UPDATE",
  collection: "orders",
  documentId: "order-123",
  userId: "user-456",
  userEmail: "alice@example.com",
  ipAddress: "10.0.0.5",
  userAgent: "Mozilla/5.0...",
  requestId: "req-789",
  before: { status: "pending" },
  after: { status: "shipped" },
  diff: ["status"]
}
```

### Change Stream Audit Logger

```javascript
// audit-logger.js
class AuditLogger {
  constructor(db) {
    this.db = db
    this.auditCollection = db.collection("audit_logs")
  }

  async startWatching(collections) {
    const pipeline = [
      {
        $match: {
          "ns.coll": { $in: collections },
          operationType: { $in: ["insert", "update", "replace", "delete"] }
        }
      }
    ]

    const changeStream = this.db.watch(pipeline, {
      fullDocumentBeforeChange: "whenAvailable",
      fullDocument: "updateLookup"
    })

    changeStream.on("change", async (change) => {
      await this.logChange(change)
    })

    changeStream.on("error", (err) => {
      console.error("Audit stream error:", err)
    })

    console.log(`Audit logger watching: ${collections.join(", ")}`)
    return changeStream
  }

  async logChange(change) {
    const log = {
      timestamp: new Date(),
      operationType: change.operationType,
      collection: change.ns.coll,
      documentId: change.documentKey?._id?.toString(),
      before: change.fullDocumentBeforeChange || null,
      after: change.fullDocument || null,
      updateDescription: change.updateDescription || null
    }

    await this.auditCollection.insertOne(log)
  }

  async log(action, resourceType, resourceId, userId, context = {}) {
    await this.auditCollection.insertOne({
      timestamp: new Date(),
      action,
      resourceType,
      resourceId: resourceId?.toString(),
      userId: userId?.toString(),
      ...context
    })
  }
}
```

## Approach 3 - Middleware-Based Audit Logging

For full request context (user info, IP, request ID):

### Express Middleware

```javascript
// audit-middleware.js
const { ObjectId } = require("mongodb")

function createAuditMiddleware(db) {
  const auditLogs = db.collection("audit_logs")

  return function auditMiddleware(req, res, next) {
    const originalJson = res.json.bind(res)

    res.json = function(data) {
      // Log after response is determined
      if (req.auditAction && res.statusCode < 400) {
        const logEntry = {
          timestamp: new Date(),
          action: req.auditAction,
          resourceType: req.auditResourceType,
          resourceId: req.auditResourceId,
          userId: req.user?.id,
          userEmail: req.user?.email,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
          requestId: req.headers["x-request-id"],
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          before: req.auditBefore || null,
          after: req.auditAfter || null
        }

        // Non-blocking - don't wait for the log to be written
        auditLogs.insertOne(logEntry).catch(err => {
          console.error("Failed to write audit log:", err)
        })
      }

      return originalJson(data)
    }

    next()
  }
}

// Usage in routes
router.put("/orders/:id/status",
  authenticate,
  (req, res, next) => {
    req.auditAction = "UPDATE_ORDER_STATUS"
    req.auditResourceType = "order"
    req.auditResourceId = req.params.id
    next()
  },
  async (req, res) => {
    const { status } = req.body

    // Get before state for diff
    const before = await db.collection("orders").findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { status: 1 } }
    )

    await db.collection("orders").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, updatedAt: new Date() } }
    )

    // Add before/after to audit context
    req.auditBefore = before?.status
    req.auditAfter = status

    res.json({ success: true })
  }
)
```

## Query Audit Logs

```javascript
// Find all changes made by a user
async function getUserActivity(db, userId, startDate, endDate) {
  return db.collection("audit_logs").find({
    userId,
    timestamp: { $gte: startDate, $lte: endDate }
  })
  .sort({ timestamp: -1 })
  .limit(100)
  .toArray()
}

// Find all changes to a specific document
async function getDocumentHistory(db, collection, documentId) {
  return db.collection("audit_logs").find({
    collection,
    documentId
  })
  .sort({ timestamp: -1 })
  .toArray()
}

// Summarize activity by user
async function getActivitySummary(db, since) {
  return db.collection("audit_logs").aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: "$userId",
        totalActions: { $sum: 1 },
        actions: { $addToSet: "$action" },
        lastActivity: { $max: "$timestamp" }
      }
    },
    { $sort: { totalActions: -1 } }
  ]).toArray()
}
```

## Index for Efficient Audit Queries

```javascript
db.audit_logs.createIndex({ userId: 1, timestamp: -1 })
db.audit_logs.createIndex({ resourceType: 1, resourceId: 1, timestamp: -1 })
db.audit_logs.createIndex({ collection: 1, documentId: 1 })

// TTL index - retain audit logs for 1 year
db.audit_logs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
)
```

## Summary

Audit logging in MongoDB can be implemented at two levels: the database level using MongoDB Enterprise's built-in audit log for authentication and DDL events, and the application level using Change Streams or Express middleware for business-context audit trails. Application-level auditing captures richer context like user identity and request IDs, and storing logs in a dedicated collection with appropriate indexes makes querying activity history by user, resource, or time period fast and efficient.
