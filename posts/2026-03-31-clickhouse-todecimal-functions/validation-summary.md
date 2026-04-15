# Validation Summary: How to Use toDecimal32(), toDecimal64(), toDecimal128() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse Decimal data types (Decimal32, Decimal64, Decimal128)
- ClickHouse type conversion functions (toDecimal32, toDecimal64, toDecimal128, toDecimal64OrNull)

## Sources Consulted
- ClickHouse Decimal Data Types documentation — https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse Type Conversion Functions documentation — https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse Arithmetic Functions documentation — https://clickhouse.com/docs/sql-reference/functions/arithmetic-functions
- Altinity Blog: Decimals vs Floats in ClickHouse — https://altinity.com/blog/decimals-vs-floats-in-clickhouse
- ClickHouse GitHub Issue #42729 (Decimal multiplication behavior) — https://github.com/ClickHouse/ClickHouse/issues/42729

## Issues Found
1. **Scale Mismatch in Arithmetic section — incorrect scale rule for multiplication** (line 145-151):
   - **What was wrong:** The text stated "ClickHouse automatically promotes to the larger scale" and the SQL comment said "Multiplying Decimal64(2) by Decimal64(4) gives Decimal64(4)". This is incorrect for multiplication. In ClickHouse, the result scale for multiplication is the **sum** of the two operand scales (S1 + S2), not the maximum. The rule of "max(S1, S2)" only applies to addition and subtraction.
   - **What was changed:** Updated the explanatory text to distinguish between addition/subtraction (max of scales) and multiplication (sum of scales). Changed the SQL comment from "gives Decimal64(4)" to "gives Decimal64(6) (scale = 2 + 4)".
   - **Why:** Per the official ClickHouse Decimal documentation, multiplication scale = S1 + S2. So Decimal64(2) * Decimal64(4) produces Decimal64(6), not Decimal64(4).

## Review Notes
- The post does not mention `Decimal256`, which ClickHouse also supports (up to 76 significant digits). This is not an error — the three types covered are the most commonly used — but could be noted in a future update.
- The introductory claim that Decimal has "no rounding errors" is slightly simplified. Decimal avoids binary floating-point representation errors, but division operations on Decimal values can still produce rounded results. For the financial use cases described in the post, this simplification is acceptable.
- The post does not mention the `multiplyDecimal()` function, which has different scale behavior from the standard `*` operator (it uses `max(S1, S2)` by default and always returns Decimal256). This is fine since the post focuses on the core toDecimal conversion functions.
- All SQL syntax, function signatures, OrNull variants, and type property claims (byte sizes, digit limits) were verified as correct.
