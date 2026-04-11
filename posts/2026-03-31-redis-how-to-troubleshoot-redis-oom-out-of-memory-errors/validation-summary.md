# Validation Summary: How to Troubleshoot Redis OOM (Out of Memory) Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Redis (server, CLI, configuration)
- Linux OOM killer and systemd
- Python redis-py client library
- Bash scripting

## Sources Consulted
- Redis INFO command documentation — https://redis.io/docs/latest/commands/info/
- Redis CONFIG SET documentation — https://redis.io/docs/latest/commands/config-set/
- Redis key eviction / maxmemory documentation — https://redis.io/docs/latest/develop/reference/eviction/
- Redis CLI documentation (TTY vs non-TTY output modes) — https://redis.io/docs/latest/develop/tools/cli/
- Redis configuration file reference (memory unit suffixes) — https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis DEBUG command security advisory (GHSA-px78-xgh7-74fw) — https://github.com/redis/redis/security/advisories/GHSA-px78-xgh7-74fw
- Redis MEMORY USAGE command documentation — https://redis.io/docs/latest/commands/memory-usage/
- Redis OBJECT command documentation — https://redis.io/docs/latest/commands/object-encoding/

## Issues Found

1. **Scan pipeline missing key names (lines 67-69)**: The `--scan` pipeline that estimates key sizes piped output through `sort -n | tail -20`, but only printed the byte count from `MEMORY USAGE` without the key name. This made the output useless for identifying which keys are largest. Fixed by capturing the byte count into a variable and echoing both the count and the key name.

2. **`DEBUG OBJECT` replaced with standard OBJECT commands (line 78)**: `DEBUG OBJECT` is disabled by default in Redis 7.0+ (requires `enable-debug-command` configuration due to security advisory GHSA-px78-xgh7-74fw). Replaced with `OBJECT FREQ` and `OBJECT IDLETIME`, which are standard commands available without special configuration and provide useful information for memory troubleshooting.

3. **Incorrect "virtual memory" terminology (line 96)**: The description of `mem_fragmentation_ratio` stated Redis was "holding more virtual memory than the actual data requires." The fragmentation ratio is `used_memory_rss / used_memory`, which measures RSS (resident set size / physical memory), not virtual memory. Fixed to say "the operating system has allocated more resident memory (RSS) to Redis than the data actually requires."

4. **Missing `redis-cli` prefix on EXPIRE command (line 121)**: The `EXPIRE mykey 86400` command was in a bash code block but lacked the `redis-cli` prefix, inconsistent with every other command in the post. Added `redis-cli` prefix.

## Review Notes
- The `volatile-lru` policy description ("Evict keys with TTLs first") is a reasonable shorthand but is slightly imprecise — it evicts keys that have an expire set using LRU approximation, not strictly "first" in any ordering sense.
- The `mem_fragmentation_ratio` metric includes not only fragmentation but also other process overheads (code, shared libraries, stack). For pure external fragmentation measurement, `allocator_frag_ratio` is more precise. This is a nuance beyond the scope of the post but worth noting.
- The `CONFIG SET maxmemory 4gb` command uses binary gigabytes (4 GiB = 4 * 1024^3 bytes). Redis also supports `4g` for decimal gigabytes (4 * 10^9 bytes). The distinction is minor but worth knowing.
- The Python monitoring script uses `used_memory_human` and `used_memory_peak_human` which return string values (e.g., "1.50G"). This works for display purposes as shown.
