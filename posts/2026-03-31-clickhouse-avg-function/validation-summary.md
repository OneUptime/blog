# Validation Summary: How to Use avg() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL aggregate functions (`avg`, `avgIf`, `avgWeighted`, `sumKahan`)
- ClickHouse data types (`Nullable`, `Float32`, `Float64`, `Decimal64`, `UInt8`, `UInt64`, `Date`)
- ClickHouse MergeTree engine
- ClickHouse date/time functions (`toMonday`, `toDate`, `toYear`, `today`)

## Sources Consulted
- ClickHouse official docs — `avg()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/avg
- ClickHouse official docs — `avgWeighted()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/avgweighted
- ClickHouse official docs — `sumKahan()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/sumkahan
- ClickHouse docs — aggregate function combinators (`-If` suffix)
- ClickHouse docs — type conversion functions (`toDecimal64`, `ifNull`)
- ClickHouse docs — date/time functions (`toMonday`, `today`, `toYear`, `toDate`)

## Issues Found
No technical issues found.

- `avg()` return type of `Float64` matches the official documentation.
- NULL-handling claim (NULLs excluded from both sum and count) matches standard ClickHouse aggregate behavior.
- `avgIf(column, condition)` is a correct use of the `-If` aggregate combinator.
- `avgWeighted(value, weight)` syntax and semantics match the docs; the worked example `(92*4 + 85*3 + 95*1) / 8 = 89.75` is arithmetically correct.
- `sumKahan()` is a real function and is described accurately.
- All date/time helper functions referenced (`toMonday`, `today`, `toYear`, `toDate`) and type conversion helpers (`toDecimal64`, `ifNull`) exist and are used correctly.
- DDL and `INSERT` statements are syntactically valid ClickHouse SQL.

## Review Notes
- Per the official ClickHouse `avgWeighted` docs, the two arguments are documented as `(U)Int*` or `Float*`. The post's `course_grades` example uses `Float64` (score) and `UInt8` (credits), which is within the documented type set.
- The precision example `toDecimal64(sum(toDecimal64(rating, 4)), 4) / count(rating)` works but contains a redundant outer `toDecimal64` wrap — `sum()` over a `Decimal64(S)` already returns a `Decimal128(S)`. This is stylistic, not incorrect, so it was left as written.
- The "always Float64" claim is accurate per the current official docs; behavior for Decimal inputs has varied across ClickHouse versions in practice, so readers working with Decimal columns should verify against their specific ClickHouse version.
