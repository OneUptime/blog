# How to Respond to MongoDB Background Index Build Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Alert, Operation, Index Build

Description: Learn how to diagnose and recover from MongoDB index build failures, check build status, resume interrupted builds, and avoid common pitfalls in production.

---

## How MongoDB Builds Indexes

Since MongoDB 4.4, all index builds are hybrid builds: they hold a brief exclusive lock at the start and end of the build but allow concurrent reads and writes during the bulk phase. On Atlas, a failed index build fires an alert in the Events feed.

## Step 1: Check Index Build Status

List in-progress index builds:

```javascript
db.adminCommand({ currentOp: true, "command.createIndexes": { $exists: true } })
  .inprog
  .forEach(op => {
    print("Collection:", op.ns);
    print("Phase:", op.msg);
    print("Progress:", JSON.stringify(op.progress));
    print("Duration:", op.secs_running, "seconds");
  });
```

Check for in-progress index builds on the current node:

```javascript
db.currentOp({ "command.createIndexes": { $exists: true } })
  .inprog
  .forEach(op => print(op.ns, op.msg));
```

## Step 2: Common Causes of Index Build Failures

### Unique constraint violation

The most common cause. Attempting to build a unique index on a field that already has duplicate values:

```text
Index build failed: E11000 duplicate key error
```

Find the duplicates before creating the index:

```javascript
db.users.aggregate([
  { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
]);
```

Remove or deduplicate, then retry the index build.

### Out of disk space during build

Index builds create temporary files. If disk runs out mid-build, the build fails. Check disk usage and free space before building large indexes.

### Primary failover during build

In MongoDB 4.4+, index builds survive replica set elections. If the primary steps down, the secondary that becomes primary continues the build. If a `mongod` instance restarts during an index build, the build automatically resumes on startup from where it left off.

## Step 3: Check if Index Was Created Successfully

After a reported failure, verify the index state:

```javascript
db.orders.getIndexes().forEach(idx => print(JSON.stringify(idx)));
```

If the index is absent, the build failed or is still in progress. Use `currentOp` (Step 1) to check for active builds.

## Step 4: Resume or Retry an Index Build

On Atlas, failed index builds appear in the Search or Indexes tab. To retry, drop any incomplete index shell and re-issue the `createIndex` command:

```javascript
// Drop incomplete index if it exists
try {
  db.orders.dropIndex("status_1_createdAt_-1");
} catch (e) {
  print("Index not found, proceeding:", e.message);
}

// Rebuild
db.orders.createIndex(
  { status: 1, createdAt: -1 },
  { comment: "retry-build-2026-03-31" }
);
```

## Step 5: Monitor Build Progress

Poll `currentOp` to watch progress:

```bash
watch -n 5 mongosh --eval "
  db.adminCommand({ currentOp: true, 'command.createIndexes': { \$exists: true }})
    .inprog.forEach(op => print(op.ns, op.msg, JSON.stringify(op.progress)));
"
```

## Step 6: Prevent Build Failures

- Check for unique violations before creating unique indexes
- Ensure at least 2x the index size is available in free disk space
- Schedule large index builds during low-traffic periods
- Specify `writeConcern: { w: "majority" }` on the `createIndex` command to confirm replication

## Summary

MongoDB index build failures are most commonly caused by unique constraint violations in existing data, insufficient disk space, or replica set instability during the build. Diagnose with `currentOp` and `getIndexes`, resolve the root cause (deduplicate data, free disk space), then retry by dropping the incomplete index and reissuing `createIndex`. MongoDB 4.4+ hybrid builds are resilient to elections and support concurrent reads and writes throughout the build process.
