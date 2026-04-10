# Validation Summary: Redis Server Commands Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Redis (server commands, configuration, persistence, replication, monitoring)

## Sources Consulted
- Redis official documentation: https://redis.io/docs/latest/commands/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis BGSAVE command documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis DEBUG command documentation: https://redis.io/docs/latest/commands/debug/
- Redis LATENCY command documentation: https://redis.io/docs/latest/commands/latency-history/
- Redis REPLICAOF command documentation: https://redis.io/docs/latest/commands/replicaof/

## Issues Found

1. **`BGSAVE SCHEDULE` comment was inaccurate (line 88)**
   - **Was:** "schedule after replication if AOF active"
   - **Changed to:** "schedule if another BGSAVE or AOF rewrite is in progress"
   - **Why:** `BGSAVE SCHEDULE` causes the command to return OK (instead of an error) when another BGSAVE or AOF rewrite is already running, and schedules the save to execute once the current background operation completes. It is not related to replication.

2. **`DEBUG SLEEP 0` was incorrectly described as forcing replica sync (lines 112-113)**
   - **Was:** `DEBUG SLEEP 0` with comment "(triggers sync check)"
   - **Changed to:** `INFO replication` with comment "Check replication info"
   - **Why:** `DEBUG SLEEP` makes the Redis server sleep for the specified number of seconds — it does not trigger a replica synchronization. This was incorrect and potentially misleading advice. Replaced with `INFO replication`, which is the standard way to check replication status in this context.

3. **`LATENCY HISTORY rdb_fork` used an invalid event name (line 141)**
   - **Was:** `LATENCY HISTORY rdb_fork`
   - **Changed to:** `LATENCY HISTORY fork`
   - **Why:** `rdb_fork` is not a standard Redis latency event name. The correct event name for fork latency (covering both RDB and AOF fork operations) is `fork`.

## Review Notes
- The `SELECT 0` comment says "0-15" which reflects the default `databases 16` configuration. This is correct for default setups but the number of databases is configurable via `redis.conf`.
- The `CLIENT LIST` comment says "Count connected clients" — technically CLIENT LIST returns detailed info about each client rather than a count. `INFO clients` would be more appropriate for just getting a count. This is a minor description issue, not a technical error.
- The `INFO everything` section correctly notes this is for getting all sections including hidden ones (available since Redis 7.0).
- All FLUSHDB/FLUSHALL ASYNC commands are correct (available since Redis 4.0).
- The summary advice about using ASYNC variants in production is sound guidance.
