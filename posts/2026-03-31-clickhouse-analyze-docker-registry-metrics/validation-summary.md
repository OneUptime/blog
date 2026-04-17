# Validation Summary: How to Analyze Docker Registry Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, data types)
- Docker Registry (access logs, image pull/push events)
- sha256 digest format

## Sources Consulted
- ClickHouse SQL reference: https://clickhouse.com/docs/en/sql-reference
- ClickHouse data types (FixedString, LowCardinality, IPv4): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate functions (count, countIf, uniqExact): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse date/time functions (toDate, toStartOfHour, toYYYYMMDD, now): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse formatReadableSize function: https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- Docker Registry HTTP API V2 / OCI Distribution Spec: https://distribution.github.io/distribution/spec/api/
- sha256 digest format (OCI spec): 7-char prefix "sha256:" + 64 hex chars = 71 chars

## Issues Found
No technical issues found.

## Review Notes
- `FixedString(71)` correctly accommodates a full sha256 digest including the "sha256:" prefix (7 + 64 = 71 chars).
- All ClickHouse functions used (`count`, `countIf`, `uniqExact`, `formatReadableSize`, `toDate`, `toStartOfHour`, `toYYYYMMDD`, `now`) and the `INTERVAL N DAY/HOUR` syntax are valid and current.
- `PARTITION BY toYYYYMMDD(ts)` yields daily partitions, which is very fine-grained. For high-volume registries this could produce too many parts over time; monthly (`toYYYYMM`) is often a safer default. This is a design choice, not an error.
- Using `HAVING` with aliases like `client_errors + server_errors > 0` and `pulls > 500` is supported by ClickHouse.
- The schema assumes a single `bytes` field covers both push and pull transfer sizes; in practice registry logs may record request and response sizes separately, but this is a reasonable simplification for a tutorial.
