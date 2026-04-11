# Validation Summary: How to Store Dates in UTC in MySQL

## Status
validated

## Post Type
Tutorial / Best Practice Guide

## Technologies Covered
- MySQL (8.0+)
- SQL (DDL, DML, time zone functions)
- Python (datetime module, database connector usage)

## Sources Consulted
- MySQL 8.0 Reference Manual — Automatic Initialization and Updating for TIMESTAMP and DATETIME: https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html
- MySQL 8.0 Reference Manual — Date and Time Functions (UTC_TIMESTAMP, CONVERT_TZ, NOW): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — Data Type Default Values (expression defaults introduced in 8.0.13): https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual — Server System Variables (default-time-zone): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- Python 3.12+ Documentation — datetime.datetime.utcnow() deprecation: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- CPython Issue #103857 — Deprecate utcnow and utcfromtimestamp: https://github.com/python/cpython/issues/103857

## Issues Found

### 1. Invalid `ON UPDATE UTC_TIMESTAMP()` syntax
- **What was wrong:** The `CREATE TABLE` example used `ON UPDATE UTC_TIMESTAMP()` for the `updated_at` column. The MySQL `ON UPDATE` automatic update clause only accepts `CURRENT_TIMESTAMP` and its synonyms (`NOW()`, `LOCALTIME`, `LOCALTIMESTAMP`). `UTC_TIMESTAMP()` is not a synonym of `CURRENT_TIMESTAMP` and produces a syntax error (ERROR 1064).
- **What was changed:** Replaced `ON UPDATE UTC_TIMESTAMP()` with `ON UPDATE CURRENT_TIMESTAMP`.
- **Why:** Since the post already recommends setting `default-time-zone = '+00:00'` on the server, `CURRENT_TIMESTAMP` returns UTC and the behavior is equivalent. The `DEFAULT (UTC_TIMESTAMP())` expression default (with parentheses) is valid in MySQL 8.0.13+ and was left unchanged.

### 2. Deprecated `datetime.datetime.utcnow()` in Python example
- **What was wrong:** The Python code example used `datetime.datetime.utcnow()`, which was deprecated in Python 3.12.
- **What was changed:** Replaced with `datetime.datetime.now(datetime.timezone.utc)`.
- **Why:** `utcnow()` is deprecated because it returns a naive datetime that can be misinterpreted as local time. The replacement `now(timezone.utc)` returns a timezone-aware datetime and is the officially recommended approach.

## Review Notes
- The `DEFAULT (UTC_TIMESTAMP())` expression default syntax requires MySQL 8.0.13 or later. The post does not mention a minimum version requirement, which could cause confusion for users on older MySQL versions.
- The `CONVERT_TZ()` function with named time zones (e.g., `'America/New_York'`) requires the MySQL time zone tables to be populated via `mysql_tzinfo_to_sql`. If these tables are empty, `CONVERT_TZ()` returns NULL. The post does not mention this prerequisite.
- The "Avoiding TIMESTAMP Pitfalls" section uses `created_at` as an example column name, which was defined as `DATETIME` in the earlier `CREATE TABLE`. This could be slightly confusing since the demonstrated behavior only applies to `TIMESTAMP` columns, not `DATETIME`. The text itself is technically correct in its description of `TIMESTAMP` behavior.
