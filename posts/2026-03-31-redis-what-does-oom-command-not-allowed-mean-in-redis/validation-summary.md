# Validation Summary: What Does 'OOM command not allowed' Mean in Redis

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (memory management, maxmemory, eviction policies)
- redis-cli (INFO, CONFIG, SCAN, DEL, EXPIRE, OBJECT commands)
- Python redis-py client library
- Prometheus alerting rules (redis_exporter metrics)

## Sources Consulted
- Redis official documentation on memory optimization: https://redis.io/docs/latest/operate/server/memory-management/
- Redis redis.conf annotated configuration (unit suffixes section): documents `k`/`kb`, `m`/`mb`, `g`/`gb` — no `b` suffix
- Redis source code `bytesToHuman` function for human-readable memory formatting thresholds
- Redis eviction policies documentation: https://redis.io/docs/latest/develop/reference/eviction/
- oliver006/redis_exporter Prometheus metric names

## Issues Found

1. **Incorrect `used_memory_human` value in example output**: The example showed `used_memory_human:1024.00M` for `used_memory:1073741824` (exactly 1 GB). Redis's `bytesToHuman` function formats values >= 1 GiB using the `G` suffix, so the correct display is `1.00G`. Fixed to `used_memory_human:1.00G`.

2. **Invalid `b` memory unit suffix**: The post stated "Use units: `b` (bytes), `kb`, `mb`, `gb`." Redis does not support a `b` suffix for bytes — you simply use the raw number without a suffix. Valid suffixes are `k`/`kb`, `m`/`mb`, `g`/`gb`. Fixed to: "Use units: `kb`, `mb`, `gb` (or `k`, `m`, `g` for SI units), or specify the value in bytes without a suffix."

## Review Notes
- The Prometheus alert uses `redis_config_maxmemory` as the metric name. While this metric does exist in the oliver006/redis_exporter, the more commonly documented metric is `redis_memory_max_bytes`. Both are valid, so this was not changed, but users may need to adjust the metric name depending on their exporter configuration.
- The distinction between SI units (`k`=1000, `m`=1000000, `g`=1000000000) and binary units (`kb`=1024, `mb`=1048576, `gb`=1073741824) in Redis config is not mentioned in the post. This is a minor omission that won't cause practical issues for most users.
- All 8 eviction policies listed in the table are correct and complete for Redis 4.0+ (LFU policies were added in 4.0).
- The Python redis-py script for bulk TTL setting is correct and uses proper SCAN-based iteration.
- The `xargs redis-cli DEL` pattern for bulk deletion is functional but could have issues with keys containing special characters; acceptable for a blog example.
