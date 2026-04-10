# Validation Summary: How to Tune Redis for High-Memory Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (7.0+ configuration directives, including listpack-based settings)

## Sources Consulted
- Redis official documentation on memory optimization: https://redis.io/docs/management/optimization/memory-optimization/
- Redis official documentation on configuration: https://redis.io/docs/management/config/
- Redis default redis.conf file (comments document all directives and valid values)
- Redis official documentation on eviction policies: https://redis.io/docs/reference/eviction/
- Redis official documentation on active defragmentation: https://redis.io/docs/management/optimization/memory-optimization/#active-defragmentation
- Redis official documentation on lazy freeing: https://redis.io/docs/management/optimization/lazy-freeing/

## Issues Found
1. **Duplicate/invalid active defrag directive**: The active defragmentation config block contained both `activedefrag yes` and `active-defrag-enabled yes`. The valid Redis config directive is `activedefrag yes`. The `active-defrag-enabled` directive does not exist in Redis configuration. Removed the invalid `active-defrag-enabled yes` line.

## Review Notes
- The post uses Redis 7.0+ config directive names (`hash-max-listpack-entries`, `zset-max-listpack-entries`, `list-max-listpack-size`) which replaced the older `ziplist`-based names. This is correct and current.
- The `hash-max-listpack-value 64` and `zset-max-listpack-value 64` values shown are the Redis defaults. The post says "raise thresholds" but only the entries thresholds (256 vs default 128) are actually raised above defaults. The configuration is valid, but readers may be slightly misled into thinking both values are raised.
- The fragmentation ratio threshold of 1.5 is a reasonable and commonly cited guideline, though it is a rule of thumb rather than an official Redis recommendation.
- Active defragmentation requires Redis to be compiled with jemalloc (the default). This is not mentioned in the post but is worth noting for readers using custom builds.
