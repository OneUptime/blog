# Validation Summary: How to Fix 'Unknown column' Errors in ClickHouse

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- ClickHouse system tables (`system.columns`, `system.query_log`, `system.replicas`)
- ClickHouse DDL (`ALTER TABLE ADD COLUMN`, `DESCRIBE TABLE`)
- Distributed tables and replication
- CTEs and subqueries

## Sources Consulted
- ClickHouse docs — `system.replicas`: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse docs — `system.columns`: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse docs — `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse docs — CTE / `WITH ... AS`: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse docs — `ALTER TABLE ... ADD COLUMN`: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse docs — `clusterAllReplicas` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster

## Issues Found
- **"Checking Column Availability Across Replicas" query referenced non-existent columns.** The original snippet selected `host_name`, `host_port`, and `columns` from `system.replicas`. According to the official documentation, `system.replicas` has `replica_name` and `columns_version`, but no `host_name`, `host_port`, or `columns` field — those names belong to `system.clusters`, and there is no plain `columns` field anywhere. The query would fail with an `UNKNOWN_IDENTIFIER` error (ironic for this post). Replaced with a correct query that uses the `clusterAllReplicas` table function over `system.columns` to verify column presence on each replica.

## Review Notes
- Error code `UNKNOWN_IDENTIFIER` and the error message format are accurate for current ClickHouse versions.
- The statement that ClickHouse column/identifier names are case-sensitive is correct.
- The statement that SELECT aliases are not visible in `WHERE` at the same query level (requiring `HAVING` or a CTE) matches ClickHouse's documented behavior.
- The `WITH agg AS (...) SELECT ... FROM agg` CTE syntax is supported.
- Fix 5's claim about `ALTER TABLE ADD COLUMN` making the column immediately available and having old parts return the default is accurate — ClickHouse does not rewrite existing parts on `ADD COLUMN`, and the declared (or implicit) default is returned for rows in old parts.
- `system.columns` fields (`name`, `type`, `comment`, `table`, `database`) and `system.query_log` fields (`event_time`, `user`, `query`) used in the diagnosis queries are correct.
