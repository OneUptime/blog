# Validation Summary: What Is Redis Active Defragmentation

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (active defragmentation feature, available since Redis 4.0)
- jemalloc memory allocator
- Python redis-py client library

## Sources Consulted
- Official Redis configuration file documentation (redis.conf from stable branch) — https://redis.io/docs/latest/operate/oss_and_stack/management/config-file/
- Redis INFO command documentation — https://redis.io/docs/latest/commands/info/
- Redis CONFIG SET command documentation — https://redis.io/docs/latest/commands/config-set/

## Issues Found

### 1. Incorrect config parameter name `active-defrag-enabled` (Line 78)
- **What was wrong:** The post used `CONFIG SET active-defrag-enabled yes` to enable active defragmentation. The parameter `active-defrag-enabled` does not exist in Redis.
- **What was changed:** Replaced with `CONFIG SET activedefrag yes`, which is the correct parameter name (one word, no hyphens).
- **Why:** The correct Redis config parameter for enabling active defragmentation is `activedefrag`, as documented in the official redis.conf and CONFIG SET documentation.

### 2. Misleading comment in configuration block (Line 76)
- **What was wrong:** The comment `# Minimum fragmentation ratio to start defragmentation (default: 1.1)` was placed above `active-defrag-ignore-bytes`, which is about minimum bytes, not fragmentation ratio. The comment was confusing and didn't match the parameter it preceded.
- **What was changed:** Replaced with `# Configure active defragmentation thresholds and CPU usage`, which accurately describes the configuration block.
- **Why:** The original comment conflated the byte threshold with the percentage threshold, potentially misleading readers about what `active-defrag-ignore-bytes` controls.

## Review Notes
- The `active_defrag_running` field in INFO memory output is shown as `1` in the example. In Redis, this field actually reports the CPU percentage the defragmenter intends to use (0 when inactive, 1-25 by default when active), not a simple boolean. The value `1` is valid (meaning 1% CPU), but readers might interpret it as a boolean flag. This is a minor clarity issue, not an error.
- All default values in the configuration reference table are correct for Redis 7.x.
- The Python monitoring script is syntactically correct and uses valid redis-py API calls.
- The explanation of how active defragmentation works (incremental keyspace scanning, reallocation to contiguous regions) is technically accurate.
