# Validation Summary: How to Handle Split-Brain Scenarios in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- ClickHouse Keeper (Raft-based coordination)
- ZooKeeper (legacy coordination option)
- system.replicas system table
- SYSTEM DROP REPLICA / SYSTEM SYNC REPLICA commands

## Sources Consulted
- ClickHouse Replication docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- system.replicas reference: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse Keeper configuration: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- insert_quorum setting: https://clickhouse.com/docs/en/operations/settings/settings#insert_quorum
- SYSTEM DROP REPLICA: https://clickhouse.com/docs/en/sql-reference/statements/system#drop-replica
- SYSTEM SYNC REPLICA: https://clickhouse.com/docs/en/sql-reference/statements/system#sync-replica

## Issues Found

1. **Incorrect split-brain description (conceptual error):** The original text stated "both replicas believe they are the leader and accept writes independently," implying a leader-based replication model. ClickHouse uses multi-master asynchronous replication where all replicas can accept writes — this is normal behavior, not a split-brain symptom. The "leader" concept in ClickHouse only applies to scheduling background merges, not write acceptance. Fixed the description to accurately explain that split-brain occurs when replicas lose coordination with Keeper and can no longer synchronize their replication logs.

2. **Wrong setting name in section header:** The section header read "Set min_replicas_for_write" but there is no ClickHouse setting by that name (`min_replicas_for_write` is a Kafka/PostgreSQL concept). The actual XML config block correctly used `insert_quorum`. Fixed the header to "Set insert_quorum" to match the actual setting.

3. **Ambiguous recovery procedure:** The `SYSTEM DROP REPLICA` command in the recovery steps did not clarify that it must be run from a *different* (healthy) node, since the affected node is stopped in step 1. The docs confirm this command "cannot drop local replica." Added clarification in the comment that step 2 must be run from a healthy replica.

## Review Notes
- The error message `DB::Exception: Replica is not in active state.` could not be verified from official documentation, though `system.replicas` does have a `replica_is_active` map column, suggesting the concept exists in the codebase. Left as-is since it is plausible.
- The `insert_quorum` setting is current for self-hosted ClickHouse with ReplicatedMergeTree. In ClickHouse Cloud with SharedMergeTree, all inserts are quorum inserts by default, making this setting unnecessary.
- The post could benefit from mentioning `SYSTEM RESTART REPLICA` as an alternative lighter recovery step before resorting to `SYSTEM DROP REPLICA`, but this is an enhancement rather than an error.
