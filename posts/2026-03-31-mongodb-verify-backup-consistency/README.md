# How to Verify Backup Consistency for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Testing, Recovery, Database

Description: Learn how to verify MongoDB backup consistency by validating checksums, performing test restores, and using validate commands to confirm data integrity.

---

## Why Backup Verification Is Critical

A backup that cannot be restored is worse than no backup - it gives false confidence. Backup files can become corrupt during creation (disk errors, process interruption), during transfer (network issues, partial uploads), or during long-term storage. MongoDB backup verification catches these problems before they become an emergency.

The only way to know a backup is valid is to restore it and check the data.

## Step 1: Verify the Backup File Integrity

Before restoring, check that the archive file is not corrupt:

```bash
# For gzip archives - verify decompression works
gzip -t /backups/mongodb-20240115.archive.gz
echo "Exit code: $?"  # 0 = valid, non-zero = corrupt

# Verify the archive with mongorestore's dry run mode
mongorestore \
  --uri "mongodb://user:pass@localhost:27018" \
  --gzip \
  --archive=/backups/mongodb-20240115.archive.gz \
  --dryRun \
  --verbose
```

The `--dryRun` flag reads and validates the archive without writing any data to the target database.

## Step 2: Restore to an Isolated Test Instance

Always restore backups to a separate, isolated MongoDB instance:

```bash
# Start a test mongod on a different port
mongod \
  --dbpath /tmp/backup-verify \
  --port 27018 \
  --logpath /tmp/backup-verify.log \
  --fork \
  --bind_ip 127.0.0.1

# Restore backup to test instance
mongorestore \
  --uri "mongodb://localhost:27018" \
  --gzip \
  --archive=/backups/mongodb-20240115.archive.gz \
  --drop

echo "Restore exit code: $?"
```

## Step 3: Run validate() on Collections

MongoDB's `validate()` command checks the internal consistency of each collection - verifying that indexes match documents and that BSON structures are valid:

```javascript
// Connect to test instance
// mongosh mongodb://localhost:27018

const dbs = db.adminCommand({listDatabases:1}).databases;
let errors = 0;

dbs.forEach(database => {
  if (['admin','local','config'].includes(database.name)) return;
  const testDb = db.getSiblingDB(database.name);
  testDb.getCollectionNames().forEach(collName => {
    const result = testDb.getCollection(collName).validate({full: true});
    if (!result.valid) {
      print(`INVALID: ${database.name}.${collName}`);
      print(JSON.stringify(result.errors));
      errors++;
    } else {
      print(`OK: ${database.name}.${collName} (${testDb.getCollection(collName).estimatedDocumentCount()} docs)`);
    }
  });
});

print(`Validation complete. Errors: ${errors}`);
```

## Step 4: Compare Document Counts

Cross-check document counts between the backup and source:

```bash
# On source MongoDB
mongosh "mongodb://user:pass@source:27017" --eval "
  db.adminCommand({listDatabases:1}).databases.forEach(d => {
    if (['admin','local','config'].includes(d.name)) return;
    const counts = {};
    db.getSiblingDB(d.name).getCollectionNames().forEach(c => {
      counts[c] = db.getSiblingDB(d.name).getCollection(c).countDocuments();
    });
    print(JSON.stringify({db: d.name, counts}));
  });
" > /tmp/source-counts.json

# On restored test instance
mongosh "mongodb://localhost:27018" --eval "
  db.adminCommand({listDatabases:1}).databases.forEach(d => {
    if (['admin','local','config'].includes(d.name)) return;
    const counts = {};
    db.getSiblingDB(d.name).getCollectionNames().forEach(c => {
      counts[c] = db.getSiblingDB(d.name).getCollection(c).countDocuments();
    });
    print(JSON.stringify({db: d.name, counts}));
  });
" > /tmp/backup-counts.json

diff /tmp/source-counts.json /tmp/backup-counts.json
```

## Step 5: Automate Verification in a Pipeline

```bash
#!/bin/bash
# verify-backup.sh - run after each backup job

BACKUP_FILE="$1"
TEST_PORT=27018
TEST_DBPATH="/tmp/verify-$(date +%s)"
EXIT_CODE=0

mkdir -p "$TEST_DBPATH"

# Start test instance
mongod --dbpath "$TEST_DBPATH" --port "$TEST_PORT" \
  --logpath "$TEST_DBPATH/mongod.log" --fork --bind_ip 127.0.0.1

# Restore
mongorestore --uri "mongodb://localhost:$TEST_PORT" \
  --gzip --archive="$BACKUP_FILE" --drop || EXIT_CODE=1

# Validate
if [ $EXIT_CODE -eq 0 ]; then
  mongosh "mongodb://localhost:$TEST_PORT" --file /usr/local/bin/validate-collections.js \
    || EXIT_CODE=1
fi

# Cleanup
mongosh "mongodb://localhost:$TEST_PORT" --eval "db.adminCommand({shutdown:1})" 2>/dev/null || true
rm -rf "$TEST_DBPATH"

exit $EXIT_CODE
```

## Summary

MongoDB backup verification requires more than checking that a file exists. Verify archive integrity with `gzip -t`, restore to an isolated test instance, run `validate({full:true})` on all collections, and compare document counts against the source. Automate this process after every backup job so you get immediate notice of any corruption, long before a real recovery scenario.
