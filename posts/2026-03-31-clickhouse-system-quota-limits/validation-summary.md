# Validation Summary: How to Use system.quota_limits in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables, SQL-based access control, quota management)
- SQL (DDL: CREATE QUOTA, DQL: SELECT with JOINs)
- XML configuration (users.xml quota definitions)

## Sources Consulted
- ClickHouse official docs: system.quota_limits — https://clickhouse.com/docs/en/operations/system-tables/quota_limits
- ClickHouse official docs: system.quotas — https://clickhouse.com/docs/en/operations/system-tables/quotas
- ClickHouse official docs: system.quota_usage — https://clickhouse.com/docs/en/operations/system-tables/quota_usage
- ClickHouse official docs: CREATE QUOTA — https://clickhouse.com/docs/en/sql-reference/statements/create/quota
- ClickHouse official docs: Quotas (users.xml) — https://clickhouse.com/docs/en/operations/quotas

## Issues Found
1. **`duration` column type incorrect**: The Key Columns table listed `duration` as `UInt64`, but the official documentation specifies it as `UInt32`. Fixed the type in the table.
2. **Broken JOIN query in "Comparing Quotas Across Users"**: The SELECT clause referenced `q.quota_name`, but `system.quotas` has a column called `name`, not `quota_name`. This would cause a runtime error. Fixed to `q.name AS quota_name`.

## Review Notes
- The Key Columns table omits two newer columns present in current ClickHouse versions: `max_failed_sequential_authentications` and `max_queries_per_normalized_hash`. These are relatively niche and their omission does not harm the post's usefulness, but they could be added in a future update.
- The claim "ClickHouse 22.4+" for SQL-based CREATE QUOTA is approximately correct; SQL-based access control was introduced around that era, though the exact version may vary by feature.
- All SQL queries (after fixes), XML configuration examples, and the Mermaid diagram are technically accurate.
- The quota enforcement flow diagram is a reasonable simplification of the actual behavior.
