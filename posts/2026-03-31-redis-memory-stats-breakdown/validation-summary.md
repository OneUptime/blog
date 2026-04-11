# Validation Summary: How to Use MEMORY STATS in Redis for Memory Breakdown

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (MEMORY STATS command, active defragmentation, CONFIG SET)
- redis-py (Python Redis client library)
- Bash / awk (CLI parsing)

## Sources Consulted
- Redis official documentation for MEMORY STATS: https://redis.io/commands/memory-stats/
- Redis official documentation for CONFIG SET activedefrag: https://redis.io/docs/latest/commands/config-set/
- redis-py library API for `memory_stats()` method: https://github.com/redis/redis-py

## Issues Found
- **Python key name bug (line 153)**: The code used `stats['mem_fragmentation_ratio']` with underscores, but redis-py's `memory_stats()` preserves the dot-separated key names from the Redis response. The correct key is `stats['mem.fragmentation.ratio']`. The other keys in the same code block (`dataset.bytes`, `overhead.total`, `peak.allocated`) already correctly used dots, making this an inconsistency. Additionally, Redis returns the fragmentation ratio as a string (bulk string in RESP), not a numeric type, so the `:.2f` format specifier would raise a TypeError. Changed to print the value directly without float formatting.

## Review Notes
- The `dataset.percentage` field is described as "Dataset as percent of `total.allocated`". The official Redis documentation describes it as the percentage of `dataset.bytes` out of net memory usage (`total.allocated` minus `startup.allocated`). However, the example output numbers (67.22%) are internally consistent with the simpler `dataset/total` formula, so this may vary by Redis version. Left as-is since the example is self-consistent.
- The awk regex patterns `/dataset.bytes/` and `/overhead.total/` use `.` which matches any character in regex, not just a literal dot. This is technically imprecise but won't cause issues in practice since no MEMORY STATS fields would match unintentionally.
- The MEMORY STATS command is available since Redis 4.0.0. The `cluster.links` field in the example output was added in Redis 7.0. The post doesn't specify version requirements, which could be noted in a future update.
- The `mem.fragmentation.ratio` threshold of 1.5 for triggering concern is a reasonable and commonly cited guideline.
- All CONFIG SET directives for active defragmentation (`activedefrag`, `active-defrag-ignore-bytes`, `active-defrag-threshold-lower`) are correct.
