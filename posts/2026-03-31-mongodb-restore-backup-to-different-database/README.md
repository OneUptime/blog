# How to Restore a MongoDB Backup to a Different Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Migration

Description: Learn how to use mongorestore with --nsFrom and --nsTo flags to restore a MongoDB backup to a different database name on the same or another server.

---

By default, `mongorestore` restores data back to the original database name. However, you can restore to a different database name using namespace mapping flags. This is useful for creating test environments, staging data, or renaming databases during migration.

## Restoring to a Different Database Name

Use `--nsFrom` and `--nsTo` to map namespaces during restore:

```bash
mongorestore \
  --nsFrom 'production.*' \
  --nsTo 'staging.*' \
  /backup/mongodump-2026-03-31/
```

This restores all collections from the `production` database backup into a new database named `staging`.

## Restoring a Single Collection to a Different Database

```bash
mongorestore \
  --nsFrom 'production.orders' \
  --nsTo 'staging.orders' \
  /backup/mongodump-2026-03-31/production/orders.bson
```

## Restoring from an Archive to a Different Database

When the backup is an archive file:

```bash
mongorestore \
  --archive=/backup/production-2026-03-31.archive.gz \
  --gzip \
  --nsFrom 'production.*' \
  --nsTo 'staging.*'
```

## Restoring with the --db Flag (Single Database Backups)

If the backup was created for a single database, you can use `--db` to specify a new target name:

```bash
# Backup was taken from database 'production'
mongodump --db production --out /backup/prod-backup/

# Restore to 'staging' database
mongorestore \
  --db staging \
  /backup/prod-backup/production/
```

Note: `--db` is deprecated as of MongoDB Database Tools 4.2 when restoring from a directory. For newer versions, prefer `--nsFrom` and `--nsTo` for namespace remapping. The `--db` flag still works but only applies when restoring from a single-database backup directory.

## Dropping the Target Database First

If the target database already exists and you want a clean restore:

```bash
mongorestore \
  --nsFrom 'production.*' \
  --nsTo 'staging.*' \
  --drop \
  /backup/mongodump-2026-03-31/
```

The `--drop` flag drops each collection before restoring it.

## Renaming Only Specific Collections

Restore a subset of collections to a different database using `--nsInclude`:

```bash
mongorestore \
  --nsFrom 'production.*' \
  --nsTo 'staging.*' \
  --nsInclude 'production.orders' \
  --nsInclude 'production.users' \
  /backup/mongodump-2026-03-31/
```

## Verifying the Restore

After restoring, confirm the new database exists and has the expected collections:

```javascript
use staging
show collections
db.orders.countDocuments()
db.users.countDocuments()
```

Compare counts with the original:

```javascript
use production
db.orders.countDocuments()
```

## Restoring to a Different Server

Combine namespace remapping with remote host targeting:

```bash
mongorestore \
  --host staging-server:27017 \
  --username admin \
  --password secret \
  --authenticationDatabase admin \
  --nsFrom 'production.*' \
  --nsTo 'staging.*' \
  /backup/mongodump-2026-03-31/
```

## Summary

Use `mongorestore` with `--nsFrom` and `--nsTo` to restore a MongoDB backup into a different database name. Combine with `--drop` for a clean restore, `--nsInclude` to restore only specific collections, and specify `--host` to restore to a different server. Always verify document counts after restoring.
