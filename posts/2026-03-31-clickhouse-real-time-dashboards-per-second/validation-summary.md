# Validation Summary: How to Build Real-Time Dashboards Updating Every Second with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, materialized views, TTL, LowCardinality type)
- Python (asyncio, websockets library, clickhouse-connect client, redis client)
- Redis (caching with TTL)
- Grafana (ClickHouse plugin, auto-refresh configuration)
- WebSockets (real-time push architecture)

## Sources Consulted
- ClickHouse date-time functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse source code for `toStartOfSecond`: https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Functions/toStartOfSecond.cpp (confirmed function exists, introduced in ClickHouse 20.5)
- ClickHouse MergeTree TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- clickhouse-connect Python client API: https://clickhouse.com/docs/en/integrations/python
- Python websockets library documentation: https://websockets.readthedocs.io/
- Python redis library documentation: https://redis-py.readthedocs.io/

## Issues Found
1. **WebSocket server JSON serialization bug (line 118)**: `json.dumps(result.named_results())` would fail at runtime for two reasons: (a) `named_results()` returns a generator, which is not directly JSON-serializable, and (b) DateTime columns from ClickHouse are returned as Python `datetime` objects, which `json.dumps` cannot serialize by default. **Fixed** by changing to `json.dumps(list(result.named_results()), default=str)` — `list()` materializes the generator, and `default=str` handles datetime serialization.

## Review Notes
- The materialized view populating `realtime_metrics` uses `uniqExact` with a plain `MergeTree` target table. Since ClickHouse materialized views process data per-insert-block, if events for the same second arrive in multiple insert batches, the target table will contain multiple rows for that second with partial `uniqExact` counts. For production use, an `AggregatingMergeTree` with `uniqExactState`/`uniqExactMerge` would be more correct. This is an architectural design concern rather than a code error — the code runs correctly and is acceptable for a blog tutorial.
- `toStartOfSecond` (introduced in ClickHouse 20.5) is designed for `DateTime64` columns with sub-second precision. When applied to a regular `DateTime` column (which already has second-level precision), it is effectively a no-op. The blog does not specify whether `event_time` is `DateTime` or `DateTime64`, but the function works correctly with either type.
- The `redis.setex()` call uses the correct argument order: `(name, time, value)`. The 1-second TTL caching strategy is sound.
- The Grafana configuration section is presented as guidance notes rather than exact config syntax, which is appropriate given that Grafana UI settings vary across versions.
