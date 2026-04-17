# Validation Summary: Common ClickHouse Replication Mistakes and How to Fix Them

## Status
validated

## Post Type
Guide / Reference (common-pitfalls list)

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- ZooKeeper / ClickHouse Keeper
- ClickHouse macros (`{shard}`, `{replica}`)
- `system.replication_queue` system table
- `insert_quorum` / `insert_quorum_timeout` settings
- `SYSTEM RESTORE REPLICA` / `ALTER TABLE ... FETCH PARTITION`

## Sources Consulted
- ClickHouse ReplicatedMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- `system.replication_queue` docs: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- `insert_quorum` settings docs: https://clickhouse.com/docs/en/operations/settings/settings#insert_quorum
- `SYSTEM RESTORE REPLICA` docs: https://clickhouse.com/docs/en/sql-reference/statements/system#restore-replica
- `ALTER TABLE ... PARTITION` docs: https://clickhouse.com/docs/sql-reference/statements/alter/partition

## Issues Found
1. **Mistake 6 — fabricated term "initial_sync_table"**: The original section was titled "Skipping the initial_sync_table Step After Adding a Replica" and claimed a manual fetch was required when adding a new replica. No such step or term exists in ClickHouse — creating a `ReplicatedMergeTree` with an existing ZooKeeper path triggers automatic data sync from peers. Rewrote the section to describe the actual use case of `SYSTEM RESTORE REPLICA`: recovering a replica whose metadata has been lost from ZooKeeper/Keeper while local parts remain on disk.
2. **Mistake 6 — invalid `FETCH PARTITION ALL` syntax**: `ALL` is supported for `DROP`, `DETACH`, `ATTACH`, and `ATTACH FROM`, but not for `FETCH PARTITION`, which requires an explicit `partition_expr`. Replaced with a correct example using a specific `<partition_id>` and noted the follow-up `ATTACH PARTITION` step.
3. **Mistake 6 — clarified automatic sync behavior**: Added a note that new replicas against an existing ZooKeeper path do not need this step, fixing the misleading framing of the original section.

## Review Notes
- Mistake 1 correctly notes that `{shard}` and `{replica}` require macros in `config.xml`; worth remembering that these are user-defined conventional macros, not built-in substitutions (only `{database}`, `{table}`, and `{uuid}` are built in).
- Mistake 5 sets `insert_quorum_timeout = 60000` (1 minute). This is valid but not the default — current ClickHouse defaults to 600000 ms (10 minutes). The post doesn't claim what the default is, so no fix needed; just a caveat for readers copying the snippet verbatim.
- Mistake 2's example shows two nodes with correctly distinct `{shard}` macros (01 vs 02), which is the corrected/good configuration rather than an explicit "bad" example. This is clear enough in context but could be strengthened in a future revision by adding a "wrong" example where both nodes share the same shard value.
- `system.replication_queue` columns and `ReplicatedMergeTree` DDL are accurate and current.
- ClickHouse Keeper recommendation (Mistake 4) is accurate and aligns with current best practice.
