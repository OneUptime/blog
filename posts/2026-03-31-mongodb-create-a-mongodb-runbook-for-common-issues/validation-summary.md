# Validation Summary: How to Create a MongoDB Runbook for Common Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (mongosh, mongodump)
- MongoDB replica sets
- MongoDB profiler
- MongoDB compact command

## Sources Consulted
- MongoDB `hello` command documentation: https://www.mongodb.com/docs/manual/reference/command/hello/
- MongoDB `rs.isMaster()` deprecation notice (deprecated in 5.0): https://www.mongodb.com/docs/manual/reference/method/rs.isMaster/
- MongoDB `resync` command removal (removed in 4.0): https://www.mongodb.com/docs/manual/reference/command/resync/
- MongoDB `compact` command documentation: https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB initial sync documentation: https://www.mongodb.com/docs/manual/core/replica-set-sync/#initial-sync

## Issues Found
1. **`rs.isMaster()` is deprecated** — Replaced `rs.isMaster()` with `db.hello()`. The `isMaster` command was deprecated in MongoDB 5.0 in favor of the `hello` command.
2. **`resync` command removed** — The `db.adminCommand({ resync: 1 })` command was removed in MongoDB 4.0. Replaced with instructions to perform an initial sync by stopping the secondary, deleting its data directory, and restarting the process.
3. **`compact` blocking comment was misleading** — Since MongoDB 4.4 with WiredTiger, the `compact` command no longer blocks reads and writes. Removed the incorrect "blocks writes, schedule during maintenance" comment.
4. **`mongodump` missing `--db` flag** — The `mongodump` command with `--collection` requires a `--db` flag to specify the database. Added `--db=mydb` to make the command correct.

## Review Notes
- The `killOp` example uses `<opid>` as a placeholder, which is fine for a runbook template but the reader should know to replace it with an actual operation ID from `db.currentOp()`.
- The `maxIncomingConnections` config snippet is shown inside a bash code block but is actually YAML config content — this is a minor formatting issue but does not affect correctness.
- The `db.stats(1024*1024)` shorthand syntax works but the documented form is `db.stats({ scale: 1048576 })`; both are accepted so no change was made.
