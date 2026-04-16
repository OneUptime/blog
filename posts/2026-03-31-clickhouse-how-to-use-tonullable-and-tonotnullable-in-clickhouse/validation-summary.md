# Validation Summary: How to Use toNullable() and toNotNullable() in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Nullable type system
- `toNullable()` function
- `assumeNotNull()` function
- `Nullable(T)` type declaration
- `ALTER TABLE MODIFY COLUMN`
- `MergeTree` engine
- `COALESCE`, `ifNull`, `isNull`, `isNotNull`, `countIf`, `toTypeName`, `if`

## Sources Consulted
- [Functions for working with nullable values | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls)
- [ClickHouse GitHub: `functions-for-nulls.md`](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/functions/functions-for-nulls.md)
- [ClickHouse source: `src/Functions/assumeNotNull.cpp`](https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/assumeNotNull.cpp)
- [Altinity KB: assumeNotNull and friends](https://kb.altinity.com/altinity-kb-functions/assumenotnull-and-friends/)
- [ClickHouse docs: Nullable data type](https://clickhouse.com/docs/sql-reference/data-types/nullable)
- GitHub code search (verified: zero hits for `toNotNullable` in the ClickHouse repository)

## Issues Found
Major issue: the post was written around a function that does not exist in ClickHouse.

- **`toNotNullable()` is not a ClickHouse function.** Verified by:
  1. The official "Functions for working with nullable values" documentation page lists 10 functions (`assumeNotNull`, `coalesce`, `firstNonDefault`, `ifNull`, `isNotNull`, `isNull`, `isNullable`, `isZeroOrNull`, `nullIf`, `toNullable`) — `toNotNullable` is not among them.
  2. Inspecting `src/Functions/assumeNotNull.cpp` in the ClickHouse source shows the function is registered only under the name `assumeNotNull` with no `toNotNullable` alias.
  3. A code search across the entire `ClickHouse/ClickHouse` GitHub repository returns zero results for the string `toNotNullable`.
- The post additionally claimed `toNotNullable()` is "identical to `assumeNotNull()`", which is incorrect because the function simply doesn't exist.

### Fixes applied
- Updated the post title from "How to Use toNullable() and toNotNullable() in ClickHouse" to "How to Use toNullable() and assumeNotNull() in ClickHouse".
- Updated the Tags line to replace `toNotNullable` with `assumeNotNull`.
- Updated the Description metadata to reference `assumeNotNull()`.
- Updated the Overview paragraph to describe `assumeNotNull(value)` as the function that strips the `Nullable` wrapper.
- Renamed the section heading "toNotNullable() - Removing Nullable Wrapper" to "assumeNotNull() - Removing Nullable Wrapper" and removed the false equivalence sentence.
- Replaced all code examples that used `toNotNullable(...)` with `assumeNotNull(...)` (three code blocks in the "assumeNotNull() - Removing Nullable Wrapper", "Using assumeNotNull for Performance", and "Conditional Expression with Nullable" sections).
- Renamed the section heading "Using toNotNullable for Performance" to "Using assumeNotNull for Performance".
- Updated the Summary paragraph to refer only to `assumeNotNull()`.

## Review Notes
- The directory name on disk still contains `tonotnullable`. It was left unchanged to avoid breaking any existing URLs or inbound links; only the post content and metadata were corrected.
- All remaining technical claims were verified:
  - `toNullable(42)` producing a `Nullable(UInt8)` with value `42` is correct (literal `42` infers `UInt8`, then wrapped).
  - The `Nullable(T)` type declaration in `CREATE TABLE` is correct and supported by `MergeTree`.
  - `ALTER TABLE ... MODIFY COLUMN ... Nullable(T)` (and back) is supported by ClickHouse.
  - The note that `Nullable` columns carry per-row null-marker overhead matches the official data type documentation.
  - The `if()` return-type inference (Nullable when one branch is Nullable) is correct.
  - Functions used in supporting examples (`toTypeName`, `isNull`, `isNotNull`, `countIf`, `ifNull`, `COALESCE`) all exist and behave as described.
- `assumeNotNull` on a genuinely NULL value returns an arbitrary (default) value, not an error. The post correctly gates usage on `WHERE isNotNull(...)` / "where NULLs are guaranteed absent", which is the recommended pattern.
- Future improvement (not blocking): the `sum(assumeNotNull(required_field))` example could note that `sum` already ignores NULLs, so wrapping with `assumeNotNull` is primarily a type-shaping optimization when feeding the result into code that requires a non-Nullable type — not strictly needed for correctness of the aggregate itself.
