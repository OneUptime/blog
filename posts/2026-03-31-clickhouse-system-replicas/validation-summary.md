# Validation Summary: How to Use system.replicas to Monitor Replication in ClickHouse

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- system.replicas system table
- ZooKeeper / ClickHouse Keeper (coordination layer)
- SYSTEM RESTART REPLICA / SYSTEM SYNC REPLICA commands
- ALTER TABLE FETCH PART command
- clusterAllReplicas() table function
- Bash scripting for monitoring

## Sources Consulted
- ClickHouse official documentation — system.replicas: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse official documentation — SYSTEM statements: https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse official documentation — ALTER TABLE FETCH PARTITION/PART: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse official documentation — clusterAllReplicas() table function: https://clickhouse.com/docs/sql-reference/table-functions/cluster

## Issues Found

1. **`total_replicas` and `active_replicas` column types incorrect**: Listed as `UInt8` but the official documentation specifies `UInt32`. Fixed both to `UInt32`.

2. **Incorrect claim about `is_leader` exclusivity**: The post stated "exactly one replica per table should have `is_leader = 1`" in a healthy two-replica shard. The official ClickHouse documentation states: "Multiple replicas can be leaders at the same time." Each leader independently schedules background merges. Fixed the explanation to reflect that multiple concurrent leaders are normal, and that the real problem is when *no* replica is a leader.

3. **`absolute_delay` described as relative to "the leader"**: The post said `absolute_delay` is "Seconds this replica is behind the leader" and "computed relative to the leader's last write." According to the documentation, it measures lag relative to the most advanced replica, not specifically the leader. Fixed in the column table, intro paragraph, and Common Pitfalls section.

4. **`ALTER TABLE FETCH PART` missing critical detail**: The post showed the FETCH PART command without mentioning that it downloads the part to the `detached/` directory (not directly into the active dataset). A subsequent `ATTACH PART` command is required to make the data queryable. Added a comment noting the detached directory behavior and the follow-up ATTACH command.

## Review Notes
- All SQL queries are syntactically correct and use valid column names from system.replicas.
- The bash monitoring script is functional and uses correct clickhouse-client syntax including the `PrettyCompactNoEscapes` format.
- The `SYSTEM RESTART REPLICA` and `SYSTEM SYNC REPLICA` commands are valid and correctly described.
- The `clusterAllReplicas()` usage is correct for querying system tables across all cluster nodes.
- The post could benefit from mentioning ClickHouse Keeper as a modern alternative to ZooKeeper, since many deployments now use it, but this is not a technical error.
