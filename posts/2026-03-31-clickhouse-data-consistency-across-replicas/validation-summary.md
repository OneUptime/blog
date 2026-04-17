# Validation Summary: How to Check for Data Consistency Across ClickHouse Replicas

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree)
- ZooKeeper / ClickHouse Keeper
- `system.replicas` and `system.parts` system tables
- SQL administrative commands: `CHECK TABLE`, `SYSTEM SYNC REPLICA`, `ALTER TABLE ... DETACH/FETCH/ATTACH PART`

## Sources Consulted
- ClickHouse docs — system.replicas: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse docs — SYSTEM statements (SYNC REPLICA): https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse docs — CHECK TABLE: https://clickhouse.com/docs/en/sql-reference/statements/check-table
- ClickHouse docs — ALTER PARTITION (DETACH/ATTACH/FETCH PART): https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse docs — Data Replication / ReplicatedMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication

## Issues Found
1. **"force it to fetch from the leader"** — Inaccurate. ClickHouse uses multi-leader replication; there is no single leader for writes, and `SYSTEM SYNC REPLICA` pulls log entries and fetches parts from any peer replica. Reworded to mention peer replicas and note the multi-leader model.
2. **CHECK TABLE description** — The post claimed `CHECK TABLE` compares part checksums against ZooKeeper's stored checksums. Per the docs, `CHECK TABLE` verifies local part integrity against the checksums stored inside each part (`checksums.txt`). ZooKeeper-stored checksums are used during fetches/merges, not by `CHECK TABLE`. Rewrote the paragraph to describe local integrity checking and clarify how ZooKeeper checksums are used separately.
3. **"ALTER TABLE ... DETACH PART" auto-refetch claim** — The post said ClickHouse would automatically fetch the correct part from another replica after detach. This is wrong: detach moves the part to `detached/` and does not trigger a replica-side re-fetch. Added an explicit `ALTER TABLE ... FETCH PART` + `ATTACH PART` flow and updated the summary accordingly.

## Review Notes
- All listed `system.replicas` columns (`database`, `table`, `replica_name`, `is_leader`, `is_readonly`, `absolute_delay`, `queue_size`, `inserts_in_queue`, `total_replicas`, `active_replicas`, `last_queue_update`) exist and are accurate.
- `is_leader` is not deprecated but its meaning is narrow in modern ClickHouse — it indicates merge-scheduling eligibility, not write primacy. Many replicas can be leaders simultaneously. The post uses it only for observability, which is fine.
- `SYSTEM SYNC REPLICA [db.]name STRICT` syntax is valid; STRICT waits until the replication queue is fully empty and may never complete under steady write load — worth calling out operationally if the post were extended.
- The `FETCH PART ... FROM '/clickhouse/tables/{shard}/events'` path placeholder assumes a ZooKeeper path that uses `{shard}` macro substitution; readers should substitute their actual ZooKeeper path for the replicated table.
