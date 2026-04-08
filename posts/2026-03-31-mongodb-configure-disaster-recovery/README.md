# How to Configure MongoDB for Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Disaster Recovery, Backup, Replica Set, Availability

Description: Learn how to configure MongoDB for disaster recovery using replica sets, delayed members, regular backups, and tested failover procedures to meet your RTO and RPO goals.

---

Disaster recovery for MongoDB requires combining replica set redundancy, regular backups, and documented failover procedures. This post walks through each layer of a DR strategy.

## Define Your RTO and RPO

Before configuring anything, define your targets:
- **RPO (Recovery Point Objective)**: How much data loss is acceptable? (e.g., 1 hour)
- **RTO (Recovery Time Objective)**: How long can your service be offline? (e.g., 15 minutes)

These targets determine which DR mechanisms you need.

## Use a Replica Set with Geographic Distribution

At minimum, run a three-node replica set. For DR, place members in separate data centers or availability zones:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "dc1-node:27017", priority: 2 },
    { _id: 1, host: "dc2-node:27017", priority: 1 },
    { _id: 2, host: "dc3-node:27017", priority: 1 }
  ]
})
```

This ensures that if one data center fails, the remaining two can elect a new primary automatically.

## Add a Delayed Secondary

A delayed member provides a time-delayed replica of your data, protecting against accidental data deletion or corruption:

```javascript
rs.reconfig({
  _id: "rs0",
  members: [
    { _id: 0, host: "dc1-node:27017", priority: 2 },
    { _id: 1, host: "dc2-node:27017", priority: 1 },
    { _id: 2, host: "dc3-node:27017", priority: 1 },
    { _id: 3, host: "delayed-node:27017", priority: 0, hidden: true, secondaryDelaySecs: 3600 }
  ]
})
```

This node stays one hour behind the primary, giving you time to catch and recover from human errors.

## Automate Backups with mongodump

Schedule regular backups using `mongodump`:

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb/${TIMESTAMP}"

mongodump \
  --uri="mongodb://localhost:27017" \
  --oplog \
  --out="${BACKUP_DIR}"

# Compress and upload to remote storage
tar -czf "${BACKUP_DIR}.tar.gz" "${BACKUP_DIR}"
aws s3 cp "${BACKUP_DIR}.tar.gz" s3://my-backup-bucket/mongodb/
rm -rf "${BACKUP_DIR}" "${BACKUP_DIR}.tar.gz"
```

The `--oplog` flag captures writes that occur during the backup, enabling point-in-time recovery.

## Test Failover Procedures

Document and regularly test your failover runbook. Simulate a primary failure:

```javascript
// Force step-down to simulate primary failure
rs.stepDown(60)

// Verify new primary was elected
db.hello().primary
```

Measure how long the failover takes and whether your application reconnects automatically.

## Monitor for DR Readiness

Use a monitoring tool to continuously validate DR readiness:

```bash
# Check replication lag on DR node
mongosh --eval "rs.printSecondaryReplicationInfo()"
```

Alert when replication lag exceeds your RPO threshold or when a member goes offline.

## Summary

MongoDB disaster recovery combines replica sets across multiple data centers, delayed secondaries for human error protection, automated off-site backups, and regularly tested failover procedures. Define your RTO and RPO first, then configure your topology to meet those targets. Test your DR procedures on a schedule to ensure they work when you actually need them.
