# Validation Summary: How to Use the serverStatus Command in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (serverStatus command)
- MongoDB Shell (mongosh) JavaScript syntax
- WiredTiger storage engine cache metrics

## Sources Consulted
- MongoDB official documentation: serverStatus command (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: connection pool metrics (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#connections)
- MongoDB official documentation: opcounters (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#opcounters)
- MongoDB official documentation: WiredTiger cache statistics (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger)
- MongoDB official documentation: globalLock (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#globallock)

## Issues Found

1. **Incorrect connection limit diagnostic (line 44)**: The original text stated "A high `current` approaching `available` means you are near the connection limit." This is misleading because `available` represents the number of *remaining* unused connections, and it decreases as `current` increases (total capacity = current + available). Changed to: "A low `available` value (approaching 0) means you are near the connection limit."

2. **Misleading label in serverHealth function (line 88)**: The label `Ops/sec (insert)` was used for `s.opcounters.insert`, but opcounters values are cumulative counts since server start, not per-second rates. The post itself correctly notes this on line 66. Changed label to `Total inserts` for consistency.

## Review Notes
- All MongoDB field names (`connections.current`, `connections.available`, `connections.totalCreated`, `mem.resident`, `mem.virtual`, `opcounters.*`, `wiredTiger.cache.*`, `globalLock.activeClients.readers/writers`, `uptimeMillis`) are accurate and current.
- The section exclusion syntax (`repl: 0, locks: 0, metrics: 0`) is correct.
- The WiredTiger cache field names use the exact string keys from the serverStatus output.
- The JavaScript uses mongosh-compatible syntax (template literals, `const`, `print()`).
- The `uptimeMillis / 1000 / 3600` conversion to hours is mathematically correct.
- The connections display `current/(current + available)` in the serverHealth function correctly computes the total connection limit.
