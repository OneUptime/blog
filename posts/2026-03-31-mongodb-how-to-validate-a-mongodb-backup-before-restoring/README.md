# How to Validate a MongoDB Backup Before Restoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Validation, Database Administration

Description: Learn how to validate MongoDB backups created with mongodump or filesystem snapshots before using them for restoration, including integrity checks and test restores.

---

## Overview

A backup that cannot be restored is worthless. Many teams discover their backups are corrupt or incomplete only when they need them most. Validating MongoDB backups as part of a regular process ensures your recovery procedures work when needed. Validation includes checking file integrity, testing restoration, and verifying data completeness.

## Validating a mongodump Backup

### Check Backup Directory Structure

A valid mongodump backup should have BSON and metadata files for each collection:

```bash
# List the backup contents
ls -la /backup/mongodb-20260331/mydb/

# Expected output:
# orders.bson
# orders.metadata.json
# users.bson
# users.metadata.json
# products.bson
# products.metadata.json

# Check that BSON files are non-empty
find /backup/mongodb-20260331 -name "*.bson" -empty
# Should return nothing - empty BSON files indicate problems
```

### Verify BSON File Integrity with bsondump

`bsondump` converts BSON to human-readable JSON. If it errors, the BSON is corrupt:

```bash
# Check a single collection - a non-zero exit code means the BSON is corrupt
bsondump /backup/mongodb-20260331/mydb/orders.bson > /dev/null
echo $?  # 0 = valid, non-zero = corrupt or unreadable

# Check all collections
for bson_file in $(find /backup/mongodb-20260331 -name "*.bson"); do
  if bsondump "${bson_file}" > /dev/null 2>&1; then
    echo "OK: ${bson_file}"
  else
    echo "ERROR: ${bson_file} may be corrupt"
  fi
done
```

### Test a Partial Restore

Restore to a temporary mongod instance to verify data is accessible:

```bash
# Start a temporary mongod on a different port (no auth for testing)
mongod --dbpath /tmp/test-restore   --port 27099   --fork   --logpath /tmp/test-restore.log

# Restore the backup to the test instance
mongorestore --port 27099   --drop   /backup/mongodb-20260331/

# Verify document counts
mongosh --port 27099 --eval '
  db = db.getSiblingDB("mydb");
  let collections = db.getCollectionNames();
  collections.forEach(function(coll) {
    print(coll + ": " + db[coll].countDocuments() + " documents");
  });
'

# Shut down test instance
mongosh --port 27099 --eval 'db.adminCommand({ shutdown: 1 })'
```

### Compare Document Counts with Production

```bash
# Count documents in backup
BACKUP_COUNT=$(mongorestore --port 27099 --nsInclude="mydb.orders"   --dryRun /backup/mongodb-20260331/ 2>&1 | grep "would restore" | awk '{print $3}')

# Count documents in production
PROD_COUNT=$(mongosh --uri "mongodb://admin:secret@localhost:27017"   --eval 'db.getSiblingDB("mydb").orders.countDocuments()'   --quiet)

echo "Backup count: ${BACKUP_COUNT}"
echo "Production count: ${PROD_COUNT}"
```

## Validating a Collection After Restoration

Use MongoDB's built-in validate command to check structural integrity:

```javascript
// Validate a single collection
db.orders.validate({ full: true })

// Check the result
let result = db.orders.validate({ full: true });
if (result.valid) {
  print("Collection is valid");
} else {
  print("Validation errors:");
  printjson(result.errors);
  printjson(result.warnings);
}

// Validate all collections in a database
db.getCollectionNames().forEach(function(name) {
  let r = db[name].validate({ full: true });
  print(name + ": " + (r.valid ? "VALID" : "INVALID - " + r.errors.join(", ")));
});
```

## Validating Index Integrity

After restoration, verify indexes are present and valid:

```javascript
// Check all indexes exist
db.orders.getIndexes()

// Rebuild indexes if validation shows issues (drop and recreate)
// Note: db.collection.reIndex() is deprecated since MongoDB 6.0
let indexes = db.orders.getIndexes();
indexes.forEach(function(idx) {
  if (idx.name !== "_id_") {
    db.orders.dropIndex(idx.name);
    db.orders.createIndex(idx.key, { name: idx.name });
  }
});

// Verify index stats
db.orders.aggregate([{ $indexStats: {} }])
```

## Automated Backup Validation Script

```bash
#!/bin/bash
# validate-backup.sh

BACKUP_PATH="/backup/mongodb-20260331"
TEST_PORT=27099
TEST_DBPATH="/tmp/mongodb-validate-$$"
ERRORS=0

cleanup() {
  mongosh --port ${TEST_PORT} --eval 'db.adminCommand({ shutdown: 1 })' 2>/dev/null
  rm -rf "${TEST_DBPATH}"
}
trap cleanup EXIT

# Step 1: Check file integrity
echo "Checking BSON file integrity..."
for bson_file in $(find "${BACKUP_PATH}" -name "*.bson"); do
  count=$(bsondump "${bson_file}" 2>/dev/null | wc -l)
  if [ $count -eq 0 ]; then
    echo "ERROR: Empty or corrupt: ${bson_file}"
    ERRORS=$((ERRORS + 1))
  fi
done

# Step 2: Test restore
mkdir -p "${TEST_DBPATH}"
mongod --dbpath "${TEST_DBPATH}" --port ${TEST_PORT} --fork   --logpath /tmp/validate-mongod.log

sleep 3

mongorestore --port ${TEST_PORT} --drop "${BACKUP_PATH}"

if [ $? -ne 0 ]; then
  echo "ERROR: mongorestore failed"
  ERRORS=$((ERRORS + 1))
fi

# Step 3: Validate collections
mongosh --port ${TEST_PORT} --quiet --eval '
  let dbs = db.adminCommand({ listDatabases: 1 }).databases;
  dbs.forEach(function(d) {
    if (["admin","local","config"].includes(d.name)) return;
    let testDb = db.getSiblingDB(d.name);
    testDb.getCollectionNames().forEach(function(coll) {
      let result = testDb[coll].validate();
      if (!result.valid) {
        print("INVALID:", d.name + "." + coll);
      } else {
        print("VALID:", d.name + "." + coll, "-", testDb[coll].countDocuments(), "docs");
      }
    });
  });
'

if [ $ERRORS -gt 0 ]; then
  echo "BACKUP VALIDATION FAILED with ${ERRORS} errors"
  exit 1
else
  echo "BACKUP VALIDATION PASSED"
  exit 0
fi
```

## Summary

Validating MongoDB backups involves multiple layers: checking BSON file integrity with `bsondump`, performing test restores to a temporary mongod instance, verifying document counts against production, and running MongoDB's built-in `validate` command on restored collections. Automating this validation process and running it against every backup ensures you discover any backup problems well before an actual disaster recovery scenario.
