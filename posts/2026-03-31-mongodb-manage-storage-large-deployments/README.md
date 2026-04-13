# How to Manage Storage for Large MongoDB Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Storage, Sharding, Archival, Capacity Planning

Description: Best practices for managing storage in large MongoDB deployments, including sharding, archiving, TTL indexes, and capacity planning strategies.

---

## Storage Challenges at Scale

Large MongoDB deployments face several storage management challenges: uneven collection growth, index bloat, hot shards, and the need to archive cold data without impacting live queries. A proactive storage strategy addresses all of these.

## Capacity Planning with dbStats

Start with a baseline measurement and track growth weekly:

```javascript
// Get total storage across all databases
db.adminCommand({ listDatabases: 1 }).databases.forEach(d => {
  const stats = db.getSiblingDB(d.name).stats({ scale: 1024 * 1024 * 1024 });
  print(`${d.name}: ${stats.totalSize?.toFixed(2)} GB`);
});
```

Track `totalSize` over time to project when you will need additional storage. A 20% monthly growth rate means you need to double capacity roughly every four months.

## Using TTL Indexes to Control Data Retention

TTL indexes automatically delete documents after a specified period, keeping collections bounded:

```javascript
// Delete log documents 90 days after creation
db.app_logs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 }
);
```

TTL deletion runs in the background and has minimal impact on production traffic. Monitor its activity via the `ttl` field in `serverStatus`:

```javascript
print(db.serverStatus().metrics.ttl);
// { deletedDocuments: 12543, passes: 287 }
```

## Archiving Cold Data with $merge

Move old data to an archive collection (potentially in a different database or cluster) on a schedule:

```javascript
const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

// Archive old orders
db.orders.aggregate([
  { $match: { createdAt: { $lt: cutoff }, archived: { $ne: true } } },
  { $addFields: { archived: true, archivedAt: new Date() } },
  { $merge: {
    into: { db: "archive", coll: "orders" },
    whenMatched: "replace",
    whenNotMatched: "insert"
  }}
]);

// Mark as archived in source (do not delete until verified)
db.orders.updateMany(
  { createdAt: { $lt: cutoff } },
  { $set: { archived: true } }
);
```

## Sharding for Horizontal Storage Scaling

When a single replica set can no longer hold all data, shard the collection:

```bash
# Enable sharding on the database
mongosh --eval "sh.enableSharding('mydb')"

# Shard a collection on a hashed key for even distribution
mongosh --eval "
  sh.shardCollection('mydb.events', { userId: 'hashed' });
"
```

Monitor shard balance with:

```javascript
db.adminCommand({ balancerStatus: 1 });
sh.status();
```

## Reclaiming Space After Mass Deletes

After deleting large amounts of data, WiredTiger reclaims space gradually. Force immediate reclamation:

```javascript
// Compact a specific collection (does not block reads/writes since MongoDB 4.4)
db.runCommand({ compact: "old_events" });
```

Use this during a maintenance window. On replica sets, compact one member at a time.

## Configuring the dbPath on High-Capacity Volumes

Place the MongoDB data directory on a volume with appropriate IOPS and capacity:

```yaml
storage:
  dbPath: /data/mongodb
  directoryPerDB: true
  wiredTiger:
    engineConfig:
      directoryForIndexes: true
```

`directoryPerDB` and `directoryForIndexes` put each database and index in its own subdirectory, simplifying per-database storage monitoring and enabling mounting different volumes for hot vs. cold data.

## Summary

Manage storage in large deployments by combining TTL indexes for automatic retention, scheduled archival with `$merge`, sharding for horizontal scale, and periodic `compact` to reclaim deleted space. Use `dbStats` and `collStats` for capacity trending, and configure `directoryPerDB` to enable volume-level separation of hot and cold data. Proactive monitoring and a documented retention policy prevent emergency disk-full situations.
