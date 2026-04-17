# Validation Summary: How to Track Deployment Performance Impact with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, window functions, aggregate functions)
- Observability / APM concepts (p50/p95/p99 latency, error rates, RPM)
- CI/CD deployment tracking patterns

## Sources Consulted
- ClickHouse SQL Reference — UUID functions: https://clickhouse.com/docs/sql-reference/functions/uuid-functions
- ClickHouse Data Types — LowCardinality: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse MergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate function `quantile`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse aggregate function combinators (`-If`): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse date/time functions (`toStartOfFiveMinutes`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse window functions (`lagInFrame`): https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse WITH clause / CTEs: https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse SQL syntax / keyword reservation rules: https://clickhouse.com/docs/sql-reference/syntax

## Issues Found
No technical issues found.

All SQL constructs were verified against the official ClickHouse documentation:

- `generateUUIDv4()`, `LowCardinality(String)`, `Nullable(DateTime) DEFAULT NULL`, and `MergeTree() ORDER BY (...)` DDL syntax are all valid.
- `quantile(0.95)(response_time_ms)` uses the correct parametric aggregate syntax.
- `countIf(...)` is a valid `-If` combinator aggregate.
- `INTERVAL 1 HOUR` arithmetic on `DateTime` is valid.
- `toStartOfFiveMinutes()` is a real function (introduced in v22.6.0).
- `lagInFrame(...) OVER (ORDER BY ...)` is valid; with the default frame (`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`) it returns NULL on the first row, which the subsequent `prev_p99 > 0` filter correctly handles.
- CTEs used in JOINs are supported.

## Review Notes
- `Nullable(DateTime) DEFAULT NULL` is technically redundant since `NULL` is the implicit default for Nullable columns, but it is not incorrect and reads more explicitly.
- Using `window` as an unquoted column alias (`'pre_deploy' AS window`) is technically parseable — the ClickHouse docs state "Keywords are not reserved. They are treated as such only in the corresponding context." Since the query contains no `WINDOW` clause or `OVER window_name` reference, there is no parser ambiguity. That said, authors might prefer to backtick it or pick a non-keyword alias (e.g., `phase`) for safety in copy-pasting into richer queries.
- Per-reference CTE re-execution is the default in ClickHouse; since the `deployment` CTE only returns one row, the two references in the UNION query are cheap, but for larger CTE payloads readers should consider materialization.
- `LowCardinality(String)` is most efficient when the cardinality is under ~10k distinct values; `version` could exceed this over very long retention windows but is unlikely to in practice.
