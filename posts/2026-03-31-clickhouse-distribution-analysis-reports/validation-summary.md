# Validation Summary: How to Create Distribution Analysis Reports in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse aggregate functions: `histogram`, `quantile`, `avg`, `stddevPop`, `count`, `sum`, `min`
- ClickHouse window functions (`OVER ()`, `OVER (ORDER BY ...)`)
- ClickHouse `multiIf`, `arrayJoin`, CTEs (`WITH ... AS`)
- MergeTree table engine

## Sources Consulted
- ClickHouse aggregate functions reference (parametric functions, including `histogram`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions
- ClickHouse `quantile` reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse window functions docs: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `multiIf` conditional: https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse `JOIN ... USING` syntax: https://clickhouse.com/docs/en/sql-reference/statements/select/join

## Issues Found
- The `histogram` function's tuple was described as `(lower, upper, count)`. According to the official ClickHouse documentation, the third element is the bin **height** (a Float64 from a streaming/adaptive algorithm), not a strict count. Updated the description to `(lower, upper, height)` and renamed the projected alias from `count` to `approx_count` to reflect that the value approximates per-bin counts rather than being a true count.

## Review Notes
- The `histogram` adaptive algorithm dynamically adjusts bin boundaries; for unweighted inputs the heights sum approximately to the row count, so casting to `UInt64` is reasonable for display.
- The CDF example uses `multiIf(..., 1000)` as the catch-all bucket — values 500–999 and 1000+ all collapse into the `1000` bucket. This is a deliberate design simplification (different bucket set than the earlier `Manual Frequency Buckets` example) but is technically valid SQL.
- `JOIN customers USING customer_id` is accepted by ClickHouse (parentheses around the column are optional in this dialect). The `customers` table is referenced without a definition; readers should infer it has a `customer_id` and `segment` column.
- All `quantile(p)(column)` invocations are valid, including `quantile(0.999)`.
- `stddevPop` is a valid ClickHouse aggregate.
