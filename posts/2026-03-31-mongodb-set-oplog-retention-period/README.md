# How to Set Minimum Oplog Retention Periods in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Replication, Configuration, Replica Set

Description: Learn how to set a minimum oplog retention period in MongoDB so that secondaries recovering from downtime have enough oplog history to resync without a full initial sync.

---

By default, MongoDB's oplog is a capped collection that overwrites old entries when it fills up. For busy clusters with small oplogs, a secondary that is down for even a few hours might miss entries and require a full initial sync. Setting a minimum retention period prevents this.

## The Problem with Purely Size-Based Oplog

A 1 GB oplog on a cluster writing 100 MB/hour covers only 10 hours. If a secondary is down for maintenance for 12 hours, it falls too far behind and MongoDB triggers a full resync, which can take hours or days on large datasets.

## Setting Oplog Minimum Retention (MongoDB 4.4+)

MongoDB 4.4 introduced `oplogMinRetentionHours`, which prevents the oplog from discarding entries younger than the specified time, even if the oplog is full:

```javascript
db.adminCommand({
  replSetResizeOplog: 1,
  minRetentionHours: 24
});
```

This tells MongoDB: "Even if the oplog is full, keep at least 24 hours of history. Grow the oplog storage if necessary."

## Combining Size and Retention

You can set both a minimum size and a minimum retention period:

```javascript
db.adminCommand({
  replSetResizeOplog: 1,
  size: 10240,           // 10 GB minimum size
  minRetentionHours: 48  // 48 hours minimum retention
});
```

MongoDB respects whichever constraint results in a larger oplog.

## Setting Retention at Startup

Configure retention in `mongod.conf`:

```yaml
replication:
  replSetName: "rs0"
  oplogSizeMB: 10240
storage:
  oplogMinRetentionHours: 48
```

Or as a command-line argument:

```bash
mongod --oplogMinRetentionHours 48 --oplogSize 10240
```

## Verifying the Configuration

```javascript
use local
db.oplog.rs.stats().maxSize / 1048576  // in MB
```

Check the current retention setting:

```javascript
db.adminCommand({ getParameter: 1, oplogMinRetentionHours: 1 })
```

## Understanding Storage Impact

When the oplog fills but entries are younger than `minRetentionHours`, MongoDB extends the oplog beyond its configured size. This means disk space consumption can grow beyond what you configured. Plan for this:

```text
Configured oplog size:     10 GB
Actual disk usage (burst): up to 25 GB during heavy write periods
```

Monitor oplog disk usage from the mongo shell:

```javascript
use local
db.oplog.rs.stats().storageSize / (1024 * 1024 * 1024)  // in GB
```

## Recommended Retention Values

| Cluster Type         | Recommended Retention |
|----------------------|-----------------------|
| Low-volume (< 1 GB/day) | 72 hours           |
| Medium-volume        | 48 hours              |
| High-volume (> 50 GB/day) | 24 hours          |
| Maintenance windows requiring offline time | > window + 20% |

## Summary

`oplogMinRetentionHours` prevents MongoDB from discarding recent oplog entries even when the oplog reaches its size limit, ensuring secondaries can resync after maintenance windows without triggering a full initial sync. Set it to cover at least the longest expected maintenance window plus a safety margin. Monitor actual disk usage since the oplog can grow beyond its configured size when the retention constraint is active.
