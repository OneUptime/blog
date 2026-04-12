# Validation Summary: How to Use FROM_UNIXTIME() and UNIX_TIMESTAMP() in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (UNIX_TIMESTAMP(), FROM_UNIXTIME(), CONVERT_TZ(), DATE_FORMAT(), DATE_SUB(), NOW())
- SQL (DDL and DML)
- Unix epoch timestamps

## Sources Consulted
- MySQL 8.0 Reference Manual: UNIX_TIMESTAMP() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_unix-timestamp
- MySQL 8.0 Reference Manual: FROM_UNIXTIME() — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_from-unixtime
- MySQL 8.0 Reference Manual: DATE_FORMAT() format specifiers — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- Python `datetime` module used to independently verify all epoch ↔ datetime conversions

## Issues Found

### 1. Incorrect Unix epoch values throughout the post
- **What was wrong:** The epoch value `1743460800` was used in multiple examples as if it corresponded to `2026-03-31 00:00:00 UTC`. In reality, `1743460800` = `2025-03-31 22:40:00 UTC` (a completely different date and time). Similarly, the mermaid diagram used `1743424200` for `2026-03-31 14:30:00 UTC`, but that value actually corresponds to `2025-03-31 12:30:00 UTC`.
- **What was changed:** Replaced all occurrences of `1743460800` with `1774915200` (the correct epoch for `2026-03-31 00:00:00 UTC`). Replaced `1743424200` with `1774967400` (the correct epoch for `2026-03-31 14:30:00 UTC`).
- **Why:** These are factual errors — anyone running the original examples would get results for March 2025, not March 2026 as the comments and explanations claimed.

### 2. Misleading description of UNIX_TIMESTAMP() time zone behavior
- **What was wrong:** The bullet point said "Returns the value in the current session time zone," which implies the returned integer is somehow timezone-specific. Unix timestamps are always UTC-based epoch integers.
- **What was changed:** Reworded to "Interprets the date argument in the current session time zone," which accurately describes that the input is interpreted in the session timezone, while the output is always a UTC-based epoch.
- **Why:** The MySQL documentation states: "The server interprets date as a value in the session time zone and converts it to an internal Unix timestamp value in UTC." The original wording could mislead readers into thinking the returned integer varies with timezone in its meaning, rather than just in how the input is parsed.

## Review Notes
- The claim `UNIX_TIMESTAMP('1970-01-01 00:00:00')` returns `0` is only true when the session time zone is UTC. The post doesn't explicitly state this, but it's acceptable in context since the examples are implicitly UTC-oriented.
- The `FROM_UNIXTIME(32503680000)` example (year 3000) only works in MySQL 8.0.28+ where the timestamp range was extended. The post's caveat "(if within MySQL DATETIME range)" is adequate, though a version note could be helpful.
- All SQL syntax, format specifiers (`%W`, `%M`, `%d`, `%Y`, `%H`, `%i`, `%b`), DDL/DML statements, and other technical claims are correct.
- The 2038 problem value (2147483647 = 2038-01-19 03:14:07 UTC) was verified as correct.
