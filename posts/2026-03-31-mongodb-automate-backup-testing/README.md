# How to Automate Backup Testing for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Automation, Testing, Recovery

Description: Learn how to build automated MongoDB backup testing pipelines that schedule regular restore tests, validate data integrity, and alert on failures.

---

## Why Automate Backup Testing

Manual backup testing is often skipped or done infrequently, leaving teams unaware that their backups are unusable until a real disaster strikes. Automated backup testing runs restore-and-validate checks on a schedule, continuously proving that backups are recoverable. The goal is to discover failures in the backup pipeline before you need it.

A good automated backup test verifies: the backup file is readable, the restore completes without errors, collections pass internal consistency checks, and document counts match the source.

## Architecture Overview

```text
Cron / Cloud Scheduler
      |
  Backup Test Runner Script
      |
  [Download backup from S3/GCS/Azure]
      |
  [Spin up ephemeral mongod]
      |
  [Restore backup]
      |
  [Run collection validate()]
      |
  [Compare document counts]
      |
  [Report to monitoring / send heartbeat]
      |
  [Destroy test instance]
```

## Automated Test Script

```bash
#!/bin/bash
# test-mongodb-backup.sh

set -euo pipefail

S3_BUCKET="my-mongodb-backups"
S3_PREFIX="backups"
ONEUPTIME_HEARTBEAT_URL="${ONEUPTIME_HEARTBEAT_URL:-}"
TEST_PORT=27099
TEST_DBPATH="/tmp/mongodb-backup-test-$$"
RESULT_FILE="/tmp/backup-test-result-$$.json"
EXIT_CODE=0

cleanup() {
  mongosh "mongodb://localhost:$TEST_PORT" \
    --eval "db.adminCommand({shutdown:1})" 2>/dev/null || true
  rm -rf "$TEST_DBPATH" "$RESULT_FILE" /tmp/latest-backup.archive.gz
}
trap cleanup EXIT

# Find latest backup in S3
echo "Finding latest backup..."
LATEST=$(aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" \
  | sort | tail -n 1 | awk '{print $4}')

if [ -z "$LATEST" ]; then
  echo "ERROR: No backup files found in s3://$S3_BUCKET/$S3_PREFIX/"
  exit 1
fi

echo "Testing backup: $LATEST"

# Download backup
aws s3 cp "s3://$S3_BUCKET/$S3_PREFIX/$LATEST" /tmp/latest-backup.archive.gz

# Verify file integrity
gzip -t /tmp/latest-backup.archive.gz || {
  echo "ERROR: Backup file is corrupt"
  exit 1
}

# Start test mongod
mkdir -p "$TEST_DBPATH"
mongod --dbpath "$TEST_DBPATH" \
  --port "$TEST_PORT" \
  --logpath "$TEST_DBPATH/mongod.log" \
  --fork \
  --bind_ip 127.0.0.1

sleep 2

# Restore
echo "Restoring backup..."
mongorestore \
  --uri "mongodb://localhost:$TEST_PORT" \
  --gzip \
  --archive=/tmp/latest-backup.archive.gz \
  --drop || { EXIT_CODE=1; echo "ERROR: Restore failed"; }

if [ $EXIT_CODE -eq 0 ]; then
  # Validate collections
  echo "Validating collections..."
  mongosh "mongodb://localhost:$TEST_PORT" --quiet --eval "
    let errors = 0;
    db.adminCommand({listDatabases:1}).databases.forEach(d => {
      if (['admin','local','config'].includes(d.name)) return;
      db.getSiblingDB(d.name).getCollectionNames().forEach(c => {
        const r = db.getSiblingDB(d.name).getCollection(c).validate({full:true});
        if (!r.valid) { print('INVALID: ' + d.name + '.' + c); errors++; }
      });
    });
    if (errors > 0) { quit(1); }
    print('All collections valid');
  " || { EXIT_CODE=1; echo "ERROR: Validation failed"; }
fi

# Report result
if [ $EXIT_CODE -eq 0 ]; then
  echo "Backup test PASSED: $LATEST"
  [ -n "$ONEUPTIME_HEARTBEAT_URL" ] && \
    curl -s "$ONEUPTIME_HEARTBEAT_URL" > /dev/null
else
  echo "Backup test FAILED: $LATEST"
fi

exit $EXIT_CODE
```

## Scheduling Backup Tests

Run backup tests independently of the backup schedule to catch issues sooner:

```bash
# /etc/cron.d/mongodb-backup-test
# Test backup every 6 hours (offset from backup schedule)
0 */6 * * * mongodb \
  ONEUPTIME_HEARTBEAT_URL="https://oneuptime.com/heartbeat/your-id" \
  /usr/local/bin/test-mongodb-backup.sh >> /var/log/mongodb-backup-test.log 2>&1
```

## Tracking Test Results Over Time

Store test results for trend analysis:

```python
from datetime import datetime, timezone, timedelta
import pymongo

def record_backup_test_result(backup_name, passed, duration_sec, error_msg=None):
    client = pymongo.MongoClient("mongodb://admin:pass@localhost:27017")
    db = client["ops"]
    db["backup_tests"].insert_one({
        "backup_name": backup_name,
        "tested_at": datetime.now(timezone.utc),
        "passed": passed,
        "duration_seconds": duration_sec,
        "error": error_msg
    })

# Query recent test results
def check_recent_failures():
    client = pymongo.MongoClient("mongodb://admin:pass@localhost:27017")
    db = client["ops"]
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    failures = list(db["backup_tests"].find(
        {"tested_at": {"$gte": cutoff}, "passed": False},
        {"backup_name": 1, "tested_at": 1, "error": 1}
    ))
    return failures
```

## Summary

Automated MongoDB backup testing turns backup validation from a one-off task into a continuous process. The test script downloads the latest backup, validates file integrity, restores to an isolated instance, validates collection consistency, and reports results to monitoring. Schedule tests every few hours and use OneUptime heartbeat monitors so that a failed or missing test triggers an immediate alert - before a real recovery situation exposes the gap.
