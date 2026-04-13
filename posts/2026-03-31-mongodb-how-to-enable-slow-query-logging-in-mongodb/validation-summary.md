# Validation Summary: How to Enable Slow Query Logging in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (4.4+ structured logging, Database Profiler)
- MongoDB Shell (mongosh) commands
- mongod.conf configuration (YAML format)
- Linux CLI tools (grep)

## Sources Consulted
- MongoDB documentation on Database Profiler: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB documentation on slowOpThresholdMs: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-operationProfiling.slowOpThresholdMs
- MongoDB documentation on setParameter: https://www.mongodb.com/docs/manual/reference/command/setParameter/
- MongoDB documentation on system.profile: https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB documentation on explain(): https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB documentation on structured logging (4.4+): https://www.mongodb.com/docs/manual/reference/log-messages/

## Issues Found
No technical issues found.

## Review Notes
- The structured JSON log format shown applies to MongoDB 4.4+. Earlier versions use a different plain-text log format. The post does not explicitly state a version requirement, but all examples are consistent with modern MongoDB (4.4+).
- The `db.system.profile.stats().maxSize` call works on MongoDB 4.4+ where `collStats` output includes `maxSize` for capped collections.
- The grep pattern `'"durationMillis":[0-9]\{4,\}'` uses BRE syntax which works with standard `grep` but would need adjustment for `grep -E` (ERE). This is correct as written.
- The post correctly notes that profiling level 2 (all operations) should be used carefully in production due to performance overhead.
