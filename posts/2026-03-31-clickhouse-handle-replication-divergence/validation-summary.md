# Validation Summary: How to Handle ClickHouse Replication Divergence

## Status
validated

## Post Type
Tutorial / Operational runbook

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- ClickHouse system tables (`system.parts`, `system.replication_queue`, `system.replicas`)
- ClickHouse Keeper / ZooKeeper (implicit, via replication)
- SQL / Bash

## Sources Consulted
- ClickHouse `system.parts` docs: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `system.replication_queue` docs: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse `system.replicas` docs: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `ALTER ... PARTITION|PART` docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse `SYSTEM` statements docs: https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse ReplicatedMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication

## Issues Found

1. **Nonexistent column `checksums_sha512` in `system.parts`.** The post selected `checksums_sha512` to compare part hashes between replicas, but that column does not exist. The actual hash columns are `hash_of_all_files` and `hash_of_uncompressed_files` (both sipHash128). Updated the `SELECT` statement and the surrounding prose to use these columns.

2. **Incorrect use of `ALTER TABLE ... DETACH PART` to isolate a fix to one replica.** The post told the reader to run `ALTER TABLE events DETACH PART ...` on the diverged replica and wait for a re-fetch. However, per the official docs, `DETACH PART` is a replicated operation — it moves the part to `detached/` on *all* replicas, so there is no peer left to re-fetch from. Replaced the procedure with the correct one: `SYSTEM STOP FETCHES`, filesystem-level `mv` of the bad part directory into `detached/` on the affected host only, then `SYSTEM START FETCHES` and `SYSTEM RESTART REPLICA` to trigger reconciliation against Keeper and re-fetch from a healthy replica.

## Review Notes
- The full-replica rebuild section (`DROP TABLE` + recreate with the same `ReplicatedMergeTree` path) is correct in broad strokes. In practice, operators may prefer `SYSTEM RESTORE REPLICA` (available in recent versions) or `SYSTEM DROP REPLICA` from another node before recreating, to ensure Keeper metadata is in a clean state. Not flagged as an error since the documented flow does work when Keeper entries for the replica remain intact.
- The `ALTER TABLE events DETACH PART ...` syntax shown originally is syntactically valid — the issue is semantic (it's replicated), not syntactic.
- The `absolute_delay` column in `system.replicas` is expressed in seconds; the post's advice to "monitor until it reaches zero" is correct.
- `system.replication_queue` does expose both `last_exception` and `last_attempt_time`, so that diagnostic query is accurate as written.
