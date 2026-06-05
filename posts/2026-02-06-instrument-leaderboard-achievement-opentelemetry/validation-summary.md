# Validation Summary: How to Instrument Leaderboard and Achievement System Write and Query Latency

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Redis sorted sets
- redis-py sorted set commands
- Python
- SQL upserts

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- Redis ZRANGE command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis ZREVRANGE command documentation: https://redis.io/docs/latest/commands/zrevrange/
- Redis ZREVRANK command documentation: https://redis.io/docs/latest/commands/zrevrank/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The leaderboard query examples used `redis_client.zrevrange(...)`. Redis marks `ZREVRANGE` as deprecated as of Redis 6.2.0 and recommends `ZRANGE` with reverse ordering for new code. Updated both examples to use `redis_client.zrange(..., desc=True, withscores=True)`, which matches redis-py's current `zrange` API.
- The `get_rank_around_player` example returned early when a player was not ranked without recording query latency. Added latency recording and the span latency attribute before returning so the query path is consistently instrumented.
- The achievement evaluation example counted every complete achievement as newly unlocked on later matching events. Added a transition check from incomplete to complete before appending to `newly_unlocked` and incrementing `achievements.unlocks`.

## Review Notes
The OpenTelemetry histogram, counter, observable gauge, span, and attribute APIs used in the post are current and syntactically valid. The examples still use high-cardinality identifiers such as `leaderboard.id`, `player.id`, and `achievement.id` as telemetry attributes; that can be useful for debugging but should be bounded or sampled carefully in production metric streams.
