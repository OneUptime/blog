# How to Calculate Recovery Time Objective (RTO) for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Recovery, Reliability, Database

Description: Learn how to calculate MongoDB Recovery Time Objective by benchmarking restore times, identifying bottlenecks, and optimizing your recovery process.

---

## What Is RTO for MongoDB

Recovery Time Objective (RTO) is the maximum acceptable time between a failure event and full restoration of service. If your RTO is 2 hours, your MongoDB recovery process - from detecting failure to serving production traffic - must complete within 2 hours.

RTO is not just the time to run `mongorestore`. It includes detection time, failover decisions, downloading backup files, restoring data, replica set initialization, application health checks, and traffic cutover.

## Breaking Down MongoDB RTO Components

```text
Total RTO = Detection + Decision + Provision + Download + Restore + Validate + Cutover

Example:
  Detection:   5 min  (alerting + on-call response)
  Decision:    5 min  (assess whether to failover or restore)
  Provision:  10 min  (spin up replacement server if needed)
  Download:   20 min  (retrieve backup from S3/GCS)
  Restore:    45 min  (mongorestore execution time)
  Validate:   10 min  (verify collections and doc counts)
  Cutover:     5 min  (update connection strings/DNS)
  Total:     100 min  (~1h 40min)
```

## Benchmarking Your Restore Time

The biggest variable in RTO is how long `mongorestore` takes. Benchmark it:

```bash
#!/bin/bash
# benchmark-restore.sh

BACKUP_FILE="/backups/latest.archive.gz"
TEST_PORT=27099
TEST_DBPATH="/tmp/rto-benchmark-$$"

mkdir -p "$TEST_DBPATH"
mongod --dbpath "$TEST_DBPATH" --port "$TEST_PORT" \
  --logpath "$TEST_DBPATH/mongod.log" --fork --bind_ip 127.0.0.1

START=$(date +%s)

mongorestore \
  --uri "mongodb://localhost:$TEST_PORT" \
  --gzip \
  --archive="$BACKUP_FILE" \
  --numParallelCollections=4 \
  --drop

END=$(date +%s)
ELAPSED=$((END - START))

echo "Restore time: ${ELAPSED}s ($(( ELAPSED / 60 ))m $(( ELAPSED % 60 ))s)"
echo "Backup size: $(du -sh $BACKUP_FILE | cut -f1)"
echo "Restore throughput: $(echo "scale=1; $(stat -c%s $BACKUP_FILE) / 1048576 / $ELAPSED" | bc) MB/s"

mongosh "mongodb://localhost:$TEST_PORT" --eval "db.adminCommand({shutdown:1})" 2>/dev/null || true
rm -rf "$TEST_DBPATH"
```

## Optimizing Restore Speed

Improve restore throughput with parallel collection loading:

```bash
# Use multiple parallel collections (default is 4)
mongorestore \
  --uri "mongodb://user:pass@localhost:27017" \
  --gzip \
  --archive=/backups/latest.archive.gz \
  --numParallelCollections=8 \
  --numInsertionWorkersPerCollection=2 \
  --drop
```

Disable index builds during restore and rebuild afterward:

```bash
mongorestore \
  --uri "mongodb://user:pass@localhost:27017" \
  --gzip \
  --archive=/backups/latest.archive.gz \
  --noIndexRestore \
  --drop

# After data is loaded, manually create your required indexes
mongosh --eval "
  // Example: recreate indexes for your collections
  db.getSiblingDB('mydb').orders.createIndex({customerId: 1, createdAt: -1});
  db.getSiblingDB('mydb').orders.createIndex({status: 1});
  db.getSiblingDB('mydb').users.createIndex({email: 1}, {unique: true});
  // Add all indexes your application requires
"
```

## RTO for Replica Set Failover vs Full Restore

For replica sets, automatic failover is much faster than a full restore:

```javascript
// Check replica set failover time configuration
rs.conf().settings
// Look for electionTimeoutMillis (default 10000 = 10 seconds)

// Replica set automatic failover RTO
// Detection: electionTimeoutMillis (default 10s)
// Election: ~5-15 seconds
// Application reconnect: depends on driver settings
// Total replica set failover RTO: ~30-60 seconds
```

Configure driver retry settings to reduce application-level RTO:

```javascript
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  retryWrites: true,
  retryReads: true
});
```

## Tracking RTO in Runbooks

Document and rehearse your recovery procedure:

```text
# MongoDB Recovery Runbook

## Estimated RTO: 2 hours

1. [ ] Alert received - identify failed instance (5 min)
2. [ ] Check replica set status: rs.status() (2 min)
3. [ ] If primary failed: confirm secondary election (10 min)
4. [ ] If full restore needed: identify latest backup (5 min)
5. [ ] Download backup from S3: aws s3 cp (20 min)
6. [ ] Provision replacement server if needed (10 min)
7. [ ] Run mongorestore with --numParallelCollections=8 (45 min)
8. [ ] Validate collections and document counts (10 min)
9. [ ] Update connection strings and DNS (5 min)
10. [ ] Confirm application health checks pass (5 min)
```

## Summary

MongoDB RTO is the total time from failure to restored service, encompassing detection, decision-making, provisioning, download, restore, validation, and cutover. Benchmark your restore time regularly with `mongorestore --numParallelCollections`, consider disabling index builds during restore, and prefer replica set automatic failover (30-60 seconds) over full restores (30+ minutes) for planned recovery scenarios. Document and rehearse your runbook to ensure the team can execute it under pressure.
