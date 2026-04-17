# Validation Summary: How to Build Custom Alerting Rules Over ClickHouse Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, data types)
- ClickHouse HTTP API
- Bash / curl
- Python 3 (urllib.parse)
- jq

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types (UUID, LowCardinality, Nullable, DateTime): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse aggregate functions (count, countIf, quantile, uniqExact/countDistinct): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse date/time functions (now, toYYYYMM, toDate, dateDiff): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse UUID functions (generateUUIDv4): https://clickhouse.com/docs/en/sql-reference/functions/uuid-functions
- ClickHouse HTTP interface and FORMAT / default_format: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse INTERVAL syntax: https://clickhouse.com/docs/en/sql-reference/operators#interval

## Issues Found
- **HTTP API default format mismatch**: The curl command in the "Scheduling Alert Checks" section piped ClickHouse's HTTP response to `jq '.data[]'`, but ClickHouse's HTTP interface returns TabSeparated by default. Without `FORMAT JSON` in the query or `default_format=JSON` as a URL parameter, `jq` would fail to parse the output. Added `default_format=JSON` to the query string so the example works as written.

## Review Notes
- All SQL table definitions (MergeTree, column types, PARTITION BY, ORDER BY) are syntactically valid in current ClickHouse releases.
- `quantile(0.99)(response_time_ms)` uses the correct ClickHouse parametric aggregate syntax.
- `countDistinct` is a valid alias for `uniqExact` in ClickHouse, though using `uniq` (approximate) or `uniqExact` directly is often preferred for clarity.
- `dateDiff('minute', ...)` works; ClickHouse also accepts `date_diff` and snake_case unit names.
- Minor naming inconsistency (not a technical error): the "Mean Time to Resolve" section names its columns `avg_ttm_minutes` / `p95_ttm_minutes` (TTM typically means "time to mitigate"), while the computation and summary both refer to MTTR (time to resolve). Left unchanged per scope (not technically wrong — the value computed matches the section's intent).
- The `countDistinct(rule_name)` over `alert_incidents` combined with a `GROUP BY day, severity` correctly counts distinct rules per day/severity bucket.
