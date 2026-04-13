# Validation Summary: How to Enable and Configure the MongoDB Profiler (Levels 0, 1, 2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Database Profiler
- MongoDB Shell (mongosh)
- mongod.conf configuration

## Sources Consulted
- MongoDB Manual: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: db.setProfilingLevel() — https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/
- MongoDB Manual: db.getProfilingStatus() — https://www.mongodb.com/docs/manual/reference/method/db.getProfilingStatus/
- MongoDB Manual: system.profile collection — https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB Manual: operationProfiling configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#operationprofiling-options
- MongoDB Manual: cursor.comment() — https://www.mongodb.com/docs/manual/reference/method/cursor.comment/

## Issues Found

1. **Missing `db.setProfilingLevel(0)` before dropping system.profile**: The section on resizing the `system.profile` collection showed `db.system.profile.drop()` without first disabling the profiler. MongoDB requires profiling to be disabled (level 0) before the `system.profile` collection can be dropped. Added `db.setProfilingLevel(0);` before the drop command.

2. **"Per-Operation Override" section was misleading**: The original section claimed that `maxTimeMS` and `comment` can override the profiler threshold per query. This is incorrect — `maxTimeMS` sets a maximum execution time for an operation (aborting it if exceeded), and `comment` tags an operation for identification. Neither controls profiling behavior. Additionally, setting `slowms: -1` was described as forcing profiling of "a specific query," but it is a global setting that causes all operations to be profiled. Rewrote the section as "Temporarily Profiling All Operations" with accurate descriptions: `slowms: -1` as a global technique to capture everything, `comment` as a way to tag and filter specific queries in profiler output, and a reminder to restore the normal threshold afterward.

## Review Notes
- The `sampleRate` parameter was introduced in MongoDB 3.6. The post does not mention version requirements, which is acceptable since 3.6+ is widely deployed.
- The profiler levels, `db.getProfilingStatus()` output format, `db.setProfilingLevel()` API, `system.profile` default 1 MB capped size, and `mongod.conf` `operationProfiling` settings are all accurate.
- The profile entry fields listed (`op`, `ns`, `millis`, `keysExamined`, `docsExamined`, `planSummary`) are correct.
