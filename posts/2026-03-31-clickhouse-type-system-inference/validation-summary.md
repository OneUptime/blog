# Validation Summary: How to Understand ClickHouse Type System and Inference

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database engine)
- ClickHouse type system (UInt8/16/32/64, Int8/16/32/64, Float32/64, Bool, String, Nullable, Array)
- ClickHouse SQL functions: toTypeName, toInt8, toInt32, toUInt32, toFloat32, toFloat64, toNullable, assumeNotNull

## Sources Consulted
- [ClickHouse Boolean Data Type](https://clickhouse.com/docs/sql-reference/data-types/boolean) — confirms `toTypeName(true)` returns `Bool`, not `UInt8`
- [ClickHouse Arithmetic Functions](https://clickhouse.com/docs/sql-reference/functions/arithmetic-functions) — documents that addition/subtraction result type is the "next bigger type" after the wider operand
- [ClickHouse Int/UInt Data Types](https://clickhouse.com/docs/sql-reference/data-types/int-uint) — confirms integer type ranges for supertype determination
- [ClickHouse Array Data Type](https://clickhouse.com/docs/sql-reference/data-types/array) — array element type inference via leastSuperType
- [ClickHouse Comparison Functions](https://clickhouse.com/docs/sql-reference/functions/comparison-functions) — string-to-number comparison behavior

## Issues Found

### 1. Boolean literal type incorrect (line 36)
- **What was wrong:** `toTypeName(true)` was listed as returning `UInt8` with the comment "Boolean literals are UInt8."
- **What was changed:** Corrected to `Bool` with comment "Boolean literal, internally stored as UInt8."
- **Why:** ClickHouse introduced the `Bool` type (internally stored as UInt8), and `toTypeName(true)` returns `Bool` in modern ClickHouse, as confirmed by the official Boolean data type documentation.

### 2. Int8 + Int32 arithmetic result incorrect (lines 50-52)
- **What was wrong:** `toTypeName(toInt8(1) + toInt32(2))` was listed as returning `Int32` with the comment "promotes to Int32."
- **What was changed:** Corrected to `Int64` with comment "next bigger type after Int32."
- **Why:** Per ClickHouse arithmetic function docs, when both operands have up to 32 bits, the result type is the "next bigger type" after the wider operand. Int32 is the wider operand, so the result is Int64.

### 3. Nullable arithmetic result incorrect (line 79)
- **What was wrong:** `toTypeName(toNullable(1) + 1)` was listed as returning `Nullable(UInt8)`.
- **What was changed:** Corrected to `Nullable(UInt16)`.
- **Why:** The same arithmetic widening rule applies: UInt8 + UInt8 produces UInt16 (next bigger type after UInt8). The Nullable wrapper propagates but does not change the arithmetic promotion.

### 4. Array with mixed signed/unsigned type incorrect (line 155)
- **What was wrong:** `toTypeName([1, 2, -1])` was listed as returning `Array(Int8)` with comment "negative value forces signed."
- **What was changed:** Corrected to `Array(Int16)` with comment "common supertype of UInt8 and Int8 is Int16."
- **Why:** Literal `1` is UInt8 (0-255) and literal `-1` is Int8 (-128 to 127). Int8 cannot represent all UInt8 values, so the least common supertype is Int16.

### 5. Promotion hierarchy description updated (lines 67-69)
- **What was wrong:** Said "Integers: wider type wins" and "Signed vs unsigned of same width: result is wider signed type."
- **What was changed:** Clarified to "result is the next bigger type after the wider operand to prevent overflow" and "result is the next wider signed type."
- **Why:** The original wording implied the result is the same width as the wider operand, but ClickHouse actually widens by one step to prevent overflow.

## Review Notes
- The `'abc' = 0` returning `1` example (line 101-102) describes implicit string-to-number coercion behavior that is version-dependent. ClickHouse 25.12 removed settings related to non-comparable type comparisons. The example may not work in all ClickHouse versions. The concept it illustrates (dangers of implicit coercion) remains valid, but readers should test against their ClickHouse version.
- The `toTypeName(3.14)` → `Float64` claim is correct: unquoted decimal literals are Float64, not Decimal types.
- The `||` string concatenation operator usage is correct for modern ClickHouse.
