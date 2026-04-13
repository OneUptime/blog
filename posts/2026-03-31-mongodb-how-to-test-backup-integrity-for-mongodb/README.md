# How to Test Backup Integrity for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Testing, Database Administration

Description: Learn how to implement a regular backup integrity testing process for MongoDB, including automated restore tests, data validation, and runbook documentation.

---

## Overview

Backup integrity testing is the practice of regularly restoring backups to a test environment and verifying the data is complete and correct. It is the only way to truly know whether your backups will work when you need them. A backup that has never been tested is not a reliable backup.

## Why Test Backups Regularly

- Silent corruption can occur in backup storage
- mongodump output may be complete but data may be logically incorrect
- Schema changes may make old backups harder to restore
- Recovery procedures need to be practiced before an actual emergency

## Setting Up a Test Environment

Create a dedicated environment for backup testing, isolated from production:

```bash
# Create a test mongod instance
mkdir -p /tmp/backup-test/data
mongod --dbpath /tmp/backup-test/data   --port 27099   --fork   --logpath /tmp/backup-test/mongod.log   --noauth

# Verify it started
mongosh --port 27099 --eval 'db.serverStatus().ok'
```

## Test 1 - Restore and Verify Document Counts

```bash
#!/bin/bash
# test-backup-counts.sh

BACKUP_PATH="${1:-/backup/mongodb-$(date +%Y%m%d)}"
TEST_PORT=27099
MONGO_URI="mongodb://admin:secret@localhost:27017"
FAILURES=0

# Restore backup
mongorestore --port ${TEST_PORT} --drop "${BACKUP_PATH}"

if [ $? -ne 0 ]; then
  echo "FAIL: mongorestore failed"
  exit 1
fi

# Compare document counts
mongosh --port ${TEST_PORT} --quiet --eval '
  let prodUri = "mongodb://admin:secret@localhost:27017";
  let testDbs = db.adminCommand({ listDatabases: 1 }).databases;
  
  testDbs.forEach(function(d) {
    if (["admin","local","config"].includes(d.name)) return;
    let testDb = db.getSiblingDB(d.name);
    
    testDb.getCollectionNames().forEach(function(coll) {
      let testCount = testDb[coll].countDocuments();
      print("TEST", d.name + "." + coll + ":", testCount, "documents");
    });
  });
'
```

## Test 2 - Collection Validation

```javascript
// validate-collections.js
// Run with: mongosh --port 27099 validate-collections.js

let failures = [];

db.adminCommand({ listDatabases: 1 }).databases.forEach(function(dbInfo) {
  if (["admin", "local", "config"].includes(dbInfo.name)) return;
  
  let testDb = db.getSiblingDB(dbInfo.name);
  testDb.getCollectionNames().forEach(function(collName) {
    let result = testDb[collName].validate({ full: true });
    
    if (!result.valid) {
      failures.push(dbInfo.name + "." + collName);
      print("FAIL:", dbInfo.name + "." + collName);
      printjson(result.errors);
    } else {
      print("PASS:", dbInfo.name + "." + collName, 
            "(" + testDb[collName].countDocuments() + " docs)");
    }
  });
});

if (failures.length > 0) {
  print("\nFAILED COLLECTIONS:", failures.join(", "));
  quit(1);
} else {
  print("\nAll collections valid");
  quit(0);
}
```

## Test 3 - Schema and Data Quality Checks

```javascript
// schema-checks.js
// Custom checks for your application's data

use mydb;

// Check required fields are present
let ordersWithoutCustomerId = db.orders.countDocuments({ customerId: { $exists: false } });
if (ordersWithoutCustomerId > 0) {
  print("FAIL: " + ordersWithoutCustomerId + " orders missing customerId");
} else {
  print("PASS: All orders have customerId");
}

// Check data ranges are sensible
let negativeTotal = db.orders.countDocuments({ total: { $lt: 0 } });
if (negativeTotal > 0) {
  print("WARN: " + negativeTotal + " orders have negative total");
}

// Check referential integrity (orders should have valid userIds)
let orderUserIds = db.orders.distinct("userId");
let validUserCount = db.users.countDocuments({ _id: { $in: orderUserIds } });
print("Order user coverage:", validUserCount + "/" + orderUserIds.length, "users found");

// Check date fields are in expected range
let futureOrders = db.orders.countDocuments({
  createdAt: { $gt: new Date() }
});
if (futureOrders > 0) {
  print("WARN: " + futureOrders + " orders have future createdAt dates");
}
```

## Test 4 - Index Verification

```javascript
// verify-indexes.js
use mydb;

// Expected indexes for orders collection
let expectedIndexes = [
  { key: { _id: 1 } },
  { key: { customerId: 1 } },
  { key: { status: 1, createdAt: -1 } },
  { key: { orderId: 1 }, unique: true }
];

let actualIndexes = db.orders.getIndexes();
print("Found", actualIndexes.length, "indexes on orders");

expectedIndexes.forEach(function(expected) {
  let found = actualIndexes.find(function(idx) {
    return JSON.stringify(idx.key) === JSON.stringify(expected.key);
  });
  
  if (found) {
    print("PASS: Index on", JSON.stringify(expected.key), "exists");
  } else {
    print("FAIL: Missing index on", JSON.stringify(expected.key));
  }
});
```

## Automating Weekly Backup Tests

```bash
#!/bin/bash
# weekly-backup-test.sh

BACKUP_PATH="/backup/mongodb-$(date +%Y%m%d -d 'yesterday')"
TEST_PORT=27099
REPORT_FILE="/var/log/backup-test-$(date +%Y%m%d).log"
ALERT_EMAIL="dba@example.com"

{
  echo "=== MongoDB Backup Test ==="
  echo "Date: $(date)"
  echo "Backup: ${BACKUP_PATH}"
  echo ""

  # Start test instance
  mkdir -p /tmp/backup-test
  mongod --dbpath /tmp/backup-test --port ${TEST_PORT}     --fork --logpath /tmp/backup-test.log --noauth

  sleep 3

  # Restore
  mongorestore --port ${TEST_PORT} --drop "${BACKUP_PATH}"
  RESTORE_STATUS=$?

  if [ ${RESTORE_STATUS} -ne 0 ]; then
    echo "CRITICAL: Restore failed!"
  else
    echo "Restore: SUCCESS"

    # Run validation
    mongosh --port ${TEST_PORT} --quiet validate-collections.js
    VALIDATE_STATUS=$?

    if [ ${VALIDATE_STATUS} -ne 0 ]; then
      echo "CRITICAL: Validation failed!"
    else
      echo "Validation: PASS"
    fi
  fi

  # Cleanup
  mongosh --port ${TEST_PORT} --eval 'db.adminCommand({ shutdown: 1 })' 2>/dev/null
  rm -rf /tmp/backup-test

} 2>&1 | tee "${REPORT_FILE}"

# Send alert if tests failed
if grep -q "CRITICAL" "${REPORT_FILE}"; then
  mail -s "MongoDB Backup Test FAILED" "${ALERT_EMAIL}" < "${REPORT_FILE}"
fi
```

## Summary

Testing MongoDB backup integrity requires restoring to an isolated environment and running multiple validation checks: document count comparisons, MongoDB's built-in collection validation, application-specific data quality checks, and index verification. Automating these tests weekly and alerting on failures gives you continuous confidence in your recovery capabilities. The real value of testing is discovering backup problems before an actual incident forces you to rely on them.
