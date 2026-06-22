# Validation Summary: How to Configure ClickHouse Memory and Resource Limits

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL settings and access control DDL
- ClickHouse server XML configuration
- ClickHouse system tables
- ClickHouse workload scheduling

## Sources Consulted
- ClickHouse Server Settings: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse Session Settings: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse Restrictions on Query Complexity: https://clickhouse.com/docs/operations/settings/query-complexity
- ClickHouse CREATE SETTINGS PROFILE: https://clickhouse.com/docs/sql-reference/statements/create/settings-profile
- ClickHouse ALTER USER: https://clickhouse.com/docs/sql-reference/statements/alter/user
- ClickHouse ALTER ROLE: https://clickhouse.com/docs/sql-reference/statements/alter/role
- ClickHouse CREATE QUOTA: https://clickhouse.com/docs/sql-reference/statements/create/quota
- ClickHouse system.quota_usage: https://clickhouse.com/docs/operations/system-tables/quota_usage
- ClickHouse system.processes: https://clickhouse.com/docs/operations/system-tables/processes
- ClickHouse system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.metrics: https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse Workload Scheduling: https://clickhouse.com/docs/operations/workload-scheduling
- ClickHouse Cache Types: https://clickhouse.com/docs/operations/caches

## Issues Found
- The per-query `max_memory_usage` example used `SELECT *` with `GROUP BY high_cardinality_column`, which is not valid SQL unless all selected columns are grouped or aggregated. Changed it to select the grouped column and `count()`.
- The GROUP BY external aggregation comment said the query "spills to disk" and "doesn't fail" when the threshold is exceeded. ClickHouse can use external aggregation when enabled, but the query is still subject to memory and temporary disk limits. Updated the wording to avoid implying failure is impossible.
- The `max_distributed_connections` example described the setting as "Threads for reading from remote servers." ClickHouse documents it separately from `max_threads` as remote-server connections. Updated the comment to "Connections for reading from remote servers."
- The workload management section showed CPU scheduling but did not mention that fair CPU-time allocation requires `cpu_slot_preemption`; otherwise scheduling is based on slot allocation. Added a concise comment matching the official workload scheduling caveat.

## Review Notes
The examples are intentionally generic and depend on table/user/role names existing in the target deployment. ClickHouse docs also note that Cloud system tables are local per node in some cases; cluster-wide monitoring in ClickHouse Cloud may require `clusterAllReplicas`.
