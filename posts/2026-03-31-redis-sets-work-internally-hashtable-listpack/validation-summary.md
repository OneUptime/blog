# Validation Summary: How Redis Sets Work Internally (Hashtable and Listpack)

## Status
validated

## Post Type
Tutorial / Technical Deep-Dive

## Technologies Covered
- Redis (sets data structure, internal encodings)
- Redis configuration parameters (`set-max-listpack-entries`, `set-max-listpack-value`, `set-max-intset-entries`)
- Python redis-py client library

## Sources Consulted
- Redis 7.4 source code: `src/t_set.c`, `src/intset.c`, `src/dict.c` (https://github.com/redis/redis)
- Redis 7.2 default `redis.conf` configuration file (https://github.com/redis/redis/blob/7.2/redis.conf)
- Redis official documentation on SET data type (https://redis.io/docs/data-types/sets/)
- Redis official documentation on OBJECT ENCODING command (https://redis.io/commands/object-encoding/)

## Issues Found

1. **Wrong config parameter name `set-max-listpack-size`** (appeared 3 times): The correct Redis configuration parameter is `set-max-listpack-entries`, not `set-max-listpack-size`. The parameter `set-max-listpack-size` does not exist in Redis. Fixed all three occurrences: in the CONFIG GET example (line 32), the CONFIG SET example (line 89), and the Summary section (line 127).

2. **Missing `set-max-listpack-value` config reference**: The post mentioned that "Element values must also be under 64 bytes" but did not name the actual configuration parameter `set-max-listpack-value` that controls this threshold. Since the post is about tuning thresholds, this is an important omission. Added a `CONFIG GET set-max-listpack-value` example alongside `set-max-listpack-entries`, and added `set-max-listpack-value` to the Summary paragraph.

## Review Notes
- The section title "The Two Set Encodings" is slightly misleading since the post later reveals three encodings (intset, listpack, hashtable). This appears to be an intentional narrative choice ("There is actually a third encoding...") so it was left as-is.
- The hashtable resize thresholds (grow at load factor > 1.0, shrink at load factor < 0.1) are accurate for Redis 7.2. Note that in newer Redis versions (8.0+), the shrink threshold constant `HASHTABLE_MIN_FILL` may have changed from 10 to 8 (i.e., shrink at ~12.5% instead of 10%).
- The intset description (sorted array, binary search, O(log n) lookup) is confirmed correct from `src/intset.c`.
- The encoding transition behavior (intset -> listpack if small enough, otherwise -> hashtable) is accurately described.
- All Redis commands (`SADD`, `OBJECT ENCODING`, `CONFIG GET/SET`, `SINTER`, `SISMEMBER`) are used correctly.
- The Python redis-py code examples use valid API calls (`sadd`, `memory_usage`).
