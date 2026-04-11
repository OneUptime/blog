# Validation Summary: How to Monitor Redis Eviction Rate and Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (eviction policies, memory management, INFO command, OBJECT subcommands)
- Python (redis-py client library)
- Prometheus (alerting rules with redis_exporter)
- Bash scripting

## Sources Consulted
- Redis eviction policy documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis OBJECT FREQ command documentation: https://redis.io/docs/latest/commands/object-freq/
- Redis OBJECT IDLETIME command documentation: https://redis.io/docs/latest/commands/object-idletime/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/

## Issues Found

### 1. Incorrect description of `lfu-log-factor`
- **What was wrong:** The comment described `lfu-log-factor` as "Initial frequency for new keys (higher = less likely to be evicted immediately)." This is incorrect — `lfu-log-factor` controls the logarithmic scaling rate of the frequency counter, determining how many accesses are needed to saturate the 0-255 counter. A higher factor means more accesses are needed to reach the maximum value.
- **What was changed:** Updated the comment to "Counter growth rate (higher = more accesses needed to reach max frequency)."
- **Why:** Per official Redis documentation, `lfu-log-factor` has nothing to do with the initial frequency of new keys (which is hardcoded to 5 in the Redis source as `LFU_INIT_VAL`).

### 2. Bash eviction rate script missing `\r` handling
- **What was wrong:** The `redis-cli INFO` command outputs lines with `\r\n` (carriage return + newline) endings. When piped through `grep` and `cut`, the extracted value retains the `\r` character (e.g., `4823\r`), which causes the bash arithmetic expression `$((b - a))` to fail with an error.
- **What was changed:** Added `| tr -d '\r'` to both pipeline commands to strip carriage returns.
- **Why:** This is a well-known gotcha with parsing `redis-cli INFO` output in shell scripts. Without the fix, the script would fail on most systems.

### 3. Eviction policies table was incomplete (8 listed, 10 exist)
- **What was wrong:** The post listed 8 eviction policies and titled the section "The Eight Eviction Policies." Redis now supports 10 eviction policies, including `allkeys-lrm` (least recently modified) and `volatile-lrm`, which were added in Redis 8.0.
- **What was changed:** Added `allkeys-lrm` and `volatile-lrm` to the table, updated the section heading to "The Ten Eviction Policies," and updated the description from "eight" to "ten."
- **Why:** The official Redis eviction documentation now lists 10 policies. The LRM policies were added in Redis 8.0.

## Review Notes
- The `OBJECT FREQ` command is described as "only available when using LFU policies" — this is correct per official docs.
- The `OBJECT IDLETIME` command similarly only works when the eviction policy is *not* set to an LFU policy. The blog doesn't explicitly state this constraint, but since the command is presented under "Check LRU clock (for LRU policies)" the context makes it clear enough.
- The Python script uses `r.info('all')` which works but is heavier than necessary — `r.info()` without arguments would suffice for the fields accessed. This is a style choice, not an error.
- The Prometheus metric names (`redis_evicted_keys_total`, `redis_memory_used_bytes`, `redis_memory_max_bytes`) are correct for the standard `oliver006/redis_exporter`.
- The 20-30% memory headroom advice in the summary is reasonable general guidance.
