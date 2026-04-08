# How to Implement Data Archival Strategies in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Archival, TTL, Performance

Description: Explore practical MongoDB data archival strategies including TTL indexes, online archive, cold tier migration, and aggregation-based data movement patterns.

---

## Why Archive Data in MongoDB

As collections grow, query performance degrades and storage costs rise. Archival moves infrequently accessed documents out of hot collections while keeping them queryable. MongoDB offers several approaches: TTL indexes for automatic expiry, Atlas Online Archive for transparent cold storage, and manual migration pipelines.

## TTL Indexes for Automatic Expiry

TTL indexes automatically delete documents after a specified time. They work well for logs, sessions, and ephemeral records.

```javascript
// Create a TTL index that expires documents 90 days after createdAt
db.audit_logs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 }
);
```

Check the TTL index and its expiry setting:

```javascript
db.audit_logs.getIndexes();
```

## Moving Data to an Archive Collection

For records that must be retained but rarely queried, use an aggregation pipeline to copy and then delete:

```javascript
// Move documents older than 1 year to archive
const cutoff = new Date();
cutoff.setFullYear(cutoff.getFullYear() - 1);

const session = db.getMongo().startSession();
session.startTransaction();

try {
  const old = db.orders.find({ createdAt: { $lt: cutoff } }).toArray();
  if (old.length > 0) {
    db.orders_archive.insertMany(old, { session });
    const ids = old.map(d => d._id);
    db.orders.deleteMany({ _id: { $in: ids } }, { session });
  }
  session.commitTransaction();
} catch (err) {
  session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

## Using $out for Bulk Archival

The aggregation `$out` stage writes results to a collection, making it efficient for bulk moves:

```javascript
db.events.aggregate([
  { $match: { timestamp: { $lt: new Date("2024-01-01") } } },
  { $out: "events_2023_archive" }
]);

// After verifying the archive, delete from the source
db.events.deleteMany({ timestamp: { $lt: new Date("2024-01-01") } });
```

## Atlas Online Archive

MongoDB Atlas Online Archive automatically tiers data to low-cost object storage based on query patterns or date rules. Configure it through the Atlas UI or API:

```bash
# Example Atlas Admin API call to create an archive policy
curl --digest -u "publicKey:privateKey" \
  -X POST "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}/onlineArchives" \
  -H "Content-Type: application/json" \
  -d '{
    "collName": "orders",
    "dbName": "shop",
    "criteria": {
      "type": "DATE",
      "dateField": "createdAt",
      "expireAfterDays": 90
    }
  }'
```

Archived data remains queryable through Atlas Data Federation using the same connection string.

## Partitioning with Date-Based Collections

A common pattern is to store data in monthly collections and keep only recent months hot:

```javascript
const month = new Date().toISOString().slice(0, 7).replace("-", "_");
const collName = `events_${month}`;
db[collName].insertOne({ type: "click", userId: "u123", ts: new Date() });
```

This makes archiving trivial - simply rename or drop older monthly collections.

## Summary

MongoDB data archival options range from TTL indexes for automatic expiry, to manual pipeline-based migration, to Atlas Online Archive for transparent cold tiering. Choose TTL for ephemeral data, aggregation pipelines for controlled batch moves, and Online Archive when you need queryable cold storage without application changes.
