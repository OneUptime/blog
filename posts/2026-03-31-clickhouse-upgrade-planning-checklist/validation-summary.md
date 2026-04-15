# Validation Summary: ClickHouse Upgrade Planning Checklist

## Status
validated

## Post Type
Checklist / Operations Guide

## Technologies Covered
- ClickHouse (server, client, system tables)
- systemd (service management)
- apt-get (package management)
- ClickHouse Keeper / ZooKeeper (coordination)
- Grafana / Superset (mentioned for version compatibility)

## Sources Consulted
- ClickHouse system.contributors table documentation: https://clickhouse.com/docs/en/operations/system-tables/contributors
- ClickHouse system.mutations table documentation: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse system.replicas table documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse system.merges table documentation: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse clusterAllReplicas function documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- ClickHouse hostName() function documentation: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#hostname

## Issues Found
1. **Incorrect query on `system.contributors` table**: The query `SELECT name, version FROM system.contributors LIMIT 5` referenced a `version` column that does not exist. The `system.contributors` table only has a single `name` column containing contributor names from the ClickHouse git history. It has nothing to do with client library compatibility. Replaced with a query using `uptime()` and a count from `system.databases` to capture useful pre-upgrade server state.

2. **Non-existent `host_name` column in `clusterAllReplicas` result**: The post-upgrade validation query used `host_name` as a column name in `SELECT host_name, table, absolute_delay FROM clusterAllReplicas('production', system.replicas)`. The `clusterAllReplicas` table function does not automatically inject a `host_name` column into results. Changed to `hostName()` function call, which is the correct way to retrieve the hostname of each node in a distributed query.

## Review Notes
- The rolling upgrade procedure and rollback commands use specific version numbers (24.1.0 and 23.12.0) as examples. These are illustrative and appropriate for a checklist post.
- The `WHERE progress < 1` filter on `system.merges` is technically redundant since all rows in that table represent in-progress merges, but it is not incorrect and serves as documentation of intent.
- The post correctly advises rolling upgrades for clustered deployments, which aligns with ClickHouse's official upgrade recommendations.
- All other system table column references (`system.mutations`, `system.replicas`, `system.merges`) were verified as correct.
