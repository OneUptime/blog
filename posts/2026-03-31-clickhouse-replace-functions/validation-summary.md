# Validation Summary: How to Use replaceOne() and replaceAll() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (string replacement functions)
- SQL

## Sources Consulted
- ClickHouse official documentation on string replacement functions: https://clickhouse.com/docs/en/sql-reference/functions/string-replace-functions

## Issues Found

### Critical: `replace()` incorrectly described as first-occurrence function
- **What was wrong:** The entire post was built on the incorrect premise that `replace()` replaces only the first occurrence of a substring while `replaceAll()` replaces all occurrences. In ClickHouse, `replace()` is an **alias for `replaceAll()`** — it replaces all occurrences. The function that replaces only the first occurrence is `replaceOne()`.
- **What was changed:** 
  - Replaced all references to `replace()` (when used with first-occurrence semantics) with `replaceOne()` throughout the post, including the title, description, section headers, code examples, and explanatory text.
  - Fixed the first code example: `SELECT replace('aaa', 'a', 'b')` was claimed to return `'baa'` — it actually returns `'bbb'` since `replace()` = `replaceAll()`. Changed to `SELECT replaceOne('aaa', 'a', 'b')` which correctly returns `'baa'`.
  - Added explicit notes that `replace()` is an alias for `replaceAll()` in the introduction, function description section, and summary to prevent reader confusion.
  - Changed the URL normalization example from `replace()` to `replaceOne()` to match the stated intent of replacing only the first occurrence.
  - Updated section title "Using replace() in INSERT Pipelines" to "Using replaceAll() in INSERT Pipelines" since the code in that section only uses `replaceAll()`.
- **Why:** Using `replace()` where `replaceOne()` is intended would produce incorrect results in ClickHouse. For example, `replace('aaa', 'a', 'b')` returns `'bbb'`, not `'baa'` as the original post claimed. This is a common point of confusion because many other databases (e.g., MySQL, PostgreSQL) use `replace()` for all-occurrence replacement by default, but ClickHouse also has `replaceOne()` as a distinct function.

## Review Notes
- The remaining technical content (chaining `replaceAll()` calls, use with `arrayMap()`, `INSERT ... SELECT` pipelines, `replaceRegexpAll()` references, performance characteristics) is accurate.
- The lambda syntax `tag -> replaceAll(tag, '_', '-')` inside `arrayMap()` is correct ClickHouse syntax.
- The claim that these functions work on byte sequences rather than Unicode code points is accurate for ClickHouse's string functions.
