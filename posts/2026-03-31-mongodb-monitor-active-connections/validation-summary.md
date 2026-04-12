# Validation Summary: How to Monitor Active Connections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (serverStatus, currentOp, killOp admin commands)
- mongosh / mongo shell (JavaScript examples)
- mongostat CLI tool
- MongoDB Prometheus exporter

## Sources Consulted
- MongoDB `serverStatus` command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `currentOp` command documentation: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB `killOp` command documentation: https://www.mongodb.com/docs/manual/reference/command/killOp/
- MongoDB `getParameter` command documentation: https://www.mongodb.com/docs/manual/reference/command/getParameter/
- mongostat documentation: https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB connection metrics reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#connections

## Issues Found
1. **Incorrect attribution of client metadata to serverStatus**: The "Identifying Connections by Client" section stated "In MongoDB 4.2+, `serverStatus` includes client metadata" but the code example uses `currentOp`, not `serverStatus`. Per-connection client metadata (client IP, appName, driver info) is exposed through `currentOp`, not `serverStatus`. The `serverStatus` command provides aggregate connection counts but does not include per-client details. Fixed the text to correctly reference `currentOp` with `$all: true`.

## Review Notes
- All code examples use correct `db.adminCommand()` syntax and valid field names (`connections.current`, `connections.available`, `connections.totalCreated`, `secs_running`, `opid`, `appName`, `client`).
- The `currentOp` filter syntax with `active: true` and `secs_running` conditions is correct.
- The `mongostat -o` flag with dot-notation field names (`connections.current`, `opcounters.query`, etc.) is correct.
- The `killOp` command syntax `{ killOp: 1, op: opid }` is correct.
- The Prometheus metric names (`mongodb_connections{state="current"}`) match the standard MongoDB exporter output.
- The 85% connection capacity alert threshold is a reasonable production guideline.
- The `sleep()` function used in the polling example is available in both the legacy mongo shell and mongosh.
