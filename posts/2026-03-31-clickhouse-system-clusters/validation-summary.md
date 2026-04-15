# Validation Summary: How to Use system.clusters Table in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables, Distributed engine, cluster configuration)
- SQL (ClickHouse dialect)
- Bash scripting with clickhouse-client CLI

## Sources Consulted
- ClickHouse official documentation for system.clusters table: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse official documentation for Distributed table engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse official documentation for clusterAllReplicas() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- ClickHouse official documentation for aggregate functions (countDistinct): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count

## Issues Found
No technical issues found.

## Review Notes
- The `countDistinct()` function used in several queries is a supported alias for `uniqExact()` in modern ClickHouse (21.x+). Some older references may use `uniq()` or `count(DISTINCT ...)` instead, but `countDistinct` works correctly.
- The `replicas_per_shard` calculation uses integer division (`count() / countDistinct(shard_num)`). This produces correct results for uniform replication (e.g., 6/3=2) but would truncate for non-uniform setups. This is acceptable given the context of the example.
- The mention of a built-in `default` cluster on single-node setups is accurate for modern ClickHouse versions, which automatically create local cluster entries.
- All column names, types, and descriptions match the current ClickHouse documentation.
