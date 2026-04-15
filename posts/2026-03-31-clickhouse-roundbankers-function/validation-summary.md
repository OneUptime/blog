# Validation Summary: How to Use roundBankers() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- `roundBankers()` function (banker's rounding / round-half-to-even)
- `round()` function (standard rounding)
- ClickHouse `Decimal64` and `Float64` data types
- ClickHouse `MergeTree` engine

## Sources Consulted
- ClickHouse official documentation — Rounding Functions: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions
- ClickHouse official documentation — `roundBankers()`: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#roundbankers
- ClickHouse official documentation — `round()`: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#round
- ClickHouse official documentation — Decimal data type: https://clickhouse.com/docs/en/sql-reference/data-types/decimal

## Issues Found

### 1. Incorrect claim that `round()` always rounds 0.5 up
**What was wrong:** The post stated that ClickHouse's `round()` "always rounds 0.5 up," implying this is universal behavior. In reality, ClickHouse's `round()` function behavior depends on the input data type:
- For `Float*` inputs: `round()` already uses banker's rounding (round-half-to-even), identical to `roundBankers()`.
- For `Decimal*` and integer inputs: `round()` rounds away from zero (0.5 rounds up for positive values).

**What was changed:** Updated the introductory paragraph, the "Key Difference from round()" section, and the Summary to accurately describe the type-dependent behavior of `round()` and explain that `roundBankers()` guarantees round-half-to-even regardless of input type.

### 2. All code examples used `Float64`, masking the difference between `round()` and `roundBankers()`
**What was wrong:** Every SQL example used Float64 literals or Float64 columns. Since `round()` on Float64 already uses banker's rounding in ClickHouse, the examples would produce identical results for both `round()` and `roundBankers()`, directly contradicting the post's claims about different outputs.

**What was changed:**
- Comparison and bias-reduction examples: Wrapped `arrayJoin()` values with `toDecimal64(..., 1)` so that `round()` uses round-away-from-zero behavior, making the difference visible.
- Financial table: Changed `unit_price` from `Float64` to `Decimal64(3)` and `tax_rate` from `Float64` to `Decimal64(2)`. This is also more realistic for financial data.
- Negative precision example: Changed float literals (`15.0, 25.0, ...`) to integer literals (`15, 25, ...`) so that `round()` uses round-away-from-zero, demonstrating the difference with `roundBankers()`.

## Review Notes
- The function signature `roundBankers(x [, N])`, default N=0, and positive/negative N behavior are all correct per official docs.
- The claimed output values (round-away-from-zero: 1,2,3,4,5,6,7,8 vs banker's: 0,2,2,4,4,6,6,8) are correct for Decimal inputs.
- The bias reduction math is correct: for the 10-value Decimal series, standard rounding introduces +5 bias while banker's rounding produces 0 bias.
- The SQL syntax for all queries (CTE, arrayJoin, GROUP BY, MergeTree DDL) is valid ClickHouse SQL.
- Using `Decimal64` for financial data is a best practice that the post now correctly models.
