# How to Monitor and Manage Temporary Storage in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Temporary Storage, Aggregation, Sort, allowDiskUse

Description: Learn how MongoDB uses temporary storage for sorts and aggregations, how to monitor temp file usage, and how to prevent runaway disk consumption.

---

## When MongoDB Uses Temporary Storage

MongoDB writes temporary data to disk in two main situations:

1. **Sort operations** that exceed the 100 MB in-memory sort limit
2. **Aggregation pipeline stages** that process more than 100 MB of data and have `allowDiskUse: true` enabled

Without `allowDiskUse: true`, large sorts and aggregations fail with a `QueryExceededMemoryLimitNoDiskUseAllowed` error. With it enabled, MongoDB spills to a temp directory under `dbPath/_tmp`.

## Locating the Temporary File Directory

MongoDB writes temp files to a subdirectory within `dbPath`:

```bash
# Find the dbPath from mongod.conf
grep dbPath /etc/mongod.conf

# Temp files are in _tmp subdirectory
ls -lh /var/lib/mongodb/_tmp/
```

Monitor the size of this directory to detect runaway aggregations or sorts holding large amounts of temp data.

## Monitoring Temp Space with currentOp

Check active operations using disk:

```javascript
db.currentOp({
  "waitingForLock": false,
  "active": true
}).inprog.filter(op => op.msg && op.msg.includes("sort"))
  .forEach(op => printjson({
    opid: op.opid,
    client: op.client,
    secs: op.secs_running,
    msg: op.msg
  }));
```

Long-running sort operations are the most common cause of temp space accumulation.

## Limiting Aggregation Memory Usage

Set a per-operation memory limit to prevent any single query from consuming excessive temp space:

```javascript
db.events.aggregate(
  [
    { $group: { _id: "$userId", total: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ],
  {
    allowDiskUse: true,
    cursor: {},
    maxTimeMS: 30000
  }
);
```

The `maxTimeMS` option kills the aggregation if it takes too long, freeing temp space.

## Disabling allowDiskUse Globally

To prevent all temp disk usage and force optimization of large queries, disable `allowDiskUse` at the query level or configure the server:

```javascript
// MongoDB 6.0+: disable allowDiskUse for user queries via setParameter
db.adminCommand({
  setParameter: 1,
  allowDiskUseByDefault: false
});
```

With this setting, queries must explicitly set `allowDiskUse: true` or they will fail if they exceed the memory limit.

## Configuring the Temp Directory Size (Linux)

On Linux, you can mount the temp directory on a separate, size-limited filesystem:

```bash
# Create a 10 GB tmp filesystem
sudo mkfs.ext4 /dev/sdb1
sudo mount /dev/sdb1 /var/lib/mongodb/_tmp
echo "/dev/sdb1 /var/lib/mongodb/_tmp ext4 defaults 0 2" | sudo tee -a /etc/fstab
sudo chown -R mongodb:mongodb /var/lib/mongodb/_tmp
```

This prevents MongoDB temp files from filling the main data volume.

## Monitoring Temp File Growth with a Shell Script

```bash
#!/bin/bash
TMP_DIR=$(mongosh --quiet --eval "db.adminCommand({getCmdLineOpts:1}).parsed.storage?.dbPath || '/var/lib/mongodb'")/_tmp
while true; do
  SIZE=$(du -sh "$TMP_DIR" 2>/dev/null | cut -f1)
  echo "$(date -u +%H:%M:%S) tmp: $SIZE"
  sleep 10
done
```

Alert when the temp directory exceeds a threshold (e.g., 5 GB) so you can kill the offending operation before disk runs out.

## Summary

MongoDB uses temporary disk storage for large sorts and aggregations when `allowDiskUse: true` is set. Monitor the `_tmp` subdirectory under `dbPath` for unexpected growth, use `currentOp` to identify long-running sort operations, and set `maxTimeMS` to bound runaway queries. For strict control, disable `allowDiskUseByDefault` and mount the temp directory on a separate size-limited volume to protect your main data disk.
