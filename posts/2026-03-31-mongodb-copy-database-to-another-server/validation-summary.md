# Validation Summary: How to Copy a MongoDB Database to Another Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongodump, mongorestore, mongoexport, mongoimport)
- MongoDB Shell (fsyncLock, fsyncUnlock, createUser, countDocuments, db.stats)
- LVM (Logical Volume Manager) snapshots
- rsync for file transfer
- Linux system administration (systemctl, chown)

## Sources Consulted
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB mongoexport documentation: https://www.mongodb.com/docs/database-tools/mongoexport/
- MongoDB mongoimport documentation: https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB db.fsyncLock() documentation: https://www.mongodb.com/docs/manual/reference/method/db.fsyncLock/
- MongoDB db.fsyncUnlock() documentation: https://www.mongodb.com/docs/manual/reference/method/db.fsyncUnlock/
- MongoDB db.createUser() documentation: https://www.mongodb.com/docs/manual/reference/method/db.createUser/

## Issues Found
No technical issues found.

## Review Notes
- The `--db` flag for mongodump/mongorestore is deprecated in newer versions of MongoDB Database Tools (4.x+) in favor of using `--uri` with a connection string. The flag still works but may be removed in future versions. This is acceptable for a tutorial as it is more readable.
- Passing passwords via `--password` on the command line is a security concern (visible in process lists and shell history). In production, omitting the value to get an interactive prompt or using `--config` is preferred. This is standard tutorial practice and acceptable here.
- The mongoexport/mongoimport method correctly notes that indexes are not preserved. It also does not preserve other collection-level metadata like validators or collation settings, which could be mentioned but is not an error.
- The filesystem snapshot method correctly locks writes before snapshotting and unlocks after, which is the proper procedure for crash-consistent copies.
