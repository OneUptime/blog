# Validation Summary: How to Monitor MongoDB with serverStatus Command

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (serverStatus command)
- mongosh (MongoDB Shell)
- WiredTiger storage engine
- MongoDB Replica Sets

## Sources Consulted
- MongoDB official documentation: `serverStatus` command reference (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: connection pool metrics (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#connections)
- MongoDB official documentation: `ismaster` deprecation and `hello` command (https://www.mongodb.com/docs/manual/reference/command/hello/)
- MongoDB official documentation: WiredTiger cache statistics (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger)

## Issues Found

1. **Misleading comment about section filtering**: The comment `// Get specific sections only` with code `db.serverStatus({ connections: 1, opcounters: 1, mem: 1 })` was incorrect. Most sections are included by default, so passing `1` for them is redundant. To control output, you exclude sections with `0`. Changed to `db.serverStatus({ repl: 0, metrics: 0, locks: 0 })` with comment `// Exclude sections you don't need`.

2. **Incorrect description of `connections.current`**: Described as "number of active client connections" but `current` counts all incoming connections including idle ones. The `active` field (already shown in the example output) is the one that tracks truly active connections. Changed to "number of incoming connections from clients (includes both active and idle)".

3. **Deprecated `ismaster` field in repl output**: The `ismaster` field in the `serverStatus().repl` section was deprecated in MongoDB 5.0 in favor of `isWritablePrimary`. Updated the example output to use `isWritablePrimary: true`.

## Review Notes
- The `printjson()` example is technically correct but redundant in modern mongosh, which already pretty-prints output by default. Left as-is since it doesn't hurt and is useful for legacy `mongo` shell users.
- The `exhaustIsMaster` field shown in the connections example is also a legacy name; MongoDB 5.0+ added `exhaustHello` alongside it. Both are shown in the example, which is accurate for current versions.
- The `globalLock.totalTime` value of 86400000000 represents microseconds (1 day). The post doesn't specify the unit; readers might assume milliseconds. Not changed since this is a minor omission rather than an error.
