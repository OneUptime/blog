# How to Implement Continuous Backup for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Replication, Recovery, Database

Description: Learn how to implement continuous backup for MongoDB using oplog tailing, MongoDB Atlas continuous backup, and open-source tools for point-in-time recovery.

---

## What Is Continuous Backup

Continuous backup captures every write operation as it happens, enabling point-in-time recovery (PITR) to any second within the backup window. Unlike snapshot-based backups that create recovery points at scheduled intervals, continuous backup is always recording, giving you the granularity to restore to a specific moment - useful for recovering from accidental deletes or data corruption.

MongoDB continuous backup works by capturing a base snapshot and then continuously streaming the oplog (operations log) to a backup store.

## Continuous Backup with MongoDB Atlas

MongoDB Atlas provides built-in continuous backup with PITR for M10+ clusters. Enable it in Atlas via the cluster configuration:

```json
{
  "providerSettings": {
    "instanceSizeName": "M10",
    "providerName": "AWS",
    "regionName": "US_EAST_1"
  },
  "pitEnabled": true,
  "backupEnabled": true
}
```

Using the Atlas CLI:

```bash
atlas clusters update myCluster \
  --projectId <projectId> \
  --backup \
  --file cluster-config.json
```

Atlas retains the oplog for up to 72 hours on continuous backup, enabling restoration to any point within that window.

## Rolling Your Own Continuous Backup with Oplog Tailing

For self-hosted MongoDB, implement oplog tailing with a script that streams oplog entries to S3 or another durable store:

```python
import pymongo
import boto3
import json
import time
from bson import json_util

def tail_oplog_to_s3(mongo_uri, s3_bucket, prefix):
    client = pymongo.MongoClient(mongo_uri)
    local_db = client['local']
    oplog = local_db['oplog.rs']

    s3 = boto3.client('s3')

    # Start from current oplog tail
    last_ts = oplog.find_one(sort=[('$natural', -1)])['ts']

    buffer = []
    buffer_start_ts = last_ts

    while True:
        cursor = oplog.find(
            {'ts': {'$gt': last_ts}},
            cursor_type=pymongo.CursorType.TAILABLE_AWAIT
        )

        for doc in cursor:
            last_ts = doc['ts']
            buffer.append(json.loads(json_util.dumps(doc)))

            # Flush every 1000 ops or 60 seconds
            if len(buffer) >= 1000:
                flush_to_s3(s3, s3_bucket, prefix, buffer, buffer_start_ts)
                buffer = []
                buffer_start_ts = last_ts

        time.sleep(1)

def flush_to_s3(s3, bucket, prefix, ops, start_ts):
    key = f"{prefix}/oplog-{start_ts.time}-{start_ts.inc}.jsonl"
    body = '\n'.join(json.dumps(op) for op in ops)
    s3.put_object(Bucket=bucket, Key=key, Body=body)
    print(f"Flushed {len(ops)} oplog entries to s3://{bucket}/{key}")
```

## Base Snapshot + Oplog Strategy

Continuous backup requires both a base snapshot and an oplog stream. Use `mongodump` for the initial snapshot:

```bash
# Capture base snapshot with oplog
mongodump \
  --uri "mongodb://user:pass@localhost:27017" \
  --oplog \
  --gzip \
  --archive=/backups/base-$(date +%Y%m%d).archive

# Record the oplog timestamp at snapshot time
mongosh --eval "db.adminCommand({replSetGetStatus:1}).members.filter(m=>m.stateStr==='PRIMARY')[0].optime"
```

The `--oplog` flag includes oplog entries captured during the dump, ensuring a consistent point-in-time baseline.

## Restoring to a Point in Time

To restore to a specific timestamp using your base snapshot plus captured oplog files:

```bash
# Step 1: Restore the base snapshot
mongorestore \
  --uri "mongodb://user:pass@localhost:27017" \
  --gzip \
  --archive=/backups/base-20240115.archive \
  --drop

# Step 2: Apply oplog entries up to the target time
mongorestore \
  --uri "mongodb://user:pass@localhost:27017" \
  --oplogReplay \
  --oplogLimit "1705276800:1" \
  /backups/oplog-replay/
```

The `--oplogLimit` parameter takes a `timestamp:ordinal` format (Unix seconds:increment).

## Monitoring Backup Lag

Track oplog lag to ensure your backup stream keeps up with writes:

```javascript
// Check oplog window size
use local
db.oplog.rs.stats().maxSize
db.oplog.rs.find().sort({$natural:-1}).limit(1)[0].ts
db.oplog.rs.find().sort({$natural:1}).limit(1)[0].ts
```

Use OneUptime to monitor your oplog tailing service - if it falls behind and the oplog window wraps, you lose continuity. Alert when backup lag exceeds your RPO threshold.

## Summary

MongoDB continuous backup combines a periodic base snapshot with continuous oplog streaming to enable point-in-time recovery. MongoDB Atlas provides this natively for managed clusters. For self-hosted deployments, implement oplog tailing with a persistent store and automate base snapshots to maintain a recoverable window. Always test restoration procedures against a non-production cluster to verify your backup stream integrity.
