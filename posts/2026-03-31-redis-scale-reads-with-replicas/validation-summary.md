# Validation Summary: How to Scale Redis Reads with Replicas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (replication, Sentinel, configuration)
- Python (redis-py client library)
- Redis CLI

## Sources Consulted
- Redis official documentation on replication: https://redis.io/docs/management/replication/
- Redis official documentation on Sentinel: https://redis.io/docs/management/sentinel/
- Redis configuration file reference: https://redis.io/docs/management/config/
- redis-py library documentation: https://redis-py.readthedocs.io/
- Redis INFO command reference: https://redis.io/commands/info/

## Issues Found

1. **Incorrect claim about Redis threading model (line 11)**: The post stated "Redis is single-threaded for writes" which implies only writes are single-threaded. Redis is single-threaded for all command execution (both reads and writes). Changed to "Redis processes commands on a single thread."

2. **Non-existent API reference (line 39)**: The post referenced `ReplicaReadOnlyStrategy` as a redis-py class. This class does not exist in redis-py. The text was changed to simply describe "a custom client pool to distribute reads" which accurately matches the code example shown.

3. **Unconventional import (lines 42-43)**: The code used `import redis` (unused) and `from redis.client import Redis` (unconventional internal import). Changed to the standard `from redis import Redis`.

4. **Incorrect terminology in monitoring section (line 93)**: The difference between primary and replica `master_repl_offset` values was described as "the replication backlog." The replication backlog is the circular buffer on the primary configured via `repl-backlog-size`. The offset difference is the replication lag in bytes. Changed "replication backlog" to "replication lag in bytes."

## Review Notes
- The `sentinel.slave_for()` method uses the older "slave" terminology. In newer redis-py versions, `sentinel.replica_for()` may be available as an alias. The current code works correctly but could be updated for modern naming conventions in a future revision.
- The Python round-robin read routing example is not thread-safe due to the use of a `global replica_index` without synchronization. This is acceptable for a tutorial demonstrating the concept, but a production implementation would need thread-safe rotation (e.g., using `itertools.cycle` with a lock or `threading.local`).
- All Redis configuration directives (`replicaof`, `replica-read-only`, `replica-lazy-flush`, `repl-backlog-size`, `repl-backlog-ttl`) are valid for Redis 5.0+.
