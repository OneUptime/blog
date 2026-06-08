# Validation Summary: How to Configure MongoDB Query Profiling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (database profiler, `setProfilingLevel`, `getProfilingStatus`)
- MongoDB shell (`mongosh`)
- `mongod.conf` (YAML configuration)
- MongoDB aggregation framework (used for analyzing `system.profile`)
- systemd (for restarting `mongod`)

## Sources Consulted
- MongoDB Manual — Database Profiler: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual — `db.setProfilingLevel()`: https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/
- MongoDB Manual — `db.getProfilingStatus()`: https://www.mongodb.com/docs/manual/reference/method/db.getProfilingStatus/
- MongoDB Manual — `system.profile` collection: https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB Manual — Configuration File Options (`operationProfiling`, `storage`): https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB 7.0 Release Notes — removal of `storage.journal.enabled`: https://www.mongodb.com/docs/manual/release-notes/7.0/
- mongosh CLI Reference: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- Connection String URI Options (`directConnection`): https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found

1. **Outdated `storage.journal.enabled` option in `mongod.conf` snippet.** The `storage.journal.enabled` configuration option was removed in MongoDB 7.0 — including it now causes `mongod` to fail to start with an unrecognized-option error. Removed the `journal` subsection from the YAML example, leaving only `dbPath` under `storage`. Journaling is required and always enabled on WiredTiger in modern MongoDB versions, so the setting is no longer needed or valid.

2. **Use of the deprecated legacy `mongo` shell.** The Replica Set Considerations section showed `mongo --host primary.example.com:27017` in comments. The legacy `mongo` shell was deprecated in MongoDB 5.0 and removed in 6.0. Updated the example commands to use `mongosh`.

3. **Invalid `--directConnection` CLI flag.** The original example used `mongo --host secondary1.example.com:27017 --directConnection`, but `--directConnection` is not a CLI flag in either the legacy shell or `mongosh`; `directConnection` is a connection-string option. Updated the comment examples to use the proper connection-string form: `mongosh "mongodb://host:27017/?directConnection=true"`.

## Review Notes

- The `db.getProfilingStatus()` return shape including the `was` field (which confusingly reports the *current* level for `getProfilingStatus()` but the *previous* level when returned by `setProfilingLevel()`) is shown correctly.
- The profiler `op` values used in queries (`query`, `insert`, `update`, `remove`, `command`, `getmore`) match the documented set for `system.profile`. Note: `remove` is the profiler op for delete operations even though the user-facing command is `delete`; this is correctly explained in the post.
- The `system.profile` default capped-collection size of 1 MB is correct per MongoDB documentation.
- The drop/recreate procedure for resizing `system.profile` correctly sets profiling to level 0 first, drops the collection, recreates it as capped with `size` in bytes, then re-enables profiling — this matches the official recommended procedure.
- The `operationProfiling` YAML keys (`mode`, `slowOpThresholdMs`, `slowOpSampleRate`) are valid for MongoDB 4.0+ through current versions.
- The aggregation pipelines used for analyzing the profile collection (`$divide`, `$hour`, `$dateToString`, etc.) are syntactically correct.
- All `print(...)` and `forEach(function(doc) { ... })` constructs work in `mongosh`.
