# How to Identify Unused Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Indexing, Performance, Index Optimization, Query Tuning

Description: Learn how to identify and safely remove unused indexes in MongoDB using $indexStats and related tools to reduce storage and write overhead.

---

## Why Unused Indexes Hurt Performance

Every index in MongoDB consumes disk space and must be maintained on every write operation (insert, update, delete). Unused indexes waste resources without providing any query benefit. Identifying and removing them improves write throughput and reduces memory pressure.

## Using $indexStats to Find Unused Indexes

The `$indexStats` aggregation stage returns access statistics for all indexes on a collection:

```javascript
db.orders.aggregate([{ $indexStats: {} }])
```

Example output:

```javascript
[
  {
    name: "_id_",
    accesses: { ops: 45230, since: ISODate("2026-01-01T00:00:00Z") }
  },
  {
    name: "oldRegionIndex",
    accesses: { ops: 0, since: ISODate("2026-01-01T00:00:00Z") }
  }
]
```

An index with `ops: 0` has never been used since the last server restart.

## Listing All Indexes with Zero Access Counts

```javascript
db.orders.aggregate([
  { $indexStats: {} },
  { $match: { "accesses.ops": 0 } },
  { $project: { name: 1, key: 1, accesses: 1 } }
])
```

## Checking Across All Collections

```javascript
db.getCollectionNames().forEach(function(coll) {
  var unused = db[coll].aggregate([
    { $indexStats: {} },
    { $match: { "accesses.ops": 0 } }
  ]).toArray();

  if (unused.length > 0) {
    print("Collection: " + coll);
    unused.forEach(function(idx) {
      if (idx.name !== "_id_") {
        print("  Unused index: " + idx.name);
      }
    });
  }
});
```

## Important Caveats

**Stats reset on restart**: `$indexStats` counters reset when `mongod` restarts. Collect data over a meaningful period (weeks, not hours) before dropping indexes.

**Time-based access patterns**: Some indexes may only be used during monthly reports or year-end batch jobs. Monitor for at least one complete business cycle.

**Replica sets**: Run `$indexStats` on all replica set members, as secondary reads may use indexes that primaries do not.

## Using explain() to Verify Index Usage

Before dropping a suspected unused index, check if specific queries would use it:

```javascript
db.orders.find({ region: "US" }).explain("queryPlanner")
```

If no queries in your application plan reference the index, it is safe to drop.

## Dropping an Unused Index

Once confirmed unused, drop the index:

```javascript
db.orders.dropIndex("oldRegionIndex")
```

Or by key specification:

```javascript
db.orders.dropIndex({ region: 1 })
```

## Rolling Index Drop in Production

In production, consider dropping indexes during low-traffic windows. Dropping an index is generally fast, though it briefly acquires an exclusive collection lock.

```bash
# Use mongosh to drop index safely
mongosh --eval 'db.orders.dropIndex("oldRegionIndex")' mydb
```

## Building a Baseline Report

```javascript
// Save index stats to a collection for historical comparison
db.getCollectionNames().forEach(function(coll) {
  var stats = db[coll].aggregate([{ $indexStats: {} }]).toArray();
  stats.forEach(function(s) {
    s.collection = coll;
    s.recordedAt = new Date();
    db.indexStatsHistory.insertOne(s);
  });
});
```

## Summary

Use `$indexStats` with `{ $match: { "accesses.ops": 0 } }` to identify indexes that have never been accessed. Collect statistics over a full business cycle before dropping any index, account for replica set read patterns, and always verify with `explain()` before removing. Dropping unused indexes reduces storage, lowers write overhead, and frees up WiredTiger cache for active data and indexes.
