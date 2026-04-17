# Validation Summary: ClickHouse Cluster Deployment Checklist

## Status
validated

## Post Type
Checklist / Operations Guide

## Technologies Covered
- ClickHouse (server)
- ClickHouse Keeper
- ReplicatedMergeTree engine
- Distributed table engine
- XML configuration (macros, remote_servers)
- Networking (TCP ports, firewalling)

## Sources Consulted
- ClickHouse system.replicas docs: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse system.clusters docs: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse Keeper docs: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- ReplicatedMergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- Distributed engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- Network ports reference: https://clickhouse.com/docs/en/guides/sre/network-ports

## Issues Found
- The `system.replicas` query referenced `shard_num` and `replica_num`, which are not columns on that table (they live on `system.clusters`). Replaced with `database, table, replica_name, is_leader, absolute_delay` so the query actually runs and still surfaces per-replica lag information.

## Review Notes
- Default ports (9000 native, 9009 interserver, 9181 Keeper client, 9234 Keeper Raft) match ClickHouse's documented defaults.
- The `ruok` 4-letter-word probe works against ClickHouse Keeper because `ruok` is part of the default `four_letter_word_white_list`. If an operator narrows that list, the probe will fail — worth knowing but not incorrect as written.
- The `<cluster>` macro in the example is a custom macro (only `{shard}` and `{replica}` are referenced by ReplicatedMergeTree paths). It's harmless and can be useful for operators, just not required.
- The Keeper recommendation of "3 nodes, must be odd" is correct for quorum; 5 is also commonly used for larger clusters but isn't required for the basic checklist.
