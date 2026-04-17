# Validation Summary: How to Detect Anomalies in Time-Series Data with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree, ReplacingMergeTree, Materialized Views)
- ClickHouse window functions (`lagInFrame`, `avg`, `stddevPop` over windows, named `WINDOW w AS ...`)
- ClickHouse aggregate/parametric functions (`quantile(level)(expr)`, `stddevPop`, `avg`)
- ClickHouse type system (`LowCardinality(String)`, `Float32`, `UInt8`, `DateTime`)
- Statistical methods (z-score, IQR, seasonal decomposition, rate-of-change)

## Sources Consulted
- ClickHouse Window Functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse `stddevPop`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/stddevpop
- ClickHouse `quantile`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse Null functions (`nullIf`): https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse Analyzer (alias resolution): https://clickhouse.com/docs/operations/analyzer
- ClickHouse Materialized Views: https://clickhouse.com/docs/materialized-view/incremental-materialized-view
- ClickHouse MergeTree engines: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- Live verification on https://play.clickhouse.com/ (v26.4) for alias-in-WHERE behavior

## Issues Found
No technical issues found. Key items verified:

- `lagInFrame` is the correct ClickHouse name (not `LAG`) and works with named windows.
- `stddevPop` is usable both as an aggregate and as a window function.
- `quantile(0.25)(col)` is the correct parametric aggregate syntax.
- `nullIf` is the canonical camelCase spelling.
- Referencing a scalar SELECT alias (e.g., `z_score`) in the `WHERE` clause of the same query is supported under the current default analyzer. Confirmed on ClickHouse Play.
- `WINDOW w AS (PARTITION BY ... ORDER BY ... ROWS BETWEEN N PRECEDING AND CURRENT ROW)` is valid named-window syntax.
- `ReplacingMergeTree(computed_at)` with a DateTime version column is valid.
- `LowCardinality(String)`, `Float32`, `UInt8`, and `toYYYYMM` partitioning are all correct.
- The three "Related Reading" posts exist in the blog repo.

## Review Notes
- The materialized view in the "Alerting with Materialized Views" section uses a `JOIN` against a CTE that rescans the source table. This is supported, but worth noting to readers that ClickHouse MVs are INSERT triggers — the outer `FROM server_metrics AS m` only sees the newly inserted block, while the stats CTE reads the full table at trigger time. This is a known subtlety rather than an error.
- The sample `INSERT ... SELECT` uses integer arithmetic (`20 + rand() % 30 + if(...)`) that is implicitly cast to the `Float32` target columns; this works but produces integer-valued floats. Not an error, just an observation.
- Z-score threshold of 3 is a reasonable default for Gaussian-assumed data; IQR with 1.5×IQR fences follows Tukey's standard convention. Both are correctly described.
