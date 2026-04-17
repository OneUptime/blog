# Validation Summary: How to Build Incident Response Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SQL functions)
- Incident response metrics (MTTA, MTTR, SLA breach rate, on-call load)

## Sources Consulted
- ClickHouse Date and Time Functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse Quantile aggregate functions: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantiles
- ClickHouse countIf combinator: https://clickhouse.com/docs/examples/aggregate-function-combinators/countIf
- ClickHouse Conditional Functions (multiIf): https://clickhouse.com/docs/sql-reference/functions/conditional-functions
- ClickHouse LowCardinality data type: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse Nullable data type: https://clickhouse.com/docs/sql-reference/data-types/nullable
- ClickHouse Interval data type: https://clickhouse.com/docs/sql-reference/data-types/special-data-types/interval
- ClickHouse SELECT / alias scoping: https://clickhouse.com/docs/sql-reference/statements/select and issue #23194
- ClickHouse MergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found
No technical issues found.

All ClickHouse syntax verified against official documentation:
- `dateDiff('minute', a, b)` is the canonical form.
- `quantile(level)(expr)` two-arg syntax is correct.
- `countIf`, `multiIf`, `toStartOfWeek`, `toYYYYMM` are valid.
- `LowCardinality(String)` and `Nullable(DateTime)` are valid column types.
- `INTERVAL 90 DAY` and `INTERVAL 6 MONTH` are valid.
- In the SLA Breach Rate query, the expression `sla_breaches * 100.0 / total AS breach_rate_pct` references aliases defined earlier in the same SELECT; ClickHouse allows this because aliases have global scope within a single SELECT (unlike standard SQL).
- `MergeTree()` engine with `PARTITION BY toYYYYMM(...)` and tuple-form `ORDER BY (col1, col2)` is standard.

## Review Notes
- `toStartOfWeek` defaults to mode 1 (Monday start). If authors want ISO weeks or Sunday start, they can pass an explicit mode.
- `Nullable(DateTime)` columns carry extra storage overhead; for very high-volume incident tables, sentinel values (e.g., `0` / `toDateTime(0)`) are sometimes preferred, but the Nullable approach here is clear and correct.
- `dateDiff('minute', created_at, resolved_at)` counts minute boundaries crossed, not rounded elapsed minutes — acceptable for MTTA/MTTR, but readers aiming for sub-minute precision should consider `dateDiff('second', ...)` and divide.
- The SLA thresholds (P1=60, P2=240, else=1440 minutes) are illustrative; real users should parameterize by team/service policy.
