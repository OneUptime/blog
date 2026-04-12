# Validation Summary: How to Configure logLevel and slowOpThresholdMs in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (server logging subsystem)
- MongoDB shell (`mongosh`) commands
- MongoDB configuration file (`mongod.conf`)
- MongoDB database profiler

## Sources Consulted
- MongoDB Manual: Log Messages — https://www.mongodb.com/docs/manual/reference/log-messages/
- MongoDB Manual: `setParameter` — https://www.mongodb.com/docs/manual/reference/command/setParameter/
- MongoDB Manual: `db.setLogLevel()` — https://www.mongodb.com/docs/manual/reference/method/db.setLogLevel/
- MongoDB Manual: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Manual: `operationProfiling` Configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#operationprofiling-options
- MongoDB Manual: `systemLog` Configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#systemlog-options

## Issues Found

1. **Incorrect description of log level 0**: The post described verbosity level 0 as "warnings and errors only." MongoDB verbosity 0 is the default level that includes informational (I), warning (W), error (E), and fatal (F) severity messages — not just warnings and errors. Fixed the description to "informational, warning, error, and fatal messages" and updated the level 1 description from "Informational" to "Debug level 1" to match MongoDB's actual log level semantics.

2. **Incorrect slow operation log label**: The post claimed slow operations appear with a `SLOW_OP` label. In MongoDB's structured JSON logging (4.4+), slow operations are logged with `"msg":"Slow query"` — there is no `SLOW_OP` label. Fixed to reference the correct `"Slow query"` message, which is consistent with the example log entry already shown in the post.

## Review Notes
- The note about `keysExamined` vs `docsExamined` and "high ratios suggest poor index selectivity" is somewhat imprecise. More commonly, MongoDB performance analysis focuses on comparing `docsExamined` to `nReturned` (many docs examined but few returned indicates inefficiency). The current phrasing is not strictly wrong but could be more precise in a future revision.
- All `mongosh` commands (`db.adminCommand`, `db.setLogLevel`, `db.setProfilingLevel`) use correct syntax.
- The `mongod.conf` YAML snippets use correct field names and structure.
- The profiler query against `db.system.profile` with the `millis` field is correct.
- The `operationProfiling.mode: slowOp` setting is correct.
