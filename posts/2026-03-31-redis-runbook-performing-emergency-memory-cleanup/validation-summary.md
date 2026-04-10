# Validation Summary: Redis Runbook: Performing Emergency Memory Cleanup

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Redis (server and CLI)
- Redis memory management (maxmemory, eviction policies)
- Redis active defragmentation
- Redis SCAN, DEL, UNLINK, EXPIRE, MEMORY USAGE commands

## Sources Consulted
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis UNLINK command documentation: https://redis.io/docs/latest/commands/unlink/
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- Redis active defragmentation documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/

## Issues Found

1. **Wrong metric for detecting OOM write rejections** (Step 1): The post used `redis-cli INFO stats | grep "rejected_connections"` to check if writes were being rejected due to memory pressure. However, `rejected_connections` counts connections rejected because of the `maxclients` limit, not memory-related OOM errors. Fixed by replacing with a direct write test (`SET __oom_check__ test EX 10`) that will return an OOM error if writes are failing due to memory limits.

2. **Invalid redis-cli flag `--sleep`** (Step 2): The command `redis-cli --bigkeys --sleep 0.01` used `--sleep`, which is not a valid redis-cli flag. The correct flag for throttling SCAN iterations in `--bigkeys` mode is `-i`. Fixed to `redis-cli --bigkeys -i 0.01`.

## Review Notes
- The SCAN loop in Step 2 does not quote `$key` in the inner `redis-cli MEMORY USAGE $key` call, which could break on keys containing spaces. This is a minor robustness issue but acceptable for an emergency runbook where most Redis keys don't contain spaces.
- The post advises persisting config changes to `redis.conf` to survive restarts but doesn't mention `CONFIG REWRITE`, which is the standard way to persist runtime config changes. This could be a useful addition in the future.
- All commands (UNLINK, MEMORY USAGE, active defragmentation) require Redis 4.0+. The post doesn't specify a minimum Redis version, which could be noted.
