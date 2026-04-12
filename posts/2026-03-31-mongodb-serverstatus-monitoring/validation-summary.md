# Validation Summary: How to Monitor MongoDB with db.serverStatus()

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (serverStatus diagnostic command)
- mongosh (MongoDB Shell)
- WiredTiger storage engine
- MongoDB Replica Sets
- Prometheus (mongodb_exporter)

## Sources Consulted
- MongoDB official documentation: db.serverStatus() command reference (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: connection pool metrics (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#connections)
- MongoDB official documentation: WiredTiger cache statistics (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger)
- MongoDB official documentation: repl section output (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#repl)
- MongoDB 5.0 release notes regarding ismaster deprecation (https://www.mongodb.com/docs/manual/release-notes/5.0-compatibility/)
- Percona mongodb_exporter metric naming conventions (https://github.com/percona/mongodb_exporter)

## Issues Found
1. **Deprecated `ismaster` field in repl section example**: The `repl` output example used `ismaster: true`, which was deprecated in MongoDB 5.0 (released July 2021) in favor of `isWritablePrimary`. Updated to `isWritablePrimary: true` to reflect current MongoDB output.

## Review Notes
- The `exhaustIsMaster` field shown in the connections output is deprecated since MongoDB 5.0 in favor of `exhaustHello`, but both fields still appear in actual MongoDB output for backward compatibility. The example realistically shows both, with `exhaustIsMaster: 0` and `exhaustHello: 12`, which is accurate for transitional versions.
- The opcounters output uses `NumberLong()` syntax which is legacy mongo shell format. In mongosh, values display as `Long('450000')`. This is a minor cosmetic difference that does not affect the tutorial's correctness.
- The cache hit ratio formula `((pages_requested - pages_read_into_cache) / pages_requested)` is a widely-used approximation. It assumes "pages read into cache" represents cache misses, which is reasonable for monitoring purposes.
- The post does not specify a MongoDB version. All content is accurate for MongoDB 6.0+ and 7.0+.
