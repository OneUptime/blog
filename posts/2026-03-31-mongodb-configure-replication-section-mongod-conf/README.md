# How to Configure the replication Section in mongod.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replication, Replica Set, Configuration, High Availability

Description: Learn how to configure the replication section in mongod.conf to set replica set name, oplog size, and enable change stream pre-images for MongoDB deployments.

---

The `replication` section in `mongod.conf` turns a standalone `mongod` into a replica set member. Getting this configuration right is the foundation of MongoDB high availability and data redundancy.

## Basic Structure

```yaml
replication:
  replSetName: rs0
  oplogSizeMB: 1024
```

## Setting the Replica Set Name

The `replSetName` must be identical on every member of the replica set. A mismatch prevents members from forming a quorum.

```yaml
replication:
  replSetName: rs0
```

After setting this value and restarting `mongod`, initialize the replica set from `mongosh`.

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
});
```

## Configuring Oplog Size

The oplog (operations log) is a capped collection that records all write operations. Its size determines how far behind a secondary can fall before it needs full resync.

```yaml
replication:
  oplogSizeMB: 2048
```

MongoDB recommends an oplog large enough to hold at least 24 hours of write activity. On high-write deployments, increase this to several gigabytes. The default is 5% of free disk space, capped at 50 GB.

## Majority Read Concern

Starting in MongoDB 5.0, `readConcern: "majority"` is always enabled and the `enableMajorityReadConcern` configuration option was removed. You do not need to set it in `mongod.conf`.

In MongoDB 4.4 and earlier, this option existed under the `replication` section and defaulted to `true`. Disabling it could improve performance on memory-constrained servers but prevented the use of causal consistency and transactions with majority read concern. If you are running MongoDB 5.0 or later, do not include `enableMajorityReadConcern` in your configuration file, as it will produce a startup warning.

## Enabling Change Stream Pre-Images

To store the state of a document before an update or delete (needed by some change stream consumers), enable pre-images at the collection level.

```javascript
db.createCollection("orders", {
  changeStreamPreAndPostImages: { enabled: true }
});
```

There is no global `mongod.conf` option for pre-images; they are configured per collection.

## Checking Replica Set Status

Verify that all members have joined and one is elected primary.

```javascript
rs.status()
rs.conf()
```

Monitor oplog usage to ensure the oplog is large enough.

```javascript
rs.printReplicationInfo()
```

## Summary

The `replication` section in `mongod.conf` needs only `replSetName` and optionally `oplogSizeMB` to get started. Match the replica set name exactly across all members and size the oplog to accommodate at least 24 hours of peak write volume. In MongoDB 5.0 and later, majority read concern is always enabled and requires no configuration. Run `rs.initiate()` once after starting all members with matching configuration.
