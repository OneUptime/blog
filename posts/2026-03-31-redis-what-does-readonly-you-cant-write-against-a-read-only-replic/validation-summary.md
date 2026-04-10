# Validation Summary: What Does 'READONLY You can't write against a read only replica' Mean

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (replication, Sentinel, Cluster)
- Python (redis-py library, Sentinel client)
- Node.js (ioredis library, Cluster client)
- Redis CLI commands (ROLE, INFO, CONFIG SET, SENTINEL)

## Sources Consulted
- Redis ROLE command documentation: https://redis.io/commands/role/
- Redis INFO command documentation: https://redis.io/commands/info/
- Redis replication documentation: https://redis.io/docs/management/replication/
- Redis Sentinel documentation: https://redis.io/docs/management/sentinel/
- redis-py Sentinel API documentation: https://redis-py.readthedocs.io/en/stable/connections.html#sentinel-client
- ioredis Cluster documentation: https://github.com/redis/ioredis#cluster
- Redis CONFIG SET documentation: https://redis.io/commands/config-set/

## Issues Found
1. **Incorrect claim about ROLE command output in newer Redis**: The post stated that the ROLE command returns `replica` in newer Redis versions. This is incorrect. The ROLE command returns `slave` as the role string even in Redis 7.x and later. The terminology change from "slave" to "replica" was applied to configuration directives (e.g., `replicaof` instead of `slaveof`, `replica-read-only` instead of `slave-read-only`) and documentation, but the ROLE command output strings (`master`, `slave`, `sentinel`) were not changed to maintain backward compatibility with client libraries. Fixed the text to clarify that ROLE returns `slave` even in newer versions.

## Review Notes
- The `INFO replication` output example uses field names like `slave_repl_offset` and `slave_read_only`. These field names are still present in current Redis versions for backward compatibility, so the example is accurate.
- The note about data written to a replica being "overwritten on the next full sync" is slightly simplified. In practice, replica-local writes persist until a full resync occurs (e.g., after a restart or reconnection) or until the primary sends a command that overwrites the same keys. During normal partial resyncs, replica-local keys are not automatically purged. The current wording is acceptable as a cautionary simplification.
- The Python Sentinel example uses `slave_for()` which is the established method name in redis-py. While redis-py also supports `replica_for()` as an alias in newer versions, `slave_for()` remains valid and widely used.
