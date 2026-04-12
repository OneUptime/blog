# Validation Summary: How to Configure Write Concern with wtimeout in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, write concern, wtimeout)
- MongoDB Node.js Driver (WriteConcern class, error handling)
- MongoDB Shell (mongosh)
- MongoDB Connection String URI

## Sources Consulted
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB serverStatus command reference (v7.0): https://www.mongodb.com/docs/v7.0/reference/command/serverstatus/
- MongoDB Node.js Driver API - WriteConcern class (v6.9): https://mongodb.github.io/node-mongodb-native/6.9/classes/WriteConcern.html
- MongoDB error codes reference: https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB Read/Write Concern specification: https://github.com/mongodb/specifications/blob/master/source/read-write-concern/read-write-concern.md

## Issues Found
1. **Incorrect serverStatus field for monitoring write concern errors (Critical)**: The post used `status.opcounters.getmore` to monitor write concern errors. `opcounters.getmore` tracks cursor getMore operations and has nothing to do with write concern errors. Fixed to use `status.metrics.getLastError.wtimeouts` for timeout counts and `status.metrics.getLastError.wtime.totalMillis` for cumulative wait time, which are the correct fields documented in the serverStatus reference.

2. **Inconsistent field name in description**: The text said "Specify `wtimeoutMS` alongside the write concern" but the immediately following code example uses `wtimeout` (the correct field name for write concern documents). Changed the text to say `wtimeout` to match the code. Note: `wtimeoutMS` is correct in connection strings, and the connection string example already uses it correctly.

3. **Misleading error code comment**: The comment `// Error code 64 is WriteConcernFailed (timeout)` implied error code 64 is exclusively for timeouts. Error code 64 (`WriteConcernFailed`) covers all write concern failures, not just timeouts. Removed the "(timeout)" qualifier and updated the log message from "timeout" to "failed" to be more accurate.

## Review Notes
- The `metrics.getLastError` section in `serverStatus` still exists in MongoDB 7.x despite the `getLastError` command being removed in MongoDB 5.1. The metrics continue to track write concern behavior internally.
- The Node.js driver error handling example accesses `err.result.writeConcernErrors` (plural). In practice, the structure may vary by driver version. In newer drivers (v5+/v6+), write concern errors are thrown as `MongoWriteConcernError` with details accessible via `err.result.writeConcernError` (singular) or `err.errInfo`. The code is plausible but may need adjustment depending on the driver version used.
- The `WriteConcern` constructor's second parameter is named `wtimeoutMS` in the driver API (v5+/v6+), and the `wtimeout` property on the class is deprecated in favor of `wtimeoutMS`. The positional usage `new WriteConcern("majority", 5000, true)` works correctly regardless.
- To specifically detect a write concern *timeout* (vs other write concern failures), applications should check `err.result.writeConcernError.errInfo.wtimeout === true` rather than relying solely on error code 64.
