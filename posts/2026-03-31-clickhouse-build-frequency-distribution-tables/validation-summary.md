# Validation Summary: How to Build Frequency Distribution Tables in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect)
- SQL aggregate functions (`count()`, `sum()`, `histogram()`)
- SQL conditional expressions (`multiIf`)
- SQL bucketing functions (`widthBucket` / `width_bucket`)
- SQL window functions (`OVER`, `ROWS UNBOUNDED PRECEDING`)
- `ARRAY JOIN` clause
- Tuple element access

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/
- ClickHouse `multiIf` reference: https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions#multiif
- ClickHouse `histogram` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/histogram
- ClickHouse `widthBucket` function: https://clickhouse.com/docs/en/sql-reference/functions/arithmetic-functions#widthbucket
- ClickHouse window functions reference: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `ARRAY JOIN` clause: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- ClickHouse tuple functions: https://clickhouse.com/docs/en/sql-reference/data-types/tuple

## Issues Found
No technical issues found.

All SQL code was verified for correctness:
- `multiIf(cond, then, ..., else)` syntax matches the documented conditional function.
- `histogram(N)(x)` returning an array of `(lower, upper, height)` tuples is accurate; `height` corresponds to the calculated bin frequency, which is effectively a count when no weights are supplied, so labeling the third element as `count` is reasonable.
- `width_bucket` is a valid case-insensitive alias for `widthBucket`, per the documentation.
- `ARRAY JOIN hist AS bucket` is valid syntax and `bucket.1`, `bucket.2`, `bucket.3` correctly access tuple elements (1-based indexing).
- Window functions (`sum(...) OVER ()` and `sum(...) OVER (ORDER BY col ROWS UNBOUNDED PRECEDING)`) are supported in ClickHouse and the shorthand `ROWS UNBOUNDED PRECEDING` is accepted.
- The aggregate-over-aggregate pattern `sum(count()) OVER ()` is a standard ClickHouse idiom for computing percentages after a `GROUP BY`.
- `greatest()`, `log10()`, `pow()`, `floor()`, `round()`, `now()`, and `INTERVAL` usage are all correct.

## Review Notes
- The `width_bucket` example does not filter out bucket values `0` (below `low`) or `count+1` (at or above `high`). For data points outside the `0-1000ms` range, the computed `bucket_start_ms`/`bucket_end_ms` columns will include `-100 to 0` or `1000 to 1100` values. The query still executes correctly, but readers may wish to add a `HAVING bucket_num BETWEEN 1 AND 10` or a `WHERE duration_ms BETWEEN 0 AND 1000` predicate when they only want in-range buckets.
- The `histogram()` aggregate returns bucket boundaries derived from the data distribution, not fixed-width intervals; readers should be aware bucket widths vary across rows.
- Using `count` as a column alias (in the cumulative distribution example) is legal in ClickHouse but can be visually confusing next to the `count()` function. This is a stylistic consideration, not a correctness issue.
