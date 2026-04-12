# Validation Summary: How to Migrate MongoDB Data Between Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongodump, mongorestore, replica sets, mongosh)
- rsync (file transfer)
- systemctl (service management)

## Sources Consulted
- MongoDB Database Tools documentation for mongodump: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Database Tools documentation for mongorestore: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB mongosh reference for rs.add(), rs.remove(), rs.stepDown(), rs.status(): https://www.mongodb.com/docs/manual/reference/method/
- MongoDB manual on replica set membership: https://www.mongodb.com/docs/manual/tutorial/expand-replica-set/
- MongoDB manual for listDatabases command: https://www.mongodb.com/docs/manual/reference/command/listDatabases/
- MongoDB mongosh reference for db.getMongo(), getDB(), getCollectionNames(), countDocuments(): https://www.mongodb.com/docs/manual/reference/method/

## Issues Found
1. **Verification script: variable shadowing bug** (lines 105-109). The `forEach` callback used `db` as its parameter name, which shadows the global `db` object in the mongosh shell. The items returned by `listDatabases` are plain objects with properties like `name`, `sizeOnDisk`, and `empty` — they do not have a `getMongo()` method. Calling `db.getMongo()` inside the callback would attempt to invoke `getMongo()` on the plain database-info object, resulting in a `TypeError`. **Fix:** Renamed the callback parameter from `db` to `dbInfo`, stored `db.getMongo().getDB(dbInfo.name)` in a `database` variable, and used that variable for `getCollectionNames()` and collection access. This preserves access to the global `db` object and eliminates the redundant `getMongo().getDB()` call.

## Review Notes
- The mongodump/mongorestore flags (`--host`, `--username`, `--password`, `--authenticationDatabase`, `--gzip`, `--drop`, `--out`) are all correct and current for MongoDB Database Tools 100.x+.
- The replica set methods (`rs.add()`, `rs.status()`, `rs.stepDown()`, `rs.remove()`) use correct syntax.
- The rsync data files method correctly notes the requirement to stop MongoDB before copying data files. The data directory `/var/lib/mongodb/` is the default on Debian/Ubuntu; RHEL/CentOS uses `/var/lib/mongo/` by default, but this is acceptable as an example.
- The rsync method implicitly assumes the destination server does not already have a running mongod instance before the copy. This is a reasonable assumption for a new server setup but could be noted in a future update.
- `countDocuments()` is used correctly (the modern, non-deprecated alternative to the legacy `count()` method).
