# Validation Summary: How to Implement Redis Active Defragmentation

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Redis (4.0+, focus on 6.0+)
- jemalloc memory allocator
- redis-cli (CONFIG SET, INFO memory, INFO server)
- redis.conf configuration
- Prometheus (for alert example)

## Sources Consulted
- Official Redis documentation on memory optimization and defragmentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Default `redis.conf` reference (Redis 7.x): https://raw.githubusercontent.com/redis/redis/7.4/redis.conf
- Redis source code (`src/defrag.c`, `src/server.c`) for activation logic and trigger conditions
- Redis INFO command reference: https://redis.io/commands/info/
- jemalloc allocator documentation

## Issues Found

1. **Misleading description of `active-defrag-threshold-upper`** (two places):
   - In the "Basic Configuration" block, the comment `# Stop defrag when fragmentation drops below 5%` next to `active-defrag-threshold-upper 100` was incorrect. The 100 value has nothing to do with a 5% stop threshold and `threshold-upper` is not a stopping condition.
   - In the "Thresholds" table inside "Configuration Parameters Deep Dive", the row for `active-defrag-threshold-upper` said "Stop defrag when ratio drops below this %", which is also wrong.
   - Per the official `redis.conf`, `active-defrag-threshold-upper` is the "Maximum percentage of fragmentation at which we use maximum effort" — it controls CPU-effort scaling (consistent with the "CPU Effort Scaling" mermaid diagram later in the same post), not a stop condition. Defrag actually stops when fragmentation drops below `active-defrag-threshold-lower`.
   - Fixed: replaced the comment with `# Use maximum CPU effort once fragmentation reaches 100%` and updated the table cell to `Fragmentation % at which maximum CPU effort is used`.

## Review Notes
- All listed Redis INFO fields (`used_memory`, `used_memory_rss`, `mem_fragmentation_ratio`, `mem_fragmentation_bytes`, `allocator_frag_ratio`, `allocator_frag_bytes`, `active_defrag_running`, `active_defrag_hits`, `active_defrag_misses`, `active_defrag_key_hits`, `active_defrag_key_misses`) are valid and match the live INFO output.
- Default values listed for `active-defrag-ignore-bytes` (100mb), `active-defrag-threshold-lower` (10), `active-defrag-threshold-upper` (100), `active-defrag-cycle-min` (1), `active-defrag-cycle-max` (25), and `active-defrag-max-scan-fields` (1000) match current Redis 7.x defaults.
- Statement that active defragmentation was introduced in Redis 4.0 is correct; 6.0+ stability recommendation is reasonable since the feature received significant fixes between 4.0 and 6.0.
- The activation rule (`mem_fragmentation_bytes` > `active-defrag-ignore-bytes` AND ratio > 1 + lower/100) is a slight simplification — internally Redis compares `allocator_frag_smallbins_bytes` against `active-defrag-ignore-bytes` and uses the allocator fragmentation percentage rather than `mem_fragmentation_ratio` (which includes RSS overhead outside the allocator's control). The blog's wording is close enough for a tutorial and was left unchanged.
- `mem_allocator` does appear in the Server section of INFO, so `redis-cli INFO server | grep mem_allocator` works as shown.
- The Prometheus metric `redis_memory_fragmentation_ratio` matches the field exposed by the common `oliver006/redis_exporter`.
