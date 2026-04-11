# Validation Summary: How to Use Hash Tags in Redis Cluster for Key Co-Location

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Cluster
- Redis hash tags (key hashing with `{...}`)
- CRC16 hashing / hash slot assignment
- Redis CLI (`redis-cli`)
- Redis multi-key commands (`MGET`, `MSET`)
- Redis transactions (`MULTI`/`EXEC`)

## Sources Consulted
- Redis Cluster specification — hash tag rules: https://redis.io/docs/reference/cluster-spec/#hash-tags
- Redis `CLUSTER KEYSLOT` command documentation: https://redis.io/commands/cluster-keyslot/
- Redis `MULTI`/`EXEC` transaction documentation: https://redis.io/docs/interact/transactions/
- Redis Cluster tutorial: https://redis.io/docs/management/scaling/

## Issues Found
1. **Transactions section used separate `redis-cli` invocations for MULTI/EXEC (lines 93-99)**: Each `redis-cli -c` call creates a new, independent connection. Running `MULTI` on one connection and `SET`/`EXEC` on separate connections means the transaction commands are never actually grouped — MULTI/EXEC must all occur on the same connection. Fixed by replacing the separate invocations with an interactive session showing a single `redis-cli -c` connection with the expected Redis prompts and responses (`OK`, `QUEUED`, result output).

## Review Notes
- The "How Hash Tags Work" section shows hash tags appended at the end of the key (e.g., `user:1001:profile{user:1001}`), while all practical examples use the more conventional prefix pattern (e.g., `{user:1001}:profile`). Both are technically valid, but the inconsistency could confuse readers. A future revision could unify the explanatory example to match the practical patterns.
- The hot-slot detection commands (`CLUSTER INFO | grep cluster_stats_messages` and `INFO stats | grep keyspace_hits`) provide indirect indicators of load imbalance but are not the most direct way to detect hot slots. `CLUSTER COUNTKEYSINSLOT <slot>` or monitoring per-slot traffic via Redis slow log / latency monitoring would be more targeted. This is not an error but could be improved.
- The CRC16 hash algorithm description (CRC16 mod 16384) is correct per the Redis Cluster specification.
- The 16384 slot count is correct.
- The CROSSSLOT error message matches Redis's actual error output.
