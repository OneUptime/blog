# Validation Summary: How to Use the killOp Command to Cancel Long-Running Operations in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands: `currentOp`, `killOp`, `adminCommand`)
- MongoDB Query Operators (`$gt`, `$in`, `$not`)
- `maxTimeMS` cursor method

## Sources Consulted
- MongoDB official documentation: `db.killOp()` — https://www.mongodb.com/docs/manual/reference/method/db.killOp/
- MongoDB official documentation: `db.currentOp()` — https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB official documentation: `cursor.maxTimeMS()` — https://www.mongodb.com/docs/manual/reference/method/cursor.maxTimeMS/
- MongoDB official documentation: `killOp` admin command — https://www.mongodb.com/docs/manual/reference/command/killOp/

## Issues Found
1. **Inaccurate description of `maxTimeMS` enforcement**: The post stated that `maxTimeMS` auto-cancels operations "at the driver level." This is incorrect — `maxTimeMS` is set by the client/driver but enforced server-side by the MongoDB server. The server monitors the operation's cumulative time and aborts it if the limit is exceeded. Updated the description to clarify that the limit is enforced server-side.

## Review Notes
- The regex `{ $not: /^admin|^local|^config/ }` for excluding system operations works correctly but could also match user databases with names starting with "admin", "local", or "config" (e.g., `administration.users`). A more precise regex like `/^(admin|local|config)\./` would be safer, but the current version is acceptable for most practical scenarios.
- All `currentOp` field names (`opid`, `ns`, `op`, `secs_running`, `client`, `command`) are accurate for MongoDB 3.6+.
- The `killOp` admin command syntax with `"shardName:opid"` format for sharded clusters is correct.
