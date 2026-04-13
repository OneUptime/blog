# How to Model a Notification System in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Notification, Schema Design, Document Model, Index

Description: Learn how to design an efficient MongoDB schema for a notification system supporting multiple types, recipients, and read status tracking.

---

## Why MongoDB for Notifications

Notification systems need flexible schemas to handle diverse notification types - comments, likes, mentions, system alerts. MongoDB's document model handles this well because each notification can carry its own payload without forcing a rigid relational structure.

## Core Notification Schema

A notification document should capture who it's for, what happened, and whether it's been read.

```javascript
{
  _id: ObjectId(),
  userId: ObjectId("64a1b2c3d4e5f67890123450"),
  type: "comment",
  isRead: false,
  createdAt: new Date(),
  data: {
    actorId: ObjectId("64a1b2c3d4e5f67890123460"),
    actorName: "Jane Doe",
    resourceType: "post",
    resourceId: ObjectId("64a1b2c3d4e5f67890123470"),
    preview: "Great article!"
  }
}
```

The `data` subdocument is intentionally flexible - a "follow" notification may include different fields than a "payment" notification.

## Indexing for Common Queries

The most common query is "get unread notifications for a user sorted by date". Create a compound index to support it efficiently.

```javascript
db.notifications.createIndex(
  { userId: 1, isRead: 1, createdAt: -1 },
  { name: "user_unread_date" }
);
```

For systems with many notification types, add a partial index to keep the index lean:

```javascript
db.notifications.createIndex(
  { userId: 1, createdAt: -1 },
  {
    partialFilterExpression: { isRead: false },
    name: "user_unread_partial"
  }
);
```

## Querying and Marking as Read

Fetch the latest 20 unread notifications for a user:

```javascript
db.notifications.find(
  { userId: userId, isRead: false }
).sort({ createdAt: -1 }).limit(20);
```

Mark all notifications as read in a single bulk write:

```javascript
db.notifications.updateMany(
  { userId: userId, isRead: false },
  { $set: { isRead: true, readAt: new Date() } }
);
```

## Aggregation for Unread Counts

Efficiently count unread notifications per user using the aggregation pipeline:

```javascript
db.notifications.aggregate([
  { $match: { userId: userId, isRead: false } },
  { $count: "unreadCount" }
]);
```

## TTL Index for Auto-Expiry

Notifications older than 90 days can be auto-deleted with a TTL index:

```javascript
db.notifications.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 }
);
```

## Considerations for High-Volume Systems

For high-throughput systems sending millions of notifications, consider fan-out strategies. Rather than writing one notification per recipient for broadcast events, store a single event document and let clients query events that match their subscriptions. This reduces write amplification at the cost of slightly more complex read queries.

## Summary

Modeling a notification system in MongoDB centers on a flexible document schema with a `data` subdocument for type-specific payloads. A compound index on `userId`, `isRead`, and `createdAt` powers the critical read path, and a TTL index automates cleanup of old notifications.
