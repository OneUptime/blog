# How to Implement Document Soft Delete and Recovery in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Soft Delete, Recovery, Schema Design, Index

Description: Learn how to implement soft delete patterns in MongoDB to mark documents as deleted without removing them, enabling easy recovery and audit trails.

---

## What Is Soft Delete

Soft delete is a pattern where documents are flagged as deleted rather than physically removed from the collection. This enables data recovery, preserves audit history, and simplifies undo operations.

## Adding the Deleted Flag

Add a `deletedAt` field to your schema to track when a document was soft-deleted:

```javascript
db.users.updateOne(
  { _id: ObjectId("64a1b2c3d4e5f6789abc1234") },
  {
    $set: {
      deletedAt: new Date(),
      deletedBy: "admin"
    }
  }
)
```

## Querying Active Documents

Always filter out soft-deleted documents in your application queries:

```javascript
// Find only active users
db.users.find({ deletedAt: { $exists: false } })

// Or use null check
db.users.find({ deletedAt: null })
```

## Creating a Partial Index

Use a partial index to improve query performance on non-deleted documents:

```javascript
db.users.createIndex(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null }
  }
)
```

This index only covers active documents where `deletedAt` is `null` or missing, keeping it compact and ensuring uniqueness only among non-deleted records.

## Recovering a Soft-Deleted Document

To restore a document, unset the `deletedAt` field:

```javascript
db.users.updateOne(
  { _id: ObjectId("64a1b2c3d4e5f6789abc1234") },
  {
    $unset: { deletedAt: "", deletedBy: "" }
  }
)
```

## Bulk Soft Delete and Recovery

For bulk operations, use `updateMany`:

```javascript
// Soft delete all inactive accounts
db.users.updateMany(
  { lastLoginAt: { $lt: new Date("2024-01-01") } },
  { $set: { deletedAt: new Date(), deletedBy: "cleanup-job" } }
)

// Recover all documents deleted in a date range
db.users.updateMany(
  {
    deletedAt: {
      $gte: new Date("2026-03-01"),
      $lte: new Date("2026-03-31")
    }
  },
  { $unset: { deletedAt: "", deletedBy: "" } }
)
```

## TTL-Based Permanent Cleanup

After a retention period, permanently remove soft-deleted documents using a TTL index:

```javascript
db.users.createIndex(
  { deletedAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 days
)
```

## Mongoose Example

In a Node.js application with Mongoose, implement soft delete as a schema plugin:

```javascript
const softDeletePlugin = (schema) => {
  schema.add({ deletedAt: { type: Date, default: null } });

  schema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
  };

  schema.pre("find", function () {
    this.where({ deletedAt: null });
  });

  schema.pre("findOne", function () {
    this.where({ deletedAt: null });
  });
};

UserSchema.plugin(softDeletePlugin);
```

## Summary

Soft delete in MongoDB is implemented by adding a `deletedAt` timestamp field and filtering it out in queries. Partial indexes ensure performance and uniqueness constraints work correctly among active records. TTL indexes can automate permanent cleanup after a configurable retention window.
