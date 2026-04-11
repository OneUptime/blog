# Validation Summary: How to Use SELECT in Redis to Switch Between Databases

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SELECT command, MOVE, FLUSHDB, FLUSHALL, DBSIZE, INFO keyspace)
- Python (redis-py library)
- Node.js (node-redis v4+ library)
- Redis Cluster mode limitations

## Sources Consulted
- Redis official documentation for SELECT: https://redis.io/commands/select/
- Redis official documentation for MOVE: https://redis.io/commands/move/
- Redis official documentation for FLUSHDB: https://redis.io/commands/flushdb/
- Redis official documentation for FLUSHALL: https://redis.io/commands/flushall/
- Redis official documentation for DBSIZE: https://redis.io/commands/dbsize/
- Redis official documentation for INFO: https://redis.io/commands/info/
- Redis Cluster specification (database limitation): https://redis.io/docs/reference/cluster-spec/
- redis-py documentation: https://redis-py.readthedocs.io/
- node-redis documentation: https://github.com/redis/node-redis

## Issues Found
No technical issues found.

## Review Notes
- The Python example uses `client.select(1)` which works via redis-py's `ManagementCommands` mixin. However, this method is connection-pool-sensitive: in production code with concurrent access, subsequent commands may execute on a different pooled connection that is still on the original database. The example works correctly for the simple sequential script shown, but readers building production systems should prefer specifying `db=N` at connection creation time instead.
- The Node.js example uses top-level `await` outside an async function, which requires either an async wrapper or ESM top-level await support. This is a common documentation convention and not a technical error.
- The `MOVE` command has an additional behavior not mentioned: it returns 0 (and does nothing) if the key already exists in the destination database. This is not an error in the post since it doesn't claim otherwise, but is worth noting for completeness.
