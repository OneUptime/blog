# Validation Summary: Redis Runbook: Handling High Latency Incidents

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Redis (server and redis-cli)
- Redis SLOWLOG
- Redis Latency Monitoring (LATENCY LATEST, latency-monitor-threshold, latency-tracking)
- Redis Active Defragmentation
- Redis Persistence (BGSAVE, BGREWRITEAOF)

## Sources Consulted
- Redis official documentation on latency diagnosis: https://redis.io/docs/management/optimization/latency/
- Redis SLOWLOG documentation: https://redis.io/commands/slowlog-get/
- Redis CONFIG SET documentation: https://redis.io/commands/config-set/
- Redis INFO command documentation: https://redis.io/commands/info/
- Redis LATENCY LATEST documentation: https://redis.io/commands/latency-latest/
- Redis DEBUG command documentation: https://redis.io/commands/debug/
- Redis server configuration (hz setting): https://redis.io/docs/management/config/

## Issues Found

### 1. `DEBUG SLEEP 0` in Step 3 (Identify Blocking Commands)
- **What was wrong:** `redis-cli DEBUG SLEEP 0` was listed as a way to identify blocking commands. This command makes Redis sleep for 0 seconds and returns immediately — it does not help diagnose blocking operations. Additionally, the DEBUG command is restricted by default since Redis 7.0 and is not suitable for production runbooks.
- **What was changed:** Replaced with `redis-cli LATENCY LATEST`, which shows the latest latency events by category and is the correct tool for identifying recent latency-causing operations.

### 2. Inaccurate fork time explanation in Step 4
- **What was wrong:** The post stated "Fork time over 200ms indicates memory pressure or slow disk." Fork time (`latest_fork_usec`) measures how long the OS takes to copy page tables during fork(). This is proportional to the Redis process memory size, not disk speed. Disk speed affects the RDB/AOF write after the fork, not the fork itself.
- **What was changed:** Replaced "memory pressure or slow disk" with "a large memory footprint or Transparent Huge Pages (THP) being enabled," which are the actual causes of high fork times.

### 3. Misleading `hz` advice in Step 7
- **What was wrong:** The post said "Reduce `hz` from 100 to 10" which implies 100 is the default or expected value. The Redis default for `hz` is 10. Stating "from 100 to 10" misleads readers into thinking the default needs to be changed.
- **What was changed:** Rephrased to "If `hz` has been raised above the default of 10, lower it back to reduce background task CPU overhead," which correctly frames this as a remediation for non-default configurations.

## Review Notes
- The `latency-tracking yes` config option in Step 8 was introduced in Redis 7.0. This is correct but version-specific; readers on older Redis versions should be aware it won't be available.
- The `activedefrag` feature requires Redis to be compiled with jemalloc (the default allocator). If a custom allocator is used, this command will fail. This is an edge case not worth noting in the post itself.
- The CLIENT LIST grep in Step 3 is functional but could be more targeted by filtering for `flags=b` (blocked clients) for a more precise diagnosis. This is a minor improvement opportunity, not an error.
