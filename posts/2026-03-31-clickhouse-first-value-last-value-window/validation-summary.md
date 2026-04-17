# Validation Summary: How to Use FIRST_VALUE() and LAST_VALUE() Window Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL window functions)
- SQL window function syntax: `FIRST_VALUE()`, `LAST_VALUE()`, `PARTITION BY`, `ORDER BY`, `ROWS BETWEEN`, `WINDOW` clause
- Analytics patterns: session analysis, first-touch attribution, LOCF carry-forward, rolling OHLC

## Sources Consulted
- ClickHouse official docs — Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse docs confirm support for: `first_value`, `last_value`, `WINDOW` clause, `ROWS BETWEEN` frame specification, `PARTITION BY` / `ORDER BY`
- Default frame behavior with `ORDER BY` in ClickHouse: `UNBOUNDED PRECEDING AND CURRENT ROW`

## Issues Found
No technical issues found.

All code examples are syntactically valid ClickHouse SQL. The core technical claims are correct:

- `FIRST_VALUE()` and `LAST_VALUE()` are supported window functions in ClickHouse.
- The crucial distinction about `LAST_VALUE()` with the default frame returning the current row's value (not the partition's last value) is accurate and a well-known gotcha.
- Using `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to get the partition's true last value is the correct workaround.
- The `WINDOW` clause syntax for reusing window definitions is supported in ClickHouse.
- Bounded frame specifications (e.g., `ROWS BETWEEN 4 PRECEDING AND CURRENT ROW`) are supported.
- The LOCF (last-observation-carried-forward) pattern using `LAST_VALUE` with the default frame is a valid and idiomatic use.

## Review Notes
- The comment `-- default in most engines` next to `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` is a mild simplification. In the SQL standard and several engines (e.g., PostgreSQL), the default frame with `ORDER BY` is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` rather than `ROWS`. For `FIRST_VALUE` / `LAST_VALUE` in most ordered cases the observable behavior is equivalent, and ClickHouse documents its default as `UNBOUNDED PRECEDING AND CURRENT ROW`, so the post's practical takeaway remains correct.
- In the OHLC rolling-window example, `LAST_VALUE(closing_price) ... ROWS BETWEEN 4 PRECEDING AND CURRENT ROW` equals the current row's `closing_price` (since the current row is the last in that frame). This is the intended "close" value, but readers should note the redundancy — it could simply be `closing_price`. This is a stylistic note, not a correctness issue.
- The post consistently uses uppercase `FIRST_VALUE` / `LAST_VALUE`; ClickHouse also accepts the lowercase `first_value` / `last_value` names documented in the reference — both work.
