# Validation Summary: How to Use setParameter for Runtime Configuration in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (setParameter, getParameter, profiling, WiredTiger configuration)
- mongod.conf (YAML configuration)
- MongoDB Shell (mongosh / legacy mongo shell)

## Sources Consulted
- MongoDB official documentation: setParameter command (https://www.mongodb.com/docs/manual/reference/command/setParameter/)
- MongoDB official documentation: getParameter command (https://www.mongodb.com/docs/manual/reference/command/getParameter/)
- MongoDB official documentation: profile command (https://www.mongodb.com/docs/manual/reference/command/profile/)
- MongoDB official documentation: db.setProfilingLevel() (https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/)
- MongoDB official documentation: WiredTiger storage engine configuration
- MongoDB official documentation: chunkMigrationConcurrency parameter
- MongoDB 6.0 release notes (storageEngineConcurrent*Transactions rename)

## Issues Found

1. **`profile` incorrectly shown as a setParameter parameter (line ~47)**: The post used `db.adminCommand({ setParameter: 1, profile: 1 })` to set the profiling level. However, `profile` is NOT a setParameter parameter — it is a separate database command. Fixed to use `db.setProfilingLevel(1)` and `db.runCommand({ profile: 1 })`, with a note clarifying that profiling is not controlled via setParameter.

2. **`maxConcurrentMovePrimaryChunkMigrations` is not a documented parameter (line ~99)**: This parameter name does not appear in official MongoDB documentation. Replaced with `chunkMigrationConcurrency`, which is the documented setParameter for controlling chunk migration concurrency in sharded clusters (MongoDB 6.0+).

3. **`wiredTigerConcurrentReadTransactions` / `wiredTigerConcurrentWriteTransactions` renamed in MongoDB 6.0+ (lines ~81-84)**: These parameters were renamed to `storageEngineConcurrentReadTransactions` and `storageEngineConcurrentWriteTransactions` starting in MongoDB 6.0. Updated the examples to use the current names with a comment noting the rename.

## Review Notes
- In MongoDB 7.0+, the server uses a dynamic algorithm to automatically adjust concurrent storage engine transaction tickets. Manually setting `storageEngineConcurrent*Transactions` disables that automatic tuning. The post does not mention this, but it is a useful caveat for readers on MongoDB 7.0+.
- The `getParameter: "*"` syntax is correct but MongoDB 8.0 introduced an expanded form: `{ getParameter: { allParameters: true, showDetails: true } }` for more detailed output.
- The `ttlMonitorSleepSecs` parameter was deprecated in MongoDB 6.1+ in favor of `ttlMonitorEnabled` and other TTL configuration options, though it still functions. Readers on newer versions should consult current documentation.
