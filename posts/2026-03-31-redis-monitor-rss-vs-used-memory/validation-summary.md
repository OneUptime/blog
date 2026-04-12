# Validation Summary: How to Monitor Redis RSS vs Used Memory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (INFO memory, INFO stats, INFO persistence, MEMORY STATS, BGSAVE)
- Python (redis-py client library)
- Bash (redis-cli, watch, grep)

## Sources Consulted
- Redis official documentation for INFO command sections (memory, stats, persistence)
- Redis official documentation for `mem_fragmentation_ratio`, `used_memory`, `used_memory_rss`
- Redis official documentation for `instantaneous_ops_per_sec` vs `total_commands_processed`
- redis-py library documentation for `info()` method

## Issues Found

1. **Wrong INFO section in BGSAVE watch command** (line 86): The command `redis-cli INFO memory | grep -E "used_memory_rss|rdb_bgsave_in_progress"` would never match `rdb_bgsave_in_progress` because that field is in the `persistence` section, not `memory`. Fixed by changing to `redis-cli INFO` (no section filter) so grep can find fields from both sections.

2. **Cumulative counter used as a rate** (line 99): `total_commands_processed` is a monotonically increasing lifetime counter, not a per-second rate. Using it to estimate `writes_per_sec` would produce an ever-growing nonsensical number. Fixed by replacing with `instantaneous_ops_per_sec`, which is the actual per-second operation rate from the `stats` section.

## Review Notes
- The COW spike estimate function uses a magic number `200` (bytes per object) which is a rough heuristic. The code acknowledges it's an estimate, so this is acceptable but readers should be aware it's very approximate.
- The `0.3` write ratio assumption (30% of ops are writes) is a reasonable default but varies greatly by workload. A more accurate approach would use `INFO commandstats` to measure the actual write ratio.
- The trend pattern "used_memory growing, rss stable -> Normal data growth" is slightly misleading; this pattern more accurately indicates the allocator is reusing previously fragmented memory. However, it's not strictly incorrect as a simplified explanation.
- Multi-section `INFO` (e.g., `INFO memory persistence`) is supported since Redis 7.0. The fix uses plain `INFO` for broader compatibility.
