# Validation Summary: How to Use toUInt8(), toUInt16(), toUInt32(), toUInt64() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect and type system)
- ClickHouse type conversion functions: toUInt8(), toUInt16(), toUInt32(), toUInt64()
- ClickHouse OrZero/OrNull safe parsing variants
- ClickHouse extractAll() string search function
- ClickHouse columnar storage and type optimization

## Sources Consulted
- [ClickHouse Int/UInt Data Types Documentation](https://clickhouse.com/docs/sql-reference/data-types/int-uint)
- [ClickHouse Type Conversion Functions Documentation](https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions)
- [ClickHouse String Search Functions (extractAll)](https://clickhouse.com/docs/sql-reference/functions/string-search-functions)
- [Google RE2 Regex Syntax](https://github.com/google/re2/wiki/Syntax)

## Issues Found
1. **Imprecise claim about negative input behavior (line 141)**: The original text stated "Passing a negative value to a `toUInt` function throws an exception in the standard variant." This is only true for **string** inputs (e.g., `toUInt32('-1')`). Passing a **numeric** negative value (e.g., `toUInt32(-1)`) does **not** throw — it wraps around using C++ unsigned integer semantics (e.g., `toUInt32(-1)` returns `4294967295`). The code examples in the section were all string-based and correct, but the prose was misleading. Fixed by clarifying the distinction between string and numeric negative inputs.

## Review Notes
- All unsigned integer type ranges (UInt8, UInt16, UInt32, UInt64) are correct per official documentation.
- Float-to-unsigned truncation behavior (`toUInt32(3.9)` returning `3`) is correct — ClickHouse truncates toward zero.
- The `extractAll()` usage with capture groups and 1-based array indexing is valid ClickHouse SQL.
- OrZero and OrNull variant behaviors are accurately described for both invalid strings and negative string inputs.
- The storage optimization advice (choosing smallest sufficient UInt type) is sound for ClickHouse's columnar format.
- The UNION ALL type normalization pattern is a valid and practical use case.
- The "Unsigned vs Signed" comparison table gives reasonable type recommendations for the listed use cases.
