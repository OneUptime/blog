# Validation Summary: How to Monitor Redis Pub/Sub Channel Activity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (PUBSUB commands: CHANNELS, NUMSUB, NUMPAT, SHARDCHANNELS, SHARDNUMSUB)
- redis-py (Python Redis client library)
- prometheus_client (Python Prometheus client library)
- Redis CLI

## Sources Consulted
- Redis official documentation for PUBSUB commands: https://redis.io/docs/latest/commands/pubsub-channels/, https://redis.io/docs/latest/commands/pubsub-numsub/, https://redis.io/docs/latest/commands/pubsub-numpat/
- redis-py source code (`redis/commands/core.py` and `redis/_parsers/helpers.py`) for API method signatures and return types
- Redis official documentation for PUBSUB SHARDCHANNELS and SHARDNUMSUB (Redis 7.0+)

## Issues Found

### 1. `pubsub_numsub()` return type handled incorrectly (Steps 4 and 8) — HIGH
**What was wrong:** The code iterated over the `pubsub_numsub()` result as a flat list with index stepping by 2 (`counts[i]`, `counts[i+1]`). In redis-py, the response parser (`parse_pubsub_numsub`) converts the raw Redis response into a list of `(channel, count)` tuples, not a flat list.

**What was changed:** Replaced flat-list index iteration with tuple unpacking (`for channel, count in counts:`). Fixed in both the monitoring script (Step 4) and the Prometheus integration (Step 8).

### 2. Misleading claim about orphaned subscribers consuming memory (Step 6) — MEDIUM
**What was wrong:** The text stated orphaned subscribers stay "connected, consuming memory." Redis Pub/Sub is fire-and-forget — if a publisher stops, no messages accumulate in the subscriber's buffer. An idle subscriber uses only minimal connection overhead, not meaningful memory.

**What was changed:** Changed "consuming memory" to "holding an idle connection" to accurately describe the resource impact.

### 3. Race condition in `verify_channel` (Step 7) — LOW
**What was wrong:** The code called `pubsub.subscribe(channel)` and immediately published on a separate connection. In redis-py, `subscribe()` sends the command but does not wait for the server's acknowledgment. The PUBLISH could theoretically be processed by Redis before the SUBSCRIBE, causing the health check message to be lost.

**What was changed:** Added `pubsub.get_message(timeout=1)` after subscribing to consume the subscribe confirmation message, ensuring the subscription is fully active before publishing.

## Review Notes
- The `PUBSUB CHANNELS` glob pattern `events.*` is correct — Redis uses glob-style patterns where `.` is literal and `*` matches any sequence of characters.
- The `PUBSUB SHARDCHANNELS` and `PUBSUB SHARDNUMSUB` version attribution (Redis 7.0+) is accurate.
- The `MONITOR` command performance warning is appropriate — it should only be used in development.
- The `log_publish_rates` function in Step 5 has a thread-safety concern (clearing `publish_counts` while potentially being written to by `publish_with_tracking`), but this is acceptable for a conceptual example.
