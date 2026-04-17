# Validation Summary: How to Use abs() and sign() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse arithmetic / math functions (`abs`, `sign`)
- ClickHouse aggregate functions (`sum`, `avg`, `countIf`, `any`)
- ClickHouse window functions (`OVER (PARTITION BY ...)`)
- ClickHouse `MergeTree` table engine

## Sources Consulted
- ClickHouse arithmetic functions: https://clickhouse.com/docs/en/sql-reference/functions/arithmetic-functions
- ClickHouse math functions (`sign`): https://clickhouse.com/docs/en/sql-reference/functions/math-functions
- ClickHouse aggregate function combinators (`-If`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- Empirical verification against ClickHouse 26.4.1 (confirming return types and error codes)

## Issues Found
1. **Incorrect claim about `abs()` return type.** The post stated that `abs()` "returns the same type as their input". This is only true for floating-point and decimal inputs. For signed integers, ClickHouse returns the corresponding unsigned integer type (e.g. `abs(Int32)` returns `UInt32`). Fix: clarified the return-type description to distinguish float/decimal (type preserved) from signed integers (promoted to unsigned counterpart).
2. **Invalid SQL in "Normalizing Deviations" query.** The original query nested an aggregate function (`avg(...)`) around a window expression (`avg(pnl) OVER (PARTITION BY asset)`), which ClickHouse rejects with `Code: 184. DB::Exception: Window function ... is found inside an aggregate function in query. (ILLEGAL_AGGREGATION)`. Fix: rewrote the query to compute the per-asset mean via a window function in an inner subquery, then aggregate `avg(abs(pnl - asset_mean))` in the outer query, and added a one-line explanation of why the restructuring is needed.

## Review Notes
- All other SQL examples (`CREATE TABLE ... ENGINE = MergeTree`, `INSERT VALUES`, `countIf`, `CASE sign(x) WHEN ...`, `abs()` in `WHERE`/`ORDER BY`, `round()`, etc.) are syntactically correct and run as described in ClickHouse.
- The `sign()` return-type claim (Int8 with -1/0/1 values) is correct per official documentation.
- Minor edge case not covered in the post (not a correctness issue): `abs()` of the minimum value of a signed integer type overflows (e.g. `abs(toInt32(-2147483648))` is undefined/overflows). Worth mentioning in a future revision but not a technical error in the current post.
