# How to Configure MongoDB Backups for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Production, Mongodump, Disaster Recovery

Description: Learn how to set up reliable MongoDB backups for production using mongodump, filesystem snapshots, and Atlas automated backups with retention policies.

---

## Backup Strategy Overview

A production backup strategy should cover:
- Recovery Point Objective (RPO): how much data loss is acceptable
- Recovery Time Objective (RTO): how fast you need to recover
- Retention period: how far back you can restore

## Option 1: mongodump (Logical Backup)

`mongodump` exports data as BSON files. Best for smaller datasets or selective collection backups.

```bash
# Full backup
mongodump \
  --host mongo.example.com:27017 \
  --authenticationDatabase admin \
  --username admin \
  --password "${DB_PASSWORD}" \
  --out /backup/$(date +%Y%m%d_%H%M%S) \
  --gzip

# Single database backup
mongodump \
  --uri "mongodb://admin:${DB_PASSWORD}@mongo.example.com:27017/myapp?authSource=admin" \
  --out /backup/myapp_$(date +%Y%m%d) \
  --gzip
```

## Automating with Cron

```bash
# /etc/cron.d/mongodb-backup
0 2 * * * mongodb /usr/bin/mongodump \
  --host localhost \
  --authenticationDatabase admin \
  --username admin \
  --password "${DB_PASSWORD}" \
  --out /backup/daily/$(date +\%Y\%m\%d) \
  --gzip \
  2>&1 | tee -a /var/log/mongodb-backup.log
```

## Option 2: Filesystem Snapshot (LVM or Cloud Volume)

For large datasets, filesystem-level snapshots are faster than `mongodump`. First, flush writes:

```javascript
// Freeze journal and data writes
db.adminCommand({ fsync: 1, lock: true })
```

Then take the snapshot:

```bash
# LVM snapshot
lvcreate --size 10G --snapshot --name mongodb-snap /dev/vg0/mongodb

# AWS EBS snapshot
aws ec2 create-snapshot \
  --volume-id vol-xxxxxxxx \
  --description "MongoDB backup $(date +%Y-%m-%d)"
```

Unfreeze MongoDB:

```javascript
db.adminCommand({ fsyncUnlock: 1 })
```

## Option 3: Replica Set Backup via Hidden Member

Add a hidden, non-voting member dedicated to backups to avoid impact on primary:

```javascript
cfg = rs.conf()
cfg.members.push({
  _id: 3,
  host: "mongo-backup:27017",
  hidden: true,
  votes: 0,
  priority: 0
})
rs.reconfig(cfg)
```

Run `mongodump` against the hidden member:

```bash
mongodump --host mongo-backup:27017 --out /backup/$(date +%Y%m%d)
```

## Backup Retention Script

```bash
#!/bin/bash
BACKUP_DIR="/backup/daily"
RETENTION_DAYS=30

find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;
echo "Old backups pruned at $(date)"
```

## Restoring from mongodump

```bash
mongorestore \
  --host mongo.example.com:27017 \
  --authenticationDatabase admin \
  --username admin \
  --password "${DB_PASSWORD}" \
  --gzip \
  --drop \
  /backup/20260330_020000
```

## Testing Backups

Always test restores. Create a restore verification script:

```bash
#!/bin/bash
LATEST_BACKUP=$(ls -td /backup/daily/* | head -1)
mongorestore --host test-mongo:27017 --drop "$LATEST_BACKUP"
# Run verification queries
mongosh test-mongo:27017/myapp --eval "db.orders.countDocuments()"
```

## Summary

Production MongoDB backup strategy should combine scheduled `mongodump` exports for logical backups with filesystem snapshots for large datasets. Use a hidden replica set member for backup operations to avoid impacting live traffic. Always test restore procedures and implement automated retention policies to manage backup storage costs.
