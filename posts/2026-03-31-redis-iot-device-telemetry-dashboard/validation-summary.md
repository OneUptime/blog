# Validation Summary: How to Build an IoT Device Telemetry Dashboard with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Sorted Sets, Sets, Pub/Sub, INCR, INCRBYFLOAT, SCAN)
- Python (redis-py client library)
- Redis CLI commands

## Sources Consulted
- Redis EXISTS command documentation: https://redis.io/commands/exists — confirms EXISTS takes exact key names, no pattern/glob support
- Redis SCAN command documentation: https://redis.io/commands/scan — confirms SCAN supports MATCH with glob-style patterns
- redis-py documentation: https://redis-py.readthedocs.io/ — verified `scan_iter`, `zadd`, `zremrangebyrank`, `zrangebyscore`, `hset`, `smembers`, `pipeline`, `pubsub` APIs
- Redis ZADD documentation: https://redis.io/commands/zadd — verified `{member: score}` mapping format in redis-py
- Redis ZREMRANGEBYRANK documentation: https://redis.io/commands/zremrangebyrank — verified negative index behavior for trimming sorted sets
- Redis HSET documentation: https://redis.io/commands/hset — verified `mapping` parameter support in redis-py 3.5+

## Issues Found
1. **`has_active_alert` function used `r.exists()` with a glob pattern (line 108)**: The Redis `EXISTS` command checks for exact key names and does not support glob/wildcard patterns. The original code `r.exists(f"alert:active:{device_id}:*")` would check for a key literally named `alert:active:<device_id>:*` instead of scanning for keys matching that pattern. Fixed by replacing with `r.scan_iter(match=..., count=100)` which correctly uses Redis SCAN with pattern matching to find any key matching the glob, returning `True` on the first match.

## Review Notes
- The `update_telemetry` function mutates the caller's `readings` dict by adding `"updated_at"`. This is a design choice rather than a bug, but callers should be aware of the side effect.
- The `fleet_snapshot` function iterates over a Python `set` (from `smembers`) twice — once for the pipeline loop and once for the zip. While iteration order over a Python set is consistent within a single execution (as long as the set is not modified), this is a CPython implementation detail rather than a language guarantee. For production code, converting to a list first would be more robust.
- The `telemetry_broadcaster` sends `message["data"]` (bytes) directly to WebSocket clients. Depending on the WebSocket library, this may need to be decoded to a string first. The post leaves the WebSocket framework unspecified, so this is acceptable for illustrative purposes.
- The `scan_iter` approach for alert checking is correct but may be slow if there are many keys in Redis. For production dashboards with high key counts, a dedicated set or hash tracking active alerts per device would be more performant. This is an architectural consideration beyond the scope of the tutorial.
