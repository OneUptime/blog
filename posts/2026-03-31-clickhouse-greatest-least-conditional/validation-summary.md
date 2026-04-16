# Validation Summary: How to Use GREATEST and LEAST for Conditional Logic in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- `greatest()` and `least()` conditional functions
- `ifNull()` function
- Nullable column handling

## Sources Consulted
- [ClickHouse Conditional Functions documentation](https://clickhouse.com/docs/sql-reference/functions/conditional-functions)
- [PR #65519 – Make functions `least` and `greatest` ignore NULL arguments](https://github.com/ClickHouse/ClickHouse/pull/65519)
- [PR #73344 – Add compat setting for sane NULL behavior in `least` and `greatest`](https://github.com/ClickHouse/ClickHouse/pull/73344)
- [Issue #65039 – LEAST/GREATEST return null if present](https://github.com/ClickHouse/ClickHouse/issues/65039)

## Issues Found
No technical issues found.

All claims and examples were verified against the official ClickHouse documentation:
- `greatest(3, 7, 5, 1) = 7` and `least(3, 7, 5, 1) = 1` – correct.
- `greatest(1, NULL, 3) = 3` and `least(NULL, NULL) = NULL` – correct under the current default behavior (ClickHouse 24.12+).
- The clamping idiom `greatest(lower, least(upper, value))` is a valid standard pattern.
- The comparison to aggregate `max()`/`min()` (operating vertically across rows) vs. row-level scalar `greatest()`/`least()` is accurate.
- Type promotion for mixed integer/float arguments (as used in the clamping examples) and cross-column use with timestamps are both supported.
- The `ifNull(..., sentinel)` workaround is a valid pattern for the best-available-value use case.

## Review Notes
- The NULL-ignoring behavior described in the post became the default only in ClickHouse 24.12 (PR #65519 / #73344). Users on older versions, or those with the `least_greatest_legacy_null_behavior` compat setting enabled, will see `greatest(1, NULL, 3)` return `NULL` instead of `3`. A brief version caveat could be a useful future addition, but the post is accurate for current ClickHouse and does not contain an error.
- The post does not discuss the behavior with arrays, strings, or mixed DateTime32/DateTime64 arguments, all of which are supported – this is a scope limitation rather than an inaccuracy.
