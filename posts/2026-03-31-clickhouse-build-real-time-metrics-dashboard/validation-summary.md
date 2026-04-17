# Validation Summary: How to Build a Real-Time Metrics Dashboard with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, SimpleAggregateFunction, Materialized Views, TTL, `LowCardinality`, `Map`, `DateTime64`)
- ClickHouse HTTP Interface (port 8123, `JSONEachRow` format)
- Python (`requests`, `json`, `datetime`) for a metrics-shipping example
- Grafana ClickHouse data source (macros: `$__timeFilter`, `$__timeInterval`)

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse AggregatingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse `SimpleAggregateFunction` data type: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse TTL clause: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse date/time functions (`toStartOfMinute`, `toStartOfHour`, `toStartOfInterval`, `toYYYYMMDD`, `toYYYYMM`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate functions (`argMax`, `quantile`, `stddevSamp`, `avg`, `min`, `max`, `sum`, `count`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse HTTP interface (`FORMAT JSONEachRow`): https://clickhouse.com/docs/en/interfaces/http
- Grafana ClickHouse data source plugin macros: https://github.com/grafana/clickhouse-datasource and https://grafana.com/grafana/plugins/grafana-clickhouse-datasource/

## Issues Found
- **Grafana panel query used the Grafana built-in `$__interval` inside a ClickHouse `INTERVAL ... second` expression.** Grafana's `$__interval` expands to a duration string such as `30s`, not a bare integer, so `INTERVAL $__interval second` would produce invalid SQL like `INTERVAL 30s second`. Replaced the expression with the ClickHouse plugin's `$__timeInterval(collected_at)` macro, which expands to a valid `toStartOfInterval(collected_at, INTERVAL <n> SECOND)` call. Updated the preceding comment to reference the `$__timeInterval` macro.

## Review Notes
- Schema design is sound: `LowCardinality(String)` for low-cardinality labels, `DateTime64(3)` for millisecond precision, `Map(String, String)` for dynamic tags, `Float64` for metric values.
- `SimpleAggregateFunction(min|max|sum, Float64)` and `SimpleAggregateFunction(sum, UInt64)` are used correctly; `count()` returns `UInt64`, so feeding it into `SimpleAggregateFunction(sum, UInt64)` lets subsequent merges combine per-bucket counts properly.
- The TTL clauses (`TTL toDate(collected_at) + INTERVAL 7 DAY DELETE`, etc.) are valid MergeTree TTL syntax.
- The anomaly-detection query uses `avg(sum_value / count_value)` (average of per-bucket means) rather than `sum(sum_value) / sum(count_value)` (true weighted mean). Both are valid; the current form may slightly diverge from a weighted average when bucket counts differ. Not a correctness bug — consider a note in future revisions for use cases with highly variable ingest rates.
- `datetime.utcnow()` is deprecated starting with Python 3.12 in favor of `datetime.now(timezone.utc)`. The call still works and produces correct output; future revisions could update the example to the non-deprecated API.
- The ClickHouse HTTP ingestion URL and `JSONEachRow` format are correct; default HTTP port `8123` is accurate.
- `argMax`, `quantile(x)(value)`, `stddevSamp`, `nullIf`, `round`, and `abs` are all current ClickHouse aggregate/scalar functions.
- CTE/`WITH` syntax with multiple named subqueries and `JOIN ... USING (...)` is supported by ClickHouse.
