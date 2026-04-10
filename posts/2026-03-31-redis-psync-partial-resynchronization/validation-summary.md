# Validation Summary: How to Use PSYNC in Redis for Partial Resynchronization

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (replication subsystem, PSYNC protocol)
- Redis CLI (`redis-cli`)
- Python (`redis-py` library)

## Sources Consulted
- Redis PSYNC command documentation — https://redis.io/docs/latest/commands/psync/
- Redis replication documentation — https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis INFO command documentation — https://redis.io/docs/latest/commands/info/
- Redis 7.4 redis.conf source for `repl-backlog-size` and `repl-backlog-ttl` defaults

## Issues Found
No technical issues found.

## Review Notes
- The `PSYNC <replicationid> <offset>` syntax is correct per official documentation.
- `PSYNC ? -1` correctly forces a full resynchronization, as documented for first-time replica connections.
- The `+CONTINUE` and `+FULLRESYNC` response descriptions accurately reflect the PSYNC protocol behavior.
- `repl-backlog-size` defaults to 1mb and `repl-backlog-ttl` defaults to 3600 seconds; the post uses 10mb as an example configuration value (not claiming it is the default), which is fine.
- `sync_full`, `sync_partial_ok`, and `sync_partial_err` are confirmed real fields in the INFO replication output, and their descriptions in the post are accurate.
- `repl-backlog-size` can be set at runtime via `CONFIG SET` as shown in the post.
- The Python code using `redis-py` is syntactically correct and uses current, non-deprecated APIs. Note that the `sync_full`, `sync_partial_ok`, and `sync_partial_err` fields are only present in INFO output on master nodes; the post's context (monitoring replication health) makes this implicit.
- The post correctly notes that PSYNC is an internal command not intended for direct application use.
