# Validation Summary: How to Use mongosh for Database Administration Tasks

## Status
validated

## Post Type
Reference / Quick Guide

## Technologies Covered
- MongoDB (server commands, replica sets, profiler, indexes)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: `serverStatus` command — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation: `currentOp` command — https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB official documentation: `killOp` command — https://www.mongodb.com/docs/manual/reference/command/killOp/
- MongoDB official documentation: `logRotate` command — https://www.mongodb.com/docs/manual/reference/command/logRotate/
- MongoDB official documentation: `getLog` command — https://www.mongodb.com/docs/manual/reference/command/getLog/
- MongoDB official documentation: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB official documentation: `rs.status()` — https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB official documentation: `rs.stepDown()` — https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB official documentation: `compact` command — https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB official documentation: `validate` command — https://www.mongodb.com/docs/manual/reference/command/validate/
- MongoDB official documentation: Index Management — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found
No technical issues found.

## Review Notes
- The replication lag snippet prints each member's `optimeDate` rather than computing the actual lag delta between secondary and primary. This is technically correct (a DBA can compare the timestamps), but a future improvement could compute `primary.optimeDate - secondary.optimeDate` for a more direct lag value.
- `db.collection.stats()` still works but has been marked as deprecated in newer mongosh versions in favor of the `$collStats` aggregation stage. This is worth noting for future updates but is not an error today.
- The `$or` wrapper in the index build progress check (`$or: [{ "command.createIndexes": { $exists: true } }]`) is unnecessary since there is only one condition, but it is syntactically valid and functionally correct.
