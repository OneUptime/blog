# Validation Summary: How to Detach and Attach Partitions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (MergeTree engine, partition management)
- SQL DDL (ALTER TABLE PARTITION operations)
- ClickHouse system tables (`system.detached_parts`)
- ReplicatedMergeTree / Keeper / ZooKeeper coordination

## Sources Consulted
- ClickHouse ALTER TABLE PARTITION reference: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse SYSTEM statements reference: https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse `system.detached_parts` documentation: https://clickhouse.com/docs/en/operations/system-tables/detached_parts
- ClickHouse MergeTree partitioning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found

1. **Nonexistent `SYSTEM DROP DETACHED PARTS` command.** The post included `SYSTEM DROP DETACHED PARTS;` and a comment referring to it as the way to drop all detached parts. No such SYSTEM command exists in ClickHouse. Replaced with the correct `ALTER TABLE ... DROP DETACHED PARTITION` / `DROP DETACHED PART` syntax, plus a note that bulk cleanup requires enumerating `system.detached_parts` and issuing per-partition/part drops. Also fixed an earlier comment in the "Quick Partition Drop with Recovery Option" block that referenced the same nonexistent command.

2. **Inconsistent partition identifier (`'2024-01'` vs `202401`).** The top examples (`DETACH PARTITION`, `ATTACH PARTITION`, `ATTACH PARTITION FROM`) used the string `'2024-01'`, while every later example using the same `events` table used `202401`. The same table cannot have both partition identifiers — with `toYYYYMM(...)` partitioning (implied elsewhere in the post) the partition ID is the integer `202401`. Changed the top three examples to `202401` for consistency and correctness.

3. **Confusing guidance on detaching multiple partitions.** The original read "To detach all partitions in a single command, use `PART` with a specific part name, or loop through partitions." This conflates `DETACH PART` (single part by name) with detaching all partitions, and misses `DETACH PARTITION ALL`. Rewrote the sentence to accurately describe `DETACH PARTITION ALL`, `DETACH PART '<part_name>'`, and `DETACH TABLE` as three distinct operations.

## Review Notes
- The note about `allow_drop_detached` was added as a caveat rather than a hard requirement — current ClickHouse docs for the partition page do not flag it as mandatory, but the setting has historically gated `DROP DETACHED` operations and may still be enforced on older installs. Worth keeping as a hedge.
- `ATTACH PARTITION FROM` compatibility requirements are described as "same column names, types, and ordering key" — in practice ClickHouse also requires matching partition key, primary key, and storage policy; index/projection matching can additionally be enforced via `enforce_index_structure_match_on_partition_manipulation`. The post's description is not wrong, just incomplete; left as-is to preserve the author's voice.
- The `ON CLUSTER '{cluster}'` examples assume the macro substitution pattern is configured on the servers — this is a common convention but worth being aware of.
- `system.detached_parts` has additional useful columns (`reason`, `modification_time`, `path`, block number range) that weren't listed — the subset shown is valid, just not exhaustive.
