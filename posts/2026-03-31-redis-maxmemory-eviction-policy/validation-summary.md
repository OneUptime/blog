# Validation Summary: How to Configure Redis maxmemory and Eviction Policy

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (core in-memory data store)
- Redis CONFIG SET / CONFIG GET commands
- Redis eviction policies (LRU, LFU, volatile, allkeys, noeviction)
- Redis INFO command (memory and stats sections)
- Redis LFU tuning parameters (lfu-decay-time, lfu-log-factor)

## Sources Consulted
- Redis official documentation on memory optimization: https://redis.io/docs/management/optimization/memory-optimization/
- Redis official documentation on eviction policies: https://redis.io/docs/reference/eviction/
- Redis official documentation on CONFIG SET/GET: https://redis.io/commands/config-set/
- Redis official documentation on LFU configuration: https://redis.io/topics/lru-cache
- Redis source code comments on lfu-decay-time behavior

## Issues Found
1. **Incorrect comment on `lfu-decay-time` (line 118)**: The post stated "Higher value = faster decay (more recent = more weight)". This is backwards. `lfu-decay-time` specifies the number of minutes that must elapse before the logarithmic frequency counter is decremented. A higher value means the counter decays **more slowly**, retaining frequency history longer. Fixed the comment to: "Higher value = slower decay (frequency counter retains history longer)".

## Review Notes
- All eight eviction policies listed are correct and complete for Redis 4.0+.
- The `maxmemory-samples` default of 5 and the claim that 10 approaches true LRU are consistent with Redis documentation.
- The CONFIG SET syntax with human-readable units (e.g., `512mb`, `1gb`) is correct for both redis.conf and runtime configuration.
- The 512mb = 536870912 bytes conversion is correct (Redis uses binary units: 512 × 1024 × 1024).
- The default of `noeviction` for `maxmemory-policy` is correct.
- The default of `0` (no limit) for `maxmemory` is correct for 64-bit systems; on 32-bit systems the implicit default is 3GB, but this edge case is not worth noting given modern deployments.
- INFO memory and INFO stats field names are all accurate.
