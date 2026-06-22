# Validation Summary: How to Build a Real-Time Analytics Dashboard with ClickHouse

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ClickHouse
- MergeTree, SummingMergeTree, ReplacingMergeTree, Kafka table engine, projections, query cache, sampling
- Apache Kafka
- Python
- clickhouse-connect
- FastAPI
- WebSockets
- React
- Recharts

## Sources Consulted
- ClickHouse MergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse SummingMergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse Kafka table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse INSERT documentation: https://clickhouse.com/docs/sql-reference/statements/insert-into
- ClickHouse Python client inserting documentation: https://clickhouse.com/docs/integrations/language-clients/python/advanced-inserting
- ClickHouse asynchronous inserts documentation: https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse query cache documentation: https://clickhouse.com/docs/operations/query-cache
- ClickHouse SAMPLE clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/sample
- ClickHouse projections documentation: https://clickhouse.com/docs/sql-reference/statements/alter/projection
- ClickHouse system.processes documentation: https://clickhouse.com/docs/operations/system-tables/processes
- FastAPI WebSocket documentation: https://fastapi.tiangolo.com/advanced/websockets/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow

## Issues Found
- The direct insert example passed `None` for `event_id` while `event_id` is a non-nullable UUID with a default expression. ClickHouse defaults are applied when the column is omitted, not when `NULL` is inserted unless `insert_null_as_default` is enabled. Removed `event_id` from the insert column list so `DEFAULT generateUUIDv4()` is used.
- The Python examples used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)` and updated imports.
- The FastAPI endpoint parameters allowed `None` defaults but were typed as plain `datetime`. Updated them to `Optional[datetime]` to match the actual API contract.
- The `SAMPLE 0.01` query required a sampling expression on the MergeTree table. Added `SAMPLE BY intHash64(user_id)` and included the expression in the sorting key, as required by ClickHouse.
- The query cache example used `now()`, and ClickHouse does not cache queries with non-deterministic current time functions by default. Replaced the rolling window with fixed timestamp bounds.
- The resource usage query labeled a count of recent query starts as concurrent queries. Replaced it with a `system.processes` query that reports currently running dashboard queries.

## Review Notes
The examples are accurate as a tutorial baseline. In a production system, the primary key should be chosen around the most common dashboard filters, and aggregate materialized views should be paired with explicit example queries using `sum()` and `uniqMerge()` when reading the pre-aggregated state columns.
