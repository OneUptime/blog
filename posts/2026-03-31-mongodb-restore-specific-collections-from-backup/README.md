# How to Restore Specific Collections from a MongoDB Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Recovery

Description: Learn how to restore only specific collections from a MongoDB backup using mongorestore with --nsInclude to recover targeted data without a full restore.

---

When you only need to recover a few collections from a large backup, restoring the entire database is wasteful and slow. `mongorestore` provides flags to restore specific collections, saving time and avoiding overwriting data you do not need to restore.

## Restoring a Single Collection from a Directory Backup

If your backup was created with `mongodump --out /backup/myapp-dump/`, point `mongorestore` directly at the `.bson` file:

```bash
mongorestore \
  --db myapp \
  --collection orders \
  /backup/myapp-dump/myapp/orders.bson
```

This restores only the `orders` collection into the `myapp` database.

## Using --nsInclude to Filter Collections

The `--nsInclude` flag accepts a namespace pattern (database.collection) and is the recommended way to restore specific collections from a full backup:

```bash
mongorestore \
  --nsInclude 'myapp.orders' \
  /backup/myapp-dump/
```

Restore multiple specific collections:

```bash
mongorestore \
  --nsInclude 'myapp.orders' \
  --nsInclude 'myapp.users' \
  /backup/myapp-dump/
```

Use a wildcard to restore all collections in a database from a full-cluster backup:

```bash
mongorestore \
  --nsInclude 'myapp.*' \
  /backup/full-cluster-dump/
```

## Using --nsExclude to Skip Collections

Alternatively, restore everything except specific collections:

```bash
mongorestore \
  --nsExclude 'myapp.sessions' \
  --nsExclude 'myapp.audit_logs' \
  /backup/myapp-dump/
```

## Restoring with --drop to Replace Existing Data

Add `--drop` to remove the existing collection before restoring, ensuring a clean state:

```bash
mongorestore \
  --nsInclude 'myapp.orders' \
  --drop \
  /backup/myapp-dump/
```

Without `--drop`, `mongorestore` inserts documents from the backup and skips any document whose `_id` already exists in the target collection.

## Restoring Specific Collections from an Archive

When the backup is a single archive file:

```bash
# Restore only orders from an archive
mongorestore \
  --archive=/backup/myapp-2026-03-31.archive.gz \
  --gzip \
  --nsInclude 'myapp.orders'
```

## Restoring to a Different Collection Name

Use `--nsFrom` and `--nsTo` to restore a collection under a new name:

```bash
mongorestore \
  --nsInclude 'myapp.orders' \
  --nsFrom 'myapp.orders' \
  --nsTo 'myapp.orders_restored' \
  /backup/myapp-dump/
```

This preserves the original collection while restoring the backup alongside it for comparison.

## Verifying the Restore

After restoring, check document counts and a sample document:

```javascript
use myapp

// Check count
db.orders.countDocuments()

// Check a sample document
db.orders.findOne()

// Verify indexes were restored
db.orders.getIndexes()
```

## Handling Large Collections

For large collections, add `--numParallelCollections` to speed up the restore:

```bash
mongorestore \
  --nsInclude 'myapp.*' \
  --numParallelCollections 4 \
  /backup/myapp-dump/
```

## Common Use Cases

- **Accidental collection drop**: Restore only the dropped collection without touching other data.
- **Data corruption in one collection**: Restore just the affected collection from last night's backup.
- **Test data refresh**: Restore a specific collection from production to a staging database.

```bash
# Restore production orders to staging
mongorestore \
  --nsInclude 'production.orders' \
  --nsFrom 'production.orders' \
  --nsTo 'staging.orders' \
  --drop \
  /backup/production-dump/
```

## Summary

Use `--nsInclude` with `mongorestore` to restore one or more specific collections by namespace pattern, and `--nsExclude` to skip unwanted collections. Point directly at a `.bson` file for single-collection restores from directory-style backups. Combine with `--drop` for a clean replacement and `--nsFrom`/`--nsTo` to restore under a different name.
