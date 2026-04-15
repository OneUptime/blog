# Validation Summary: How to Recover from Split-Brain in ClickHouse Replication

## Status
validated

## Post Type
Tutorial / Recovery Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree replication)
- ZooKeeper / ClickHouse Keeper
- clickhouse-keeper-client CLI utility
- clickhouse-client CLI
- ClickHouse system tables (system.replicas, system.zookeeper)
- ClickHouse table functions (clusterAllReplicas)

## Sources Consulted
- ClickHouse `system.replicas` table documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `clusterAllReplicas` table function documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- ClickHouse Keeper client documentation: https://clickhouse.com/docs/en/operations/utilities/clickhouse-keeper-client
- ClickHouse `SYSTEM SYNC REPLICA` statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/system#sync-replica
- ClickHouse `DETACH TABLE` documentation: https://clickhouse.com/docs/en/sql-reference/statements/detach
- ClickHouse `ATTACH TABLE` documentation: https://clickhouse.com/docs/en/sql-reference/statements/attach
- ClickHouse `system.zookeeper` table documentation: https://clickhouse.com/docs/en/operations/system-tables/zookeeper
- ClickHouse `hostName()` function documentation: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#hostname

## Issues Found
1. **Incorrect `ruok` invocation in `clickhouse-keeper-client`** (line 54): The post used `clickhouse-keeper-client -h localhost -p 9181 -q "ruok"`, but `ruok` is a four-letter-word (4LW) command that must be invoked through the `flwc` wrapper in the keeper client. The correct syntax is `clickhouse-keeper-client -h localhost -p 9181 -q "flwc ruok"`. Fixed by adding the `flwc` prefix.

## Review Notes
- The resync approach (detach table, delete data directory, re-attach) is correct and is a well-known ClickHouse recovery pattern. It works because table metadata lives in `/var/lib/clickhouse/metadata/` (which is preserved), while only data parts in `/var/lib/clickhouse/data/` are deleted. On re-attach, ClickHouse reads the metadata (including the ZooKeeper path), discovers it has no local parts, and fetches them from other replicas.
- The post could benefit from mentioning that this approach assumes ZooKeeper/Keeper metadata for the table is still intact and that at least one other replica has the correct data. If Keeper metadata is also corrupted, additional recovery steps would be needed.
- All 11 `system.replicas` columns referenced in the post (`database`, `table`, `replica_name`, `last_queue_update`, `queue_size`, `zookeeper_exception`, `future_parts`, `is_leader`, `log_max_index`, `log_pointer`, `absolute_delay`) are confirmed to exist in the official documentation.
- The `clusterAllReplicas` three-argument syntax (cluster, database, table) is correct per documentation.
- The `SYSTEM SYNC REPLICA` and `DETACH/ATTACH TABLE` syntax are both correct.
