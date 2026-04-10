# Validation Summary: How to Use SWAPDB in Redis to Swap Two Databases

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (4.0+)
- SWAPDB command
- Redis logical databases (SELECT/DBSIZE)
- Redis keyspace notifications

## Sources Consulted
- Redis official documentation for SWAPDB: https://redis.io/commands/swapdb/
- Redis official documentation for SELECT: https://redis.io/commands/select/
- Redis official documentation for keyspace notifications: https://redis.io/docs/manual/keyspace-notifications/
- Redis Cluster specification (regarding single-database limitation): https://redis.io/docs/reference/cluster-spec/

## Issues Found
No technical issues found.

## Review Notes
- The `SELECT 0` before `SWAPDB 0 1` in the examples is technically redundant since SWAPDB takes explicit database indices regardless of the currently selected database. However, it serves a useful pedagogical purpose by showing the reader which database the client is "on" for subsequent GET commands, so it is not incorrect.
- The keyspace notifications note is accurate but could be more precise in a future revision. Specifically, Redis emits a `swapdb` notification event when SWAPDB executes, and subsequent operations on a database index will fire notifications for that index's subscribers regardless of the swap.
- The default number of Redis databases is 16 (indices 0-15), which makes the `SWAPDB 0 16` error example correct. This default is configurable via the `databases` directive in redis.conf.
- The post correctly notes that SWAPDB is unavailable in Redis Cluster mode. It is available in standalone and Sentinel deployments.
