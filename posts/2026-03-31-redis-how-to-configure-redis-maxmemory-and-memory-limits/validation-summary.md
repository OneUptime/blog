# Validation Summary: How to Configure Redis maxmemory and Memory Limits

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (maxmemory directive, eviction policies, LFU/LRU configuration)
- redis-cli (CONFIG SET, CONFIG GET, INFO commands)
- Python (redis-py client library for memory monitoring)
- Docker / Docker Compose (Redis container configuration)

## Sources Consulted
- Redis official documentation on memory optimization: https://redis.io/docs/management/optimization/memory-optimization/
- Redis official documentation on eviction policies: https://redis.io/docs/reference/eviction/
- Redis official configuration file (redis.conf) comments for unit suffixes, lfu-decay-time, lfu-log-factor
- Redis INFO command documentation: https://redis.io/commands/info/
- Redis CONFIG SET documentation: https://redis.io/commands/config-set/
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **Incorrect `b` suffix claim (line 35)**: The post stated that `b` (bytes) is a supported suffix for memory values. Redis does not recognize `b` as a suffix — a plain number without any suffix is interpreted as bytes. Additionally, the post omitted the SI-style suffixes `k`, `m`, `g` (which use powers of 1000) that Redis also supports. Fixed to list all valid suffixes with their meanings and note that suffixes are case-insensitive.

2. **Misleading `lfu-log-factor` comment (line 98)**: The inline comment read "higher = less precision but tracks wider range." This is inaccurate. A higher `lfu-log-factor` means more hits are needed to saturate the frequency counter, which provides *better differentiation* among frequently accessed keys, not less precision. Fixed the comment to accurately describe the behavior.

3. **Typo in summary (line 182)**: "keyed with expiration times" was a typo for "keys with expiration times." Fixed.

## Review Notes
- The eviction policy table is complete and accurate for Redis 4.0+ (which introduced LFU policies).
- The Python code correctly uses `r.info("memory")` and `r.info("stats")` to access the relevant fields, and the logic is sound.
- The `mem_fragmentation_ratio` thresholds (> 1.5 for high fragmentation, < 1.0 for swapping) are reasonable rules of thumb, though actual thresholds may vary by workload.
- The Docker Compose example uses `redis:7-alpine`, which is current. The command-line flags shown are correct for passing config at startup.
- The `maxmemory 0` default behavior description is accurate for 64-bit systems. On 32-bit systems, there is an implicit 3GB limit, but this edge case is rarely relevant today and omitting it is reasonable.
