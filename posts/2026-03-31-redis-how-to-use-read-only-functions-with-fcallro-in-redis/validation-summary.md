# Validation Summary: How to Use Read-Only Functions with FCALL_RO in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (FCALL_RO command, Redis Functions, FUNCTION LOAD)
- Lua (Redis Function scripting)
- Python (redis-py client, RedisCluster)
- Node.js (ioredis client)
- Redis Cluster (replica routing with read_from_replicas)

## Sources Consulted
- Redis FCALL_RO command documentation: https://redis.io/commands/fcall_ro/
- Redis FCALL command documentation: https://redis.io/commands/fcall/
- Redis FUNCTION LOAD documentation: https://redis.io/commands/function-load/
- Redis FUNCTION LIST documentation: https://redis.io/commands/function-list/
- Redis Functions introduction: https://redis.io/docs/interact/programmability/functions-intro/
- Redis command flags (FCALL is CMD_WRITE, FCALL_RO is CMD_READONLY): https://redis.io/commands/
- redis-py documentation for fcall_ro: https://redis-py.readthedocs.io/
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found
- **Step 2 - Misleading claim about FCALL on replicas (line 84)**: The post stated "regular `FCALL` would fail if the function writes," implying FCALL would succeed on a read-only replica if the function only reads. This is incorrect. `FCALL` is classified as a write command (`CMD_WRITE`) in Redis's command table and is rejected on read-only replicas regardless of the function's flags or behavior. Fixed to clarify that `FCALL` is rejected because Redis classifies it as a write command, and `FCALL_RO` is the read-only variant allowed on replicas when the function has the `no-writes` flag.

## Review Notes
- The `get_user_summary` function accesses the `leaderboard` sorted set key without declaring it via the `keys` parameter (only `keys[1]` is declared as the user hash key). This works in standalone Redis but would cause issues in Redis Cluster where undeclared keys may reside on different shards. This is a best-practices issue in the example code, not a factual error about FCALL_RO.
- The `search_keys` function uses `SCAN` which iterates the entire keyspace. In cluster mode, SCAN only scans the local node's key slots, which may produce incomplete results. Again, this is a cluster-specific caveat rather than a FCALL_RO error.
- The `FUNCTION LOAD` command is shown without the `REPLACE` flag. This is correct for a first-time load but would fail if the library already exists. Not an error, but worth noting for users who may re-run the command.
- The Lua function `get_user_summary` returns `{name, score, rank}` as a Lua array. If `ZRANK` returns nil (member not in sorted set), the Lua table would be silently truncated due to Lua's nil-in-array behavior. This is a known Lua gotcha but not a FCALL_RO-specific issue.
