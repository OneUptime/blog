# Validation Summary: How to Handle Data Sovereignty with ClickHouse Multi-Region

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree, partitioning, storage policies, row policies, system.query_log)
- AWS S3 (region-specific buckets used as ClickHouse storage disks)
- XML configuration for ClickHouse disks and storage policies
- SQL (DDL, row-level access controls)

## Sources Consulted
- ClickHouse `system.query_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse `CREATE ROW POLICY` documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/row-policy
- ClickHouse storage policies / MergeTree settings documentation (MergeTree `storage_policy` setting)
- ClickHouse `ReplicatedMergeTree` and `PARTITION BY` documentation

## Issues Found
No technical issues found.

- The `CREATE TABLE ... ReplicatedMergeTree(...)` block uses valid syntax; `(...)` is an intentional placeholder for ZooKeeper path/replica name, consistent with documentation conventions.
- Tuple `PARTITION BY (data_region, toYYYYMM(ts))` is valid ClickHouse syntax.
- The storage policy XML layout (`<disks>`, `<policies>`, `<volumes>`, user-defined volume name `<v>`) matches ClickHouse's expected schema — volume names are user-defined.
- `SETTINGS storage_policy = 'eu_only'` is a valid MergeTree setting.
- `CREATE ROW POLICY name ON table USING condition TO role` matches the documented syntax.
- All columns referenced in the `system.query_log` query (`user`, `query_start_time`, `query`, `read_rows`, `type`, `tables`) exist, and `tables` is an `Array(LowCardinality(String))`, so `has(tables, 'user_events')` is correct.

## Review Notes
- The row policy example restricts `eu_analysts` to EU rows. In ClickHouse, once any permissive policy exists on a table, users without a matching policy see no rows by default (governed by `users_without_row_policies_can_read_rows`), so the described intent ("prevent EU data from being returned to non-EU query sources") is reasonable in combination with additional regional policies. Readers implementing this in production should add symmetric policies for other regions and verify the `users_without_row_policies_can_read_rows` setting for their cluster.
- The post mixes two valid sovereignty strategies: (1) a single table partitioned by `data_region` and (2) separate tables per region with different storage policies. Both are legitimate; strategy (2) is typically needed to physically route data to different object stores, because partitioning alone does not select disks — that requires either distinct tables with distinct storage policies or TTL TO DISK / MOVE PARTITION rules on a multi-disk policy.
- The `ReplicatedMergeTree(...)` placeholder is fine for brevity but readers must supply the ZooKeeper path and replica name before running.
