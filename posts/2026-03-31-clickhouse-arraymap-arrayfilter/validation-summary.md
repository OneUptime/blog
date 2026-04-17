# Validation Summary: How to Use arrayMap() and arrayFilter() in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL)
- Higher-order array functions: `arrayMap`, `arrayFilter`
- Lambda expressions
- Supporting ClickHouse functions: `multiIf`, `lower`, `concat`, `toString`, `least`, `notEmpty`, `trim`, `domain`, `length`

## Sources Consulted
- ClickHouse Array Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse String Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse Higher-Order Functions / lambda syntax reference

## Issues Found
No technical issues found.

Key items verified:
- Lambda syntax `element -> expression` and `(x, y) -> expression` is correct.
- `arrayMap(x -> x * 2, [1,2,3,4,5])` produces `[2,4,6,8,10]` — correct.
- `arrayFilter(x -> x > 0, [-3,-1,0,2,5,8])` produces `[2,5,8]` — correct.
- `arrayMap` accepting multiple parallel arrays with tuple-parameter lambdas is a supported feature; result `[10,40,90]` is correct.
- `multiIf(cond1, val1, cond2, val2, ..., else)` signature is correct.
- `trim(s)` with a single argument is a valid alias for `trimBoth(s)` and trims whitespace by default.
- `notEmpty()` is a valid ClickHouse function that returns 1 for non-empty strings/arrays and 0 otherwise.
- `domain(url)` is a valid URL function that extracts the hostname.
- `least(v, 1000)` clamps a value and is a valid function.
- Wrapping `arrayFilter()` with `length()` to count matches is idiomatic and correct.

## Review Notes
- The post is concise and accurate. All code examples should execute as described in any reasonably current ClickHouse release.
- The post does not specify a ClickHouse version, which is fine since the functions used have been stable for many years; no deprecation concerns.
- Minor stylistic consideration for the future: `arrayMap(t -> lower(t), tags)` could be simplified to `arrayMap(lower, tags)` in ClickHouse, but the explicit lambda form in the post is pedagogically clearer and equally correct — no change needed.
