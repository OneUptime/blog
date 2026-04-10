# Validation Summary: How to Build a Patient Queue System with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, Pub/Sub, pipelines)
- Python 3 (type hints, union types with `|`)
- redis-py client library

## Sources Consulted
- Redis ZADD documentation: https://redis.io/commands/zadd — verified XX flag behavior and mapping syntax
- Redis ZPOPMIN documentation: https://redis.io/commands/zpopmin — confirmed atomic pop of lowest-scored member, return format
- Redis ZRANGE documentation: https://redis.io/commands/zrange — confirmed ascending sort order, withscores option
- Redis PUBLISH documentation: https://redis.io/commands/publish — confirmed channel/message syntax
- redis-py source and documentation: https://redis-py.readthedocs.io — verified Python client method signatures for `zadd`, `zpopmin`, `zrange`, `pipeline`, `publish`, and `Redis` constructor
- IEEE 754 double-precision float specification — verified score precision is sufficient for composite triage+timestamp values

## Issues Found
No technical issues found.

## Review Notes
- The composite score formula `TRIAGE_SCORES[level] + (arrived_at % 10000) / 100000` is well-designed: triage levels occupy non-overlapping score bands (e.g., Level 1 in [10.0, 10.1), Level 2 in [20.0, 20.1)), so priority ordering is always preserved.
- If two patients register at the exact same microsecond with the same triage level, their scores will collide. Redis then orders lexicographically by member name (UUID prefix), which is arbitrary but deterministic. This is acceptable for the use case.
- The `dict | None` return type annotation on `call_next_patient` requires Python 3.10+. This is a minor version dependency not mentioned in the post, but is now standard practice.
- The `publish` call in `register_patient` is outside the pipeline, so it is not atomic with the SET+ZADD. This is fine since Pub/Sub is fire-and-forget by nature and doesn't need transactional guarantees with the data writes.
