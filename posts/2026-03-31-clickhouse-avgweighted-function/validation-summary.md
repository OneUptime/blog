# Validation Summary: How to Use avgWeighted() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL aggregate functions (`avgWeighted`, `avg`, `sum`, `count`, `isNaN`)
- ClickHouse date/time functions (`today()`, `now()`, `toDate()`, `INTERVAL`)

## Sources Consulted
- Official ClickHouse documentation for `avgWeighted`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/avgweighted
- ClickHouse documentation on aggregate functions and date/time functions

## Issues Found
No technical issues found.

The post's claims were all verified against the official documentation:
- Syntax `avgWeighted(value, weight)` matches the documented `avgWeighted(x, weight)` signature.
- Return type is `Float64` (correct).
- Returns `NaN` when the sum of all weights is zero (correct — docs state "Returns NaN if all the weights are equal to 0 or the supplied weights parameter is empty").
- Both `value` and `weight` must be numeric — correct ((U)Int* or Float*).
- The mathematical definition `sum(value * weight) / sum(weight)` is correct.
- The example arithmetic checks out: simple avg of (2, 100) = 51; weighted avg = (2*10000 + 100*5)/10005 ≈ 2.05 ("close to $2").
- The pre-aggregated rollup identity `avgWeighted(avg, count) = sum(avg * count) / sum(count)` is mathematically valid.
- Functions referenced (`isNaN`, `today()`, `now()`, `toDate()`, `INTERVAL` syntax) all exist and are used correctly.

## Review Notes
- The post mentions `nan` (lowercase) which is how ClickHouse displays the value; the docs use `NaN` for the formal name. Either is acceptable in prose.
- The `avgWeighted` function was introduced in ClickHouse 20.1.0, so it has been available for many years and is broadly applicable across modern ClickHouse versions. No version caveat needed.
- The schemas (`product_sales`, `trades`, `service_stats`, etc.) are illustrative; readers will adapt them to their own tables.
