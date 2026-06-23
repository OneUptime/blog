# Validation Summary: How to Fix 'assertion failed' Errors in MongoDB

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MongoDB Server
- WiredTiger storage engine
- mongosh
- MongoDB Database Tools
- Linux system administration commands
- MongoDB replica sets

## Sources Consulted
- MongoDB Manual: Recover a Self-Managed Standalone after Unexpected Shutdown - https://www.mongodb.com/docs/manual/tutorial/recover-data-following-unexpected-shutdown/
- MongoDB Manual: mongod reference - https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB Manual: db.collection.reIndex() - https://www.mongodb.com/docs/manual/reference/method/db.collection.reindex/
- MongoDB Manual: db.collection.validate() - https://www.mongodb.com/docs/manual/reference/method/db.collection.validate/
- MongoDB Manual: Journaling - https://www.mongodb.com/docs/manual/core/journaling/
- MongoDB Manual: Configuration File Options - https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual: Resync a Member of a Self-Managed Replica Set - https://www.mongodb.com/docs/manual/tutorial/resync-replica-set-member/
- MongoDB Manual: dbStats command and db.stats() method - https://www.mongodb.com/docs/manual/reference/command/dbstats/ and https://www.mongodb.com/docs/manual/reference/method/db.stats/
- MongoDB Database Tools: mongodump and mongorestore - https://www.mongodb.com/docs/database-tools/mongodump/ and https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Manual: Write Concern - https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Manual: Server Parameters - https://www.mongodb.com/docs/manual/reference/parameters/

## Issues Found
- The post used `mongod --validate`, but current MongoDB server documentation does not define a `--validate` option for `mongod`. I replaced it with a `mongosh` collection validation example using `db.collection.validate({full: true})`.
- The post advised manually removing journal and lock files during WiredTiger recovery. MongoDB documentation says journaling normally supports automatic recovery, `--repair` should be used only when needed, and `mongod.lock` should generally not be removed manually. I changed that recovery procedure to preserve the journal and run `mongod --repair` after backing up the data directory.
- The journaling configuration showed `storage.journal.enabled: true`. MongoDB 6.1 and later always enable journaling and removed that option. I changed the example to explain the version caveat and keep only the supported `commitIntervalMs` setting.
- The disk monitoring example referenced `fsFreeSize`, which is not a documented `dbStats` field. I changed it to compute free space from `fsTotalSize - fsUsedSize`.
- The index rebuild example passed the entire `getIndexes()` document as `createIndex()` options, including fields that are not index options. I updated it to remove `key` and `v` before recreating each non-`_id` index.

## Review Notes
The repaired post is technically valid as a general self-managed MongoDB troubleshooting guide. Future improvements could add stronger version scoping because recovery details differ between standalone deployments, replica sets, Atlas, and older MongoDB versions.
