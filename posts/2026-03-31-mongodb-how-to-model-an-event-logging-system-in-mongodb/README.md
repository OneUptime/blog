# How to Model an Event Logging System in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Event Logging, Audit Log, Schema Design

Description: Learn how to design an efficient MongoDB schema for an event logging and audit system, with indexing strategies and data retention patterns.

---

## Event Logging Requirements

An event logging system must handle:
- High write throughput (many events per second)
- Time-range queries (show events from last 24 hours)
- Filtering by event type, user, or resource
- Data retention (auto-delete old logs)
- Compliance and audit queries

## Core Event Document Schema

```javascript
// events collection
{
  _id: ObjectId("65e8a1b2c3d4e5f6a7b8c9d0"),
  eventType: "user.login",           // Namespaced event type
  severity: "info",                  // info | warn | error | critical
  timestamp: ISODate("2026-03-31T09:00:00Z"),

  // Actor (who performed the action)
  actor: {
    type: "user",                    // user | system | service
    id: "u001",
    name: "Alice Smith",
    ip: "192.168.1.100",
    userAgent: "Mozilla/5.0..."
  },

  // Resource (what was acted on)
  resource: {
    type: "session",
    id: "sess_abc123"
  },

  // Contextual metadata
  metadata: {
    success: true,
    authMethod: "password",
    sessionId: "sess_abc123"
  },

  // Tenant for multi-tenant apps
  tenantId: "tenant_a"
}
```

## Event Types Taxonomy

Use a hierarchical dot-notation for event types:

```text
user.login          user.logout         user.password_reset
user.created        user.deleted        user.role_changed
order.created       order.updated       order.cancelled
order.payment_processed
resource.created    resource.deleted    resource.exported
admin.config_changed  admin.user_impersonated
api.rate_limit_exceeded  api.unauthorized_access
```

## Indexing Strategy

Design indexes around common query patterns:

```javascript
// Primary: time-based queries (most common)
db.events.createIndex({ timestamp: -1 })

// Filter by tenant + time (multi-tenant apps)
db.events.createIndex({ tenantId: 1, timestamp: -1 })

// Filter by event type + time (event type dashboards)
db.events.createIndex({ eventType: 1, timestamp: -1 })

// Filter by actor + time (user activity audit)
db.events.createIndex({ "actor.id": 1, timestamp: -1 })

// Filter by resource (all events on a specific resource)
db.events.createIndex({ "resource.type": 1, "resource.id": 1, timestamp: -1 })

// Severity-based alerting queries
db.events.createIndex({ severity: 1, timestamp: -1 })
```

## TTL Index for Automatic Log Retention

Auto-expire events based on your retention policy:

```javascript
// Expire events after 90 days
db.events.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 }
)
```

For different retention by severity, use a separate `expiresAt` field:

```javascript
function getExpiresAt(severity) {
  const retentionDays = { info: 30, warn: 90, error: 365, critical: 2555 };
  const days = retentionDays[severity] || 30;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Add expiresAt when inserting events
db.events.insertOne({
  ...eventDoc,
  expiresAt: getExpiresAt(eventDoc.severity)
})

db.events.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

## Inserting Events Efficiently

Use ordered: false for bulk inserts to avoid stopping on errors:

```javascript
async function logEvent(event) {
  await db.events.insertOne({
    ...event,
    timestamp: new Date(),
    expiresAt: getExpiresAt(event.severity)
  });
}

// Bulk insert for high-throughput scenarios
async function logEventsBatch(events) {
  const docs = events.map(e => ({
    ...e,
    timestamp: e.timestamp || new Date(),
    expiresAt: getExpiresAt(e.severity)
  }));

  await db.events.insertMany(docs, { ordered: false });
}
```

## Querying Events

Recent events (last 1 hour):

```javascript
const oneHourAgo = new Date(Date.now() - 3600000);
db.events.find({ timestamp: { $gte: oneHourAgo } })
  .sort({ timestamp: -1 })
  .limit(100)
```

User activity audit (all events by a user in a date range):

```javascript
db.events.find({
  "actor.id": "u001",
  timestamp: {
    $gte: ISODate("2026-03-01T00:00:00Z"),
    $lt: ISODate("2026-04-01T00:00:00Z")
  }
}).sort({ timestamp: -1 })
```

Critical events for alerting:

```javascript
db.events.find({
  severity: "critical",
  timestamp: { $gte: new Date(Date.now() - 3600000) }
}).sort({ timestamp: -1 })
```

## Event Aggregation Dashboard

Event counts by type for the last 24 hours:

```javascript
const oneDayAgo = new Date(Date.now() - 86400000);
db.events.aggregate([
  { $match: { timestamp: { $gte: oneDayAgo } } },
  {
    $group: {
      _id: "$eventType",
      count: { $sum: 1 },
      lastOccurrence: { $max: "$timestamp" }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 20 }
])
```

Error rate by hour:

```javascript
db.events.aggregate([
  { $match: { severity: "error", timestamp: { $gte: new Date(Date.now() - 86400000) } } },
  {
    $group: {
      _id: {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day: { $dayOfMonth: "$timestamp" },
        hour: { $hour: "$timestamp" }
      },
      errorCount: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
])
```

## Summary

Model an event logging system in MongoDB with a flat document schema using namespaced `eventType` values, structured `actor` and `resource` sub-documents, and a `timestamp` field. Create compound indexes with `timestamp` as the trailing sort field to support time-range queries filtered by event type, actor, or resource. Use TTL indexes on `expiresAt` for policy-driven retention, and use `$group` aggregations for dashboard queries. For high-throughput scenarios, use `insertMany` with `ordered: false` to maximize write performance.
