# Validation Summary: How to Detect Brute Force Attacks with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide (security threat detection with ClickHouse SQL)

## Technologies Covered
- ClickHouse (SQL, aggregate functions, CTEs, date/time functions)
- Authentication / security analytics patterns (brute force, credential stuffing, distributed attacks, account takeover detection)

## Sources Consulted
- ClickHouse `count` aggregate function reference: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count
- ClickHouse `groupArray` aggregate function reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse aggregate function combinators (`-Distinct`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse date/time functions reference (toStartOfMinute, INTERVAL syntax): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse SELECT/HAVING/CTE/FORMAT syntax docs

## Issues Found
No technical issues found.

Verified specifically:
- `countDistinct(x)` is valid (count with `-Distinct` combinator; equivalent to `uniqExact`).
- `groupArray(N)(x)` parametric form is valid — `N` limits array size.
- `toStartOfMinute()` is a valid ClickHouse date/time function.
- `INTERVAL N MINUTE` / `INTERVAL N HOUR` syntax is supported.
- Using column aliases in `HAVING` is supported in ClickHouse.
- `WITH name AS (SELECT ...)` CTEs joined with the base table are supported.
- `FORMAT TabSeparated` is a valid output format clause.
- `CAST(source_ip AS String)` is valid (handles cases where `source_ip` is `IPv4`/`IPv6`).

## Review Notes
- The post depends on an `auth_events` table from a referenced "authentication logs post" — readers must have that schema in place. Schema columns referenced (`source_ip`, `user_name`, `outcome`, `event_time`) are consistent throughout.
- Thresholds (e.g., `>= 20` failures in 15 minutes, `> 100` per 24 hours) are reasonable defaults but should be tuned to traffic volume; the author appropriately frames them as patterns rather than absolutes.
- The "Success After Failures" CTE+JOIN pattern is correct, though on very large tables an `EXISTS`/semi-join or `IN` subquery may be more performant; this is an optimization choice, not a correctness issue.
- `groupArray(5)(CAST(source_ip AS String))` order is indeterminate per ClickHouse docs — fine for "sample IPs" use case; readers should not rely on ordering.
