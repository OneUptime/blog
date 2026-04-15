# Validation Summary: How to Monitor Database Query Performance with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system tables: `system.query_log`, `system.query_thread_log`, `system.processes`, `system.columns`)
- ClickHouse SQL (aggregate functions, quantiles, `countIf`, `formatReadableSize`, `toStartOfFiveMinutes`)
- ClickHouse server configuration (XML config for `query_log`)
- Grafana (mentioned as visualization/alerting integration)

## Sources Consulted
- ClickHouse official documentation: system.query_log table (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse official documentation: server settings for query_log (https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#query_log)
- ClickHouse official documentation: settings reference for `log_queries_min_query_duration_ms` (https://clickhouse.com/docs/en/operations/settings/settings#log_queries_min_query_duration_ms)
- ClickHouse GitHub PR #16529 (introduction of `log_queries_min_query_duration_ms` setting)
- ClickHouse official documentation: system.processes table (https://clickhouse.com/docs/en/operations/system-tables/processes)
- ClickHouse official documentation: KILL QUERY statement (https://clickhouse.com/docs/en/sql-reference/statements/kill)

## Issues Found

1. **Incorrect setting name** (line 50): `log_queries_min_duration_ms` is not a valid ClickHouse setting. The correct name is `log_queries_min_query_duration_ms` (note the extra `query_` in the middle). Fixed in the ALTER USER example.

2. **Error rate query includes QueryStart rows** (lines 127-142): The "Query volume and error rate" query had no `type` filter, so `QueryStart` rows were included. This caused two problems: (a) the `count()` denominator was inflated (roughly doubled), making the error rate appear half its true value; (b) `avg(query_duration_ms)` and `quantile(0.99)(query_duration_ms)` were skewed downward because `QueryStart` rows have `query_duration_ms = 0`. Fixed by adding `type != 'QueryStart'` to the WHERE clause.

3. **String-based ordering of memory values** (line 158): `ORDER BY peak_memory DESC` sorted the formatted string output of `formatReadableSize()` (e.g., "200.00 MiB" > "1.50 GiB" alphabetically), producing incorrect ordering. Fixed to `ORDER BY max(memory_usage) DESC` to sort by the raw numeric byte value.

4. **Dashboard query includes QueryStart rows** (lines 200-212): Same issue as #2. The dashboard summary query had no `type` filter, inflating `total_queries` count and skewing all duration percentiles downward. Fixed by adding `type != 'QueryStart'` to the WHERE clause.

## Review Notes
- The `HAVING` clause without `GROUP BY` in the alert query (line 234-240) is valid ClickHouse syntax — it treats the entire result as a single group and filters based on the aggregate condition.
- The `left()` function used throughout is valid in modern ClickHouse versions (added as an alias for `substring(s, 1, n)`). Older ClickHouse versions may not support it.
- The `normalized_query_hash` column is correctly used for grouping query patterns — this is a real column in `system.query_log`.
- The mermaid diagrams are structurally correct.
- Related reading links point to internal blog posts on the same domain, which is consistent with the blog's conventions.
