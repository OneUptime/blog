# Validation Summary: How to Choose the Right Numeric Data Type in ClickHouse

## Status
validated

## Post Type
Reference / Decision Guide

## Technologies Covered
- ClickHouse (numeric data types: Int, UInt, Float32, Float64, Decimal, Bool)
- SQL (DDL, queries, type conversion functions)

## Sources Consulted
- ClickHouse official docs — Integer types: https://clickhouse.com/docs/en/sql-reference/data-types/int-uint
- ClickHouse official docs — Float types: https://clickhouse.com/docs/en/sql-reference/data-types/float
- ClickHouse official docs — Decimal types: https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse official docs — Boolean type: https://clickhouse.com/docs/en/sql-reference/data-types/boolean
- ClickHouse official docs — Arithmetic functions: https://clickhouse.com/docs/en/sql-reference/functions/arithmetic-functions
- ClickHouse official docs — Type conversion functions: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- IEEE 754 floating-point standard (for Float32/Float64 precision claims)

## Issues Found

1. **Decimal table column mislabeled "Max Precision" instead of "Scale Range (S)"** — The Decimal types table had a column header "Max Precision" with values 0-9, 0-18, 0-38, 0-76. These are the scale (S) ranges, not precision values. The "Max Digits" column already correctly shows maximum precision. Renamed the column to "Scale Range (S)" for accuracy.

2. **Incorrect overflow example** — The post claimed `SELECT toUInt8(255) + 1` returns 0 (wraps). This is incorrect because ClickHouse promotes result types for sub-32-bit arithmetic: `UInt8 + UInt8` produces `UInt16`, so the result is 256, not 0. Wrapping only occurs when explicitly casting back to a smaller type (e.g., `toUInt8(256)` returns 0) or when 64-bit types overflow with no further promotion available. Updated the section with correct examples and explanation.

## Review Notes
- All integer type byte sizes and ranges are accurate.
- All Decimal type parameters (byte sizes, max digits, scale ranges) match official documentation.
- Float32/Float64 byte sizes and significant digit counts align with IEEE 754 standard.
- Bool type correctly described as UInt8 alias.
- All SQL syntax (CREATE TABLE, SELECT, type conversion functions like toFloat32, toFloat64, toDecimal64, toUInt8) is correct.
- Storage impact calculations for 1 billion rows are mathematically correct (bytes × 10^9 = GB).
- The decision matrix recommendations are reasonable and well-matched to the type characteristics.
- The system.parts_columns query for estimating storage is valid ClickHouse system table usage.
