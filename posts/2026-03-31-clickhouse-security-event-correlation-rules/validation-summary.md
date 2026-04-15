# Validation Summary: How to Build Security Event Correlation Rules in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree engines)
- ClickHouse SQL (aggregate functions, parametric functions, materialized views)
- SIEM / Security Event Correlation concepts

## Sources Consulted
- ClickHouse Parametric Aggregate Functions documentation (windowFunnel): https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions
- ClickHouse UUID Functions documentation (generateUUIDv4): https://clickhouse.com/docs/sql-reference/functions/uuid-functions
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse uniq() documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- ClickHouse IPv4 data type documentation: https://clickhouse.com/docs/sql-reference/data-types/ipv4
- ClickHouse HAVING clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/having
- ClickHouse Materialized Views blog post: https://clickhouse.com/blog/using-materialized-views-in-clickhouse

## Issues Found
No technical issues found.

## Review Notes
- The `uniq()` function used in the lateral movement detection query returns approximate distinct counts (not exact). For security thresholds like `>= 5`, this is appropriate since the approximation error (~1-2%) is negligible at these magnitudes. If exact counts were needed, `uniqExact()` would be the alternative.
- The `SummingMergeTree` materialized view is correctly defined, but consumers querying the `auth_failure_summary` view should use `SELECT ... sum(failures) ... GROUP BY ...` rather than reading the `failures` column directly, because background merges are asynchronous and rows with the same key may not yet be collapsed. The post does not show a query against this view, so this is not an error, but worth noting for readers who extend the example.
- The self-join in the privilege escalation query could be resource-intensive on very large datasets. This is a performance consideration, not a correctness issue.
