# Validation Summary: How to Detect and Fix Data Corruption in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- mongosh (MongoDB Shell)
- mongod (MongoDB server)
- mongorestore (MongoDB Database Tools)
- dbCheck (replica set consistency checker)

## Sources Consulted
- MongoDB `validate` command documentation: https://www.mongodb.com/docs/manual/reference/command/validate/
- MongoDB `db.collection.validate()` method documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.validate/
- MongoDB `dbCheck` command — verified via MongoDB server source code (src/mongo/db/repl/dbcheck/dbcheck.idl)
- MongoDB health log namespace — verified via server source (src/mongo/db/namespace_string.h), collection is `local.system.healthlog`
- MongoDB `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Tools JIRA TOOLS-642: `--filter` removed from mongorestore in 3.0
- MongoDB Tools JIRA TOOLS-2151: `--uri` incompatibility with `--db`

## Issues Found

1. **Incorrect health log collection name (line 63)**: The post queried `db.getSiblingDB("local").healthlog`, but the actual dbCheck health log collection is `local.system.healthlog`. Fixed to `db.getSiblingDB("local").system.healthlog`.

2. **Non-existent `--query` flag on `mongorestore` (lines 113-118)**: The post used `mongorestore --query` to selectively restore specific documents. The `--query` flag is a `mongodump` option, not a `mongorestore` option (the similar `--filter` flag was removed from `mongorestore` in MongoDB Tools 3.0). Fixed by replacing with a two-step approach: restore to a temporary namespace, then copy the needed documents back using `replaceOne` with `upsert`.

3. **Incompatible `--uri` with `--db`/`--collection` flags**: The original `mongorestore` command combined `--uri` with `--db` and `--collection`, which are incompatible in MongoDB 3.6+. Fixed by using `--host`/`--port` with `--db`/`--collection` instead.

## Review Notes
- The `storage.journal.enabled` config option shown in Step 6 is technically correct but has been ignored since MongoDB 4.0+ with WiredTiger, where journaling is always enabled and cannot be disabled. The post could note this in the future.
- The `minKey`/`maxKey` parameters for `dbCheck` are legacy; newer MongoDB versions also support `start`/`end` parameters, but the legacy syntax remains valid.
- The `--repair` flag for mongod is documented as a last resort and should not be run on replica set members. The post correctly notes the data loss risk but could emphasize this more strongly.
