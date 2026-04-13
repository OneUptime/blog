# Validation Summary: How to Use db.adminCommand for Administrative Operations in MongoDB

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MongoDB (shell commands, administrative operations)
- mongosh (MongoDB Shell)
- MongoDB Replica Sets
- MongoDB Sharding

## Sources Consulted
- MongoDB Official Docs: db.adminCommand() - https://www.mongodb.com/docs/manual/reference/method/db.adminCommand/
- MongoDB Official Docs: reIndex command - https://www.mongodb.com/docs/manual/reference/command/reindex/
- MongoDB Official Docs: validate command - https://www.mongodb.com/docs/manual/reference/command/validate/
- MongoDB Official Docs: compact command - https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB Official Docs: getLog command - https://www.mongodb.com/docs/manual/reference/command/getLog/
- MongoDB Official Docs: enableSharding command - https://www.mongodb.com/docs/manual/reference/command/enableSharding/
- MongoDB Jira SERVER-28380 (clearLog as test-only command) - https://jira.mongodb.org/browse/SERVER-28380

## Issues Found

1. **Removed `clearLog: "global"` command (was line 103-104):** The `clearLog` command is a test-only internal command gated behind `enableTestCommands`. It is not available on standard MongoDB deployments and would fail for readers. Removed the two lines entirely.

2. **Changed `reIndex` from `db.adminCommand()` to `db.runCommand()` (line 111):** The `reIndex` command operates on a collection in the current database. Using `db.adminCommand()` would attempt to reindex a collection in the `admin` database, which is not the intended target. Also added a deprecation note since `reIndex` has been deprecated since MongoDB 6.0.

3. **Changed `validate` from `db.adminCommand()` to `db.runCommand()` (lines 114, 117):** Same issue as `reIndex` — the `validate` command operates on a collection in the current database, not the admin database. Changed both occurrences.

4. **Fixed `compact` locking warning (line 162):** The comment stated "WARNING: locks the collection for the duration" which is inaccurate for MongoDB 4.4+ with the WiredTiger storage engine (default since 3.2). Since MongoDB 4.4, `compact` does not block reads or writes. Updated the comment to reflect current behavior.

5. **Added deprecation note for `enableSharding` (line 146):** Since MongoDB 6.0, `enableSharding` is no longer required before sharding a collection. Added a comment noting this change.

## Review Notes
- The `reIndex` command is deprecated since MongoDB 6.0 and only works on standalone instances since MongoDB 5.0. Authors may want to consider removing it or replacing it with a note about when manual reindexing is warranted.
- The `enableSharding` command was fully removed in MongoDB 8.0. The post may need updating if targeting MongoDB 8.0+.
- The `connPoolStats` command is described as "Check sharding cluster status" but it actually returns connection pool statistics. While technically valid and useful in a sharding context, readers looking for cluster status may want `listShards` or `sh.status()` instead.
- The `addShard` command's `name` parameter was deprecated in MongoDB 5.0+. The shard name is now derived from the replica set name.
