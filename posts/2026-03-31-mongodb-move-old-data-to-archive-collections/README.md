# How to Move Old Data to Archive Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Archive, Collection, Data Management, Performance

Description: Learn how to move old data to archive collections in MongoDB to keep active collections lean, improve query performance, and manage data lifecycle.

---

## Why Archive Old Data to a Separate Collection

As collections grow, query performance degrades even with good indexes. Moving stale or rarely accessed documents to an archive collection keeps your hot collection small, reduces index size, and speeds up reads on active data. This pattern is common for event logs, order history, and audit trails.

## Step 1: Define Your Archival Criteria

Decide what makes a document "old." Typically you use a date field or a status field.

```javascript
// Archive orders older than 1 year
const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 1);
const filter = { createdAt: { $lt: cutoff } };
```

## Step 2: Create the Archive Collection

MongoDB creates collections implicitly on first insert, but you can pre-create with options:

```javascript
db.createCollection("orders_archive", {
  storageEngine: { wiredTiger: { configString: "block_compressor=zstd" } }
});
```

Using zstd compression on archive collections reduces disk usage significantly for cold data.

## Step 3: Copy Documents to the Archive Collection

Use `$merge` in an aggregation pipeline to bulk-copy documents:

```javascript
db.orders.aggregate([
  { $match: { createdAt: { $lt: cutoff } } },
  { $merge: {
      into: "orders_archive",
      on: "_id",
      whenMatched: "keepExisting",
      whenNotMatched: "insert"
  }}
]);
```

Using `$merge` with `whenMatched: "keepExisting"` makes the operation idempotent - safe to re-run if interrupted.

## Step 4: Verify the Copy

Always verify counts before deleting:

```javascript
const sourceCount = db.orders.countDocuments({ createdAt: { $lt: cutoff } });
const archiveCount = db.orders_archive.countDocuments({ createdAt: { $lt: cutoff } });

if (sourceCount === archiveCount) {
  print(`Safe to delete: ${sourceCount} documents`);
} else {
  print(`Mismatch! Source: ${sourceCount}, Archive: ${archiveCount}`);
}
```

## Step 5: Delete from the Active Collection

Only delete after verification:

```javascript
db.orders.deleteMany({ createdAt: { $lt: cutoff } });
```

For large collections, batch the deletions to avoid locking:

```javascript
let deleted = 0;
let ids;
do {
  ids = db.orders.find({ createdAt: { $lt: cutoff } }, { _id: 1 }).limit(1000).toArray();
  if (ids.length > 0) {
    const result = db.orders.deleteMany({ _id: { $in: ids.map(d => d._id) } });
    deleted += result.deletedCount;
    sleep(100); // Brief pause to reduce impact
  }
} while (ids.length > 0);
print(`Total deleted: ${deleted}`);
```

## Step 6: Automate with a Script

Schedule this as a recurring job using a cron task or MongoDB Atlas Scheduled Triggers:

```javascript
// Atlas Trigger function (runs nightly)
exports = async function() {
  const db = context.services.get("mongodb-atlas").db("myapp");
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);

  await db.collection("orders").aggregate([
    { $match: { createdAt: { $lt: cutoff } } },
    { $merge: { into: "orders_archive", whenMatched: "keepExisting", whenNotMatched: "insert" } }
  ]).toArray();

  await db.collection("orders").deleteMany({ createdAt: { $lt: cutoff } });
};
```

## Step 7: Index the Archive Collection

Add appropriate indexes to the archive collection if you need to query it:

```javascript
db.orders_archive.createIndex({ createdAt: 1 });
db.orders_archive.createIndex({ customerId: 1, createdAt: 1 });
```

Keep indexes minimal on archive collections since write performance is less critical.

## Summary

Moving old data to archive collections involves defining a cutoff criteria, copying documents using `$merge` for idempotency, verifying counts before deletion, and batching deletes to minimize impact on production workloads. Automate the process with Atlas Scheduled Triggers or cron jobs, and use zstd compression on archive collections to reduce storage costs.
