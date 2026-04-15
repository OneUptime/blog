# Validation Summary: How to Configure ClickHouse Max Concurrent Queries

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server configuration, concurrency settings)
- Python (clickhouse-connect client library)
- XML (ClickHouse server and user configuration files)
- SQL (system table queries for monitoring)

## Sources Consulted
- [ClickHouse Server Settings documentation](https://clickhouse.com/docs/operations/server-configuration-parameters/settings) — verified max_concurrent_queries, max_concurrent_insert_queries, max_concurrent_select_queries, max_waiting_queries
- [ClickHouse system.processes documentation](https://clickhouse.com/docs/operations/system-tables/processes) — verified column names
- [ClickHouse system.metric_log documentation](https://clickhouse.com/docs/operations/system-tables/metric_log) — verified table schema and column naming convention
- [ClickHouse system.metrics documentation](https://clickhouse.com/docs/operations/system-tables/metrics) — verified Query metric existence
- [ClickHouse HTTP Interface documentation](https://clickhouse.com/docs/interfaces/http) — verified HTTP error status codes
- [ClickHouse v23.11 Changelog / PR #53285](https://github.com/ClickHouse/ClickHouse/pull/53285) — default max_concurrent_queries changed from 100 to 1000
- [ClickHouse PR #32609](https://github.com/ClickHouse/ClickHouse/pull/32609) — introduction of max_concurrent_insert_queries and max_concurrent_select_queries
- [ClickHouse PR #61053](https://github.com/ClickHouse/ClickHouse/pull/61053) — introduction of max_waiting_queries in v24.2

## Issues Found

1. **Default value of max_concurrent_queries was outdated**: The post stated the default is `100`. This was changed to `1000` in ClickHouse 23.11 (PR #53285). Updated the text to reflect the current default and note the version where it changed.

2. **max_waiting_queries version was incorrect**: The post stated "In ClickHouse 24.3+" but `max_waiting_queries` was introduced in ClickHouse 24.2 (PR #61053, merged March 2024). Corrected to "In ClickHouse 24.2+".

3. **system.metric_log query used wrong column names**: The post queried `WHERE metric = 'Query'` and `max(value)`, implying the table has generic `metric` and `value` columns. In reality, `system.metric_log` uses wide-format columns where each metric is its own column (e.g., `CurrentMetric_Query`). Fixed the query to use `max(CurrentMetric_Query)` and removed the invalid WHERE clause.

4. **HTTP status code was incorrect**: The post claimed ClickHouse returns HTTP 503 when rejecting queries due to concurrency limits. ClickHouse's HTTP interface returns HTTP 500 for most server errors, including `TOO_MANY_SIMULTANEOUS_QUERIES` (error code 202). Changed to "an HTTP error (typically 500)".

## Review Notes
- The sizing formula and example calculation are reasonable practical guidance, though actual optimal values depend heavily on workload characteristics.
- The Python retry example is functional and uses a sound exponential backoff pattern. The `clickhouse_connect` library is a current, maintained client.
- The mermaid flowchart accurately represents the query admission flow (global check first, then type-specific checks), though it omits `max_concurrent_queries_for_all_users` which is an additional check in the full admission path.
- The per-user `max_concurrent_queries_for_user` setting and its placement in `users.xml` profiles is correct.
