# How to Fix MongoError: Index Build Failed in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Index Build, Error, Database Administration

Description: Learn why MongoDB index builds fail and how to fix issues caused by duplicate keys, insufficient disk space, constraint violations, and large collection builds.

---

## Understanding the Error

Index build failures in MongoDB typically manifest as:

```text
MongoServerError: Index build failed: <uuid>: Collection <db.collection> ( <uuid> ): Index Build Failed
MongoServerError: E11000 duplicate key error collection: ... index: ...
```

The most common causes are duplicate key violations (for unique indexes), disk space exhaustion, constraint mismatches, or the build being killed mid-progress.

## Cause 1: Duplicate Key Violation on Unique Index

When you create a unique index on a field that already contains duplicate values, MongoDB rejects the build:

```javascript
// Fails if 'email' contains duplicates
await db.collection('users').createIndex({ email: 1 }, { unique: true });
```

**Fix:** Find and remove or deduplicate the offending documents first:

```javascript
// Find duplicate emails
const pipeline = [
  { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
];
const duplicates = await db.collection('users').aggregate(pipeline).toArray();

// Remove all but the first occurrence of each duplicate
for (const dup of duplicates) {
  const toRemove = dup.ids.slice(1);
  await db.collection('users').deleteMany({ _id: { $in: toRemove } });
}

// Now create the unique index
await db.collection('users').createIndex({ email: 1 }, { unique: true });
```

## Cause 2: Insufficient Disk Space

Index builds write a temporary sort file during the build process. If disk space runs low:

```bash
df -h /var/lib/mongodb
```

Free up disk space or increase storage, then retry the index build.

## Cause 3: Index Build Was Killed (Interrupted)

If a `mongod` restarts during an index build, MongoDB 4.4 and later automatically resumes the build on startup. On older versions (4.2 and earlier), the partially-built index is discarded and must be rebuilt manually:

```javascript
// Check current index builds
db.currentOp({ "command.createIndexes": { $exists: true } })

// Rebuild after restart
await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
```

For large collections, use a rolling index build across replica set members to avoid impacting performance:

```bash
# Build on one secondary at a time, then step down primary
```

## Cause 4: Schema Constraint Violation

If you create a partial index with a filter or a sparse index, documents that don't match still need to be evaluated. Validate that your index options match the data:

```javascript
// Sparse index - only indexes documents where 'phone' exists
await db.collection('users').createIndex(
  { phone: 1 },
  { sparse: true, unique: true }
);

// Partial index - only indexes active users
await db.collection('users').createIndex(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" }
  }
);
```

## Monitoring Index Build Progress

```javascript
// In mongosh - watch progress
db.adminCommand({ currentOp: true, "command.createIndexes": { $exists: true } })
```

```javascript
// Or watch the collection's index list
await db.collection('orders').indexes()
```

## Aborting a Stuck Index Build

In MongoDB 4.4 and later, drop the in-progress index to abort its build:

```javascript
// Drop the in-progress index by name to abort the build
db.collection('orders').dropIndex('userId_1_createdAt_-1');
```

On older versions, use `killOp` to terminate the build:

```javascript
// Find the operation ID
const ops = db.adminCommand({ currentOp: true });
// Then kill it
db.adminCommand({ killOp: 1, op: <opid> });
```

## Summary

Index build failures are caused by duplicate keys in unique indexes, low disk space, interrupted builds, or constraint mismatches. Always deduplicate data before creating unique indexes, ensure adequate disk space, use partial indexes to scope uniqueness constraints, and monitor build progress on large collections.
