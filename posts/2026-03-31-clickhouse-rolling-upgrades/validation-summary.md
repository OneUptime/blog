# Validation Summary: How to Perform Rolling Upgrades on ClickHouse Clusters

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- ClickHouse (cluster management, replication, rolling upgrades)
- ClickHouse BACKUP statement
- ClickHouse system tables (`system.replicas`, `system.one`)
- ClickHouse table functions (`clusterAllReplicas`)
- systemd service management
- apt package management

## Sources Consulted
- ClickHouse `system.replicas` documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse BACKUP statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/backup
- ClickHouse `clusterAllReplicas` table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/cluster
- ClickHouse HTTP interface / `/ping` endpoint documentation: https://clickhouse.com/docs/en/interfaces/http

## Issues Found
1. **`host_name` is not a column in `system.replicas`**: In the Prerequisites section, the query used `host_name` as a column name in `SELECT host_name, is_readonly, inserts_in_queue, merges_in_queue FROM clusterAllReplicas('production', system.replicas)`. The `system.replicas` table does not have a `host_name` column. Changed to `hostName()`, which is the correct built-in function for retrieving the hostname of the node executing the query. This is the standard pattern when using `clusterAllReplicas()` to identify which replica each row comes from.

## Review Notes
- The automation script at the end upgrades all nodes in a flat loop without distinguishing between leader and non-leader replicas, which is inconsistent with the post's own advice to upgrade non-leaders first. This is acceptable as a simplified example, but readers should be aware they would need to add leader detection logic for production use.
- The `sleep 30` in the automation script is a naive wait strategy. A production script should poll `inserts_in_queue` and `merges_in_queue` until they reach zero rather than using a fixed sleep.
- The claim that ClickHouse's replication protocol is "backward compatible for one version" is a reasonable simplification. The official guidance is that mixed-version clusters are supported temporarily during rolling upgrades, but should not remain in that state for extended periods.
- All other SQL queries, system table column references (`is_readonly`, `inserts_in_queue`, `merges_in_queue`, `is_leader`, `database`, `table`), the BACKUP syntax, the `/ping` health check endpoint, and the `clusterAllReplicas()` table function usage are correct.
