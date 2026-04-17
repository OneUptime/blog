# Validation Summary: How to Analyze Authentication Logs in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SQL functions, CTEs, partitioning, TTL)
- SQL (aggregation, time-series queries, tuple IN predicates)
- Authentication / audit log analysis

## Sources Consulted
- ClickHouse SQL Reference — Data Types (IPv4, LowCardinality, UUID, DateTime): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse SQL Reference — Functions (generateUUIDv4, toYYYYMMDD, toDate, toHour, toTimeZone): https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse SQL Reference — Aggregate Functions (count, countIf, groupArray, min, max): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse MergeTree Engine — PARTITION BY, ORDER BY, TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse SQL Reference — WITH / CTE and IN operators (including tuple IN): https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse SQL Reference — INTERVAL syntax: https://clickhouse.com/docs/en/sql-reference/data-types/special-data-types/interval

## Issues Found
- Prose/code mismatch in the "Account Lockout Candidates" section: the description said "Users with more than 5 failures in 15 minutes." but the query uses `HAVING failures >= 5`, which means "5 or more". Updated the prose to "Users with 5 or more failures in 15 minutes." to match the query.

## Review Notes
- All SQL is syntactically valid for modern ClickHouse: `generateUUIDv4()`, `IPv4`, `LowCardinality`, `countIf`, `groupArray`, `toYYYYMMDD`, `toTimeZone`, `toHour`, tuple `NOT IN` against a subquery, and CTEs via `WITH ... AS (...)` are all supported features.
- `PARTITION BY toYYYYMMDD(event_time)` produces one partition per day. Combined with a 365-day TTL this is still manageable (~365 active partitions), but ClickHouse generally recommends fewer, larger partitions (e.g. `toYYYYMM`) for long retention windows. Not an error — a tuning consideration for high-volume deployments.
- The "Geographic Anomaly - Multiple Countries Same User" section heuristic uses distinct source IPs as a proxy for countries; multiple IPs do not always imply multiple countries. The query is valid, but a true country-based check would require a GeoIP lookup (e.g., an IP-to-country dictionary). Left as-is since the post framing is clearly heuristic.
- `HAVING total_attempts > 5` (Success Rate per User) and `HAVING length(ips) >= 3` (Geographic Anomaly) both rely on referencing SELECT-list aliases in HAVING, which ClickHouse supports.
- The `recent_logins` CTE in "New Source IPs for Existing Users" is used only for its tuple `(user_name, source_ip)` with `event_time` — this works correctly, though aliasing the CTE as `r` and selecting `r.user_name` etc. is slightly verbose; not a correctness issue.
