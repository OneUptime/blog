# Validation Summary: How to Use Nothing Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse `Nothing` data type
- ClickHouse `Nullable` type system
- ClickHouse higher-order array functions (`arrayMap`, `arrayFilter`, `arrayFold`)
- ClickHouse type inference and `UNION ALL` type unification

## Sources Consulted
- ClickHouse official documentation — Nothing data type: https://clickhouse.com/docs/en/sql-reference/data-types/nothing
- ClickHouse official documentation — Array data type: https://clickhouse.com/docs/en/sql-reference/data-types/array
- ClickHouse official documentation — Array functions (emptyArray helpers): https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official documentation — Type conversion functions (toTypeName): https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse official documentation — Other functions (hasColumnInTable): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse source code — `src/Functions/array/emptyArray.cpp` (to verify registered emptyArray* functions)

## Issues Found

### 1. `toTypeName(NULL)` incorrectly stated as returning `Nothing`
**What was wrong:** The post claimed `toTypeName(NULL)` returns `Nothing`. Per the official docs, a bare `NULL` literal has the type `Nullable(Nothing)`, not `Nothing`.
**What was changed:** Updated the result comment and surrounding explanation to correctly state `Nullable(Nothing)`.

### 2. `[NULL, NULL, NULL]` type incorrectly stated as `Array(Nothing)`
**What was wrong:** The post claimed the type was `Array(Nothing)`. Since each `NULL` is `Nullable(Nothing)`, the array type is `Array(Nullable(Nothing))`.
**What was changed:** Updated the comment and result type to `Array(Nullable(Nothing))`.

### 3. `[NULL, 1, 2]` type incorrectly stated as `Array(Nullable(Int32))`
**What was wrong:** ClickHouse uses the narrowest type that fits all values. The literals `1` and `2` fit in `UInt8` (0–255), so the correct type is `Array(Nullable(UInt8))`, not `Array(Nullable(Int32))`.
**What was changed:** Updated the result type comment to `Array(Nullable(UInt8))`.

### 4. `emptyArrayNothing()` does not exist
**What was wrong:** The post described `emptyArrayNothing()` as a ClickHouse helper function. This function does not exist. The registered `emptyArray*` functions are limited to: `emptyArrayUInt8`, `emptyArrayUInt16`, `emptyArrayUInt32`, `emptyArrayUInt64`, `emptyArrayInt8`, `emptyArrayInt16`, `emptyArrayInt32`, `emptyArrayInt64`, `emptyArrayFloat32`, `emptyArrayFloat64`, `emptyArrayDate`, `emptyArrayDateTime`, `emptyArrayString`.
**What was changed:** Replaced the entire section with "Empty Arrays and the Nothing Type", demonstrating that the empty array literal `[]` produces `Array(Nothing)`, contrasted with typed helpers like `emptyArrayInt32()`.

### 5. `hasColumnInTable` called with wrong argument signature
**What was wrong:** The post used `hasColumnInTable('system.tables', 'name')`, passing `'system.tables'` as a single argument. The correct signature is `hasColumnInTable(database, table, column)` with database and table as separate arguments: `hasColumnInTable('system', 'tables', 'name')`.
**What was changed:** Removed this unrelated function call entirely when rewriting the emptyArrayNothing section.

### 6. UNION ALL comment implied `Nullable(Int32)` instead of `Nullable(UInt8)`
**What was wrong:** The comment stated the NULL column becomes `Nullable(Int32)` after type unification. Since `42` fits in `UInt8`, the unified type is `Nullable(UInt8)`.
**What was changed:** Updated the comment to `Nullable(UInt8)` with an explanation.

### 7. `arrayFilter(x -> x > 0, [])` with untyped empty array
**What was wrong:** The first line used `arrayFilter(x -> x > 0, [])` where `[]` is `Array(Nothing)`. Comparing a `Nothing`-typed element with `> 0` is problematic. The second line correctly used `emptyArrayInt32()`.
**What was changed:** Both lines now consistently use `emptyArrayInt32()`.

## Review Notes
- The intro paragraph and "What is the Nothing Data Type" section were also updated to accurately describe the relationship between `Nothing` and `Nullable(Nothing)`, since the original text conflated the two.
- The practical example section with conditional arrays is conceptually sound, though the type of `email_hash` (literal `12345`) would be `UInt16` rather than any Int type. This was left as-is since the example demonstrates the concept correctly and the exact inferred types are not stated in comments.
- The `arrayFold` mention alongside `arrayMap` and `arrayFilter` is correct — `arrayFold` exists in ClickHouse.
