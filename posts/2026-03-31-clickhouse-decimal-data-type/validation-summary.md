# Validation Summary: How to Use Decimal Data Type in ClickHouse for Precise Calculations

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- ClickHouse (Decimal data type family: Decimal32, Decimal64, Decimal128, Decimal256)
- SQL (DDL, DML, arithmetic, aggregate functions, type conversion)
- MergeTree table engine

## Sources Consulted
- ClickHouse Decimal data types documentation: https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse Type Conversion Functions (CAST, toDecimal*): https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse MergeTree table engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
1. **Incorrect storage type count.** The text said "ClickHouse maps Decimal(P, S) to one of three underlying storage types," but the table immediately below lists four (Decimal32, Decimal64, Decimal128, Decimal256). Fixed to "four underlying storage types."
2. **Arithmetic error in pricing INSERT example.** Row 3 had `line_total = 99.4005` for `unit_price=9.99`, `quantity=10.5`, `discount=0.05`. The comment above states `line_total` is computed as `price * qty * (1 - discount)`, which evaluates to `9.99 * 10.5 * 0.95 = 99.65025`. Corrected to `99.6503` (rounded to scale 4, matching the column's Decimal(18, 4) type).

## Review Notes
- Decimal P range (1–76), S range (0–P), and all four underlying storage widths (4/8/16/32 bytes) match the official ClickHouse documentation.
- Arithmetic promotion rules (addition/subtraction preserves higher scale; multiplication produces scale `S1 + S2`) are accurate.
- Both CAST forms are valid in ClickHouse — `CAST(x AS Type)` and `CAST(x, 'Type')` — so the string-literal form in the Type Casting section is correct.
- The Float64 `0.1 + 0.2 = 0.30000000000000004` example is a well-known IEEE-754 result and accurate.
- `toDecimal32/64/128/256` functions (and their OrNull/OrZero variants) are valid current ClickHouse conversion functions.
- The multiplication scale example `toDecimal64(1299.99, 2) * toDecimal64(0.0875, 4) = 113.749125` (scale 6 = 2 + 4) is mathematically and behaviorally correct.
