# Validation Summary: How to Use cluster() and clusterAllReplicas() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- `cluster()` table function
- `clusterAllReplicas()` table function
- ClickHouse `remote_servers` cluster configuration
- ClickHouse `Distributed` table engine (referenced for comparison)
- ClickHouse system tables (`system.parts`)

## Sources Consulted
- Official ClickHouse docs: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- Official ClickHouse docs: https://clickhouse.com/docs/sql-reference/table-functions/cluster
- ClickHouse docs on `remote_servers` cluster configuration
- ClickHouse docs on the `Distributed` table engine

## Issues Found

1. **Incorrect "Inline Table Definition" section.** The post claimed both functions accept an inline SELECT query string as a single argument, e.g. `cluster('analytics_cluster', 'SELECT hostName() AS host, count() AS cnt FROM mydb.events')`. This is not a supported signature — the official docs list only `cluster('cluster_name', db.table[, sharding_key])` and `cluster('cluster_name', db, table[, sharding_key])` (same for `clusterAllReplicas`). Passing a SELECT string would be parsed as a database/table identifier, not executed as a subquery.
   - **Fix:** Replaced the section with a correct "Shorthand with db.table" section demonstrating the legitimate `db.table` shorthand form that the post had otherwise omitted.

2. **Imprecise performance terminology.** The Performance Tip said filtering on the partition or sorting key enables "shard-level pruning". Strictly, shard-level pruning (skipping whole shards) requires a filter on the sharding key; partition/sorting key filters reduce data scanned **within each shard** via partition pruning and primary-index skipping.
   - **Fix:** Reworded to "so the predicate is pushed down and less data is scanned at each shard", which accurately describes what happens.

## Review Notes
- The post's omission of the optional `sharding_key` argument is acceptable for an introductory guide; it is not required for read-only queries on a single-shard cluster and is typically used for inserts.
- The `remote_servers` XML example is valid ClickHouse config syntax. Modern ClickHouse also supports YAML config, but XML remains fully supported and is what upstream docs use.
- `hostName()` returns the host processing the query on each remote node, which is the correct function to attribute rows to specific replicas when using `clusterAllReplicas()`.
- The `system.parts` example uses unquoted identifiers (`system`, `parts`), which ClickHouse accepts; the string-literal form `'system', 'parts'` is equally valid.
