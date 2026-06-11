# Validation Summary: How to Build Redis Key Eviction Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (eviction policies, maxmemory, LRU/LFU, INFO command, CONFIG SET)
- redis-py (Python Redis client)
- Bash scripting (for monitoring)
- Prometheus (alert rules / redis_exporter metrics)

## Sources Consulted
- Redis official documentation on key eviction: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/lfu/
- Redis docs on eviction policies: https://redis.io/docs/latest/develop/reference/eviction/
- Redis OBJECT command reference: https://redis.io/commands/object-freq/ and https://redis.io/commands/object-idletime/
- Redis CONFIG SET / configuration directives reference
- redis-py client library documentation (Redis.setex, Redis.set, exceptions.ResponseError)
- Prometheus redis_exporter metric names (oliver006/redis_exporter)

## Issues Found

1. **Incorrect description of `lfu-decay-time 0`** — The post originally claimed `lfu-decay-time 0` means "No decay (counter only increases)". According to the Redis documentation, a value of 0 means the special behavior: "always decay the counter every time it is scanned" — which is the opposite (aggressive decay, not no decay). Updated the comment to: "Special value: decay the counter every time it is scanned (aggressive decay)".

2. **Incorrect LFU log factor estimate for factor=1** — The table claimed `~510` hits to reach the max counter (255) for `lfu-log-factor 1`. Per the Redis docs reference table, with factor=1 the counter reaches 49 at 1000 hits and 255 at 100,000 hits. The mathematical expectation (sum of v+1 from v=0 to 254) is ~32K, with the Redis docs table showing saturation around 100K. Changed `~510` to `~100 thousand` to align with the documented table.

## Review Notes

- The eight eviction policy names and behaviors (noeviction, allkeys-lru, volatile-lru, allkeys-lfu, volatile-lfu, allkeys-random, volatile-random, volatile-ttl) are all correct.
- Default values cited (maxmemory-samples 5, lfu-log-factor 10, lfu-decay-time 1) match Redis defaults.
- The OOM error message format `(error) OOM command not allowed when used memory > 'maxmemory'.` matches actual Redis output.
- `OBJECT FREQ` correctly noted as only working under LFU policies. `OBJECT IDLETIME` is similarly restricted to non-LFU policies, but this caveat is not mentioned in the post — not technically wrong, just an omission worth noting.
- The redis-py code examples (`r.setex`, `r.set`, `r.get`, `r.incr`, `redis.exceptions.ResponseError`) all use correct API surface and parameter order.
- `CONFIG SET maxmemory 4gb` with human-readable units works in Redis 7.0+; older versions required bytes. Post doesn't specify version, but this is fine for modern Redis.
- The rate-limiter example contains an inherent race condition between GET and INCR — but it's illustrating eviction policy usage, not production-ready rate limiting, so not flagged.
- Active defragmentation config directives (`activedefrag`, `active-defrag-ignore-bytes`, `active-defrag-threshold-lower`, `active-defrag-threshold-upper`) are valid Redis 4.0+ directives.
- Prometheus metric names referenced (`redis_memory_used_bytes`, `redis_memory_max_bytes`, `redis_evicted_keys_total`) match the standard oliver006/redis_exporter naming.
