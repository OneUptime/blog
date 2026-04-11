# Validation Summary: How to Build an IoT Alert System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (HSET, SET with NX/EX, ZADD, ZREMRANGEBYSCORE, PUBLISH/SUBSCRIBE)
- Python (redis-py client library)
- Redis Pub/Sub for alert routing
- Redis sorted sets for alert history
- Redis key TTL for deduplication and acknowledgment

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/ — verified NX and EX options
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/ — verified multi-field syntax (supported since Redis 4.0)
- Redis ZADD command documentation: https://redis.io/docs/latest/commands/zadd/ — verified mapping syntax
- Redis ZREMRANGEBYSCORE documentation: https://redis.io/docs/latest/commands/zremrangebyscore/ — verified `-inf` usage
- Redis PUBLISH documentation: https://redis.io/docs/latest/commands/publish/
- redis-py documentation: https://redis-py.readthedocs.io/ — verified `set()` with `nx` and `ex` parameters, `pubsub()` API, `zadd()` mapping format

## Issues Found

### 1. Security vulnerability: `eval()` used to deserialize Pub/Sub messages
- **What was wrong:** The `alert_router` function used `eval(message["data"].decode())` to parse incoming alert events. `eval()` executes arbitrary Python code and is a serious security risk, even for internal systems.
- **What was changed:** Replaced `eval()` with `json.loads()` for safe JSON deserialization. The `json` module was already imported in that code block but was unused.
- **Why:** `json.loads()` safely parses JSON strings without executing arbitrary code.

### 2. Incorrect serialization with `str()` instead of `json.dumps()`
- **What was wrong:** The `fire_alert` function used `str(alert_event)` to serialize the alert event before publishing. Python's `str()` produces a repr format with single quotes (e.g., `{'key': 'value'}`), which is not valid JSON and would fail with `json.loads()`.
- **What was changed:** Added `import json` and replaced `str(alert_event)` with `json.dumps(alert_event)` to produce proper JSON output that pairs correctly with the `json.loads()` call on the subscriber side.
- **Why:** JSON is the standard interchange format and ensures correct round-trip serialization/deserialization.

## Review Notes
- The post tags include "Lua" but no Lua scripting examples are present in the content. This is a metadata inconsistency but does not affect technical correctness.
- The `get_rules_for_metric()` function is referenced but not defined. This is acceptable for a tutorial that focuses on the alert logic rather than rule retrieval, but readers may benefit from a brief note on implementation.
- The `is_acknowledged()` function is defined but never integrated into `evaluate_reading()`. Readers will need to wire this in themselves.
- All Redis commands and redis-py API usage is correct and current.
