# Validation Summary: How to Use ReplacingMergeTree Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ReplacingMergeTree table engine
- SQL (DDL / DML)
- ClickHouse MergeTree family (OPTIMIZE, FINAL, partitioning)

## Sources Consulted
- ClickHouse ReplacingMergeTree reference: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse OPTIMIZE statement: https://clickhouse.com/docs/en/sql-reference/statements/optimize
- ClickHouse ReplacingMergeTree guide: https://clickhouse.com/docs/en/guides/replacing-merge-tree

## Issues Found

1. **"Arbitrary row" wording in Version Column Behavior section.**
   The post originally said that without a version column `ReplacingMergeTree()` keeps "an arbitrary row among duplicates (typically the last inserted)." The official docs are explicit that the behavior is deterministic: the most recently inserted row among rows participating in the merge is kept. Changed wording to "keeps the most recently inserted row among duplicates participating in a merge" to match the docs.

2. **Contradictory/misleading Limitations bullet about partitions and FINAL.**
   The original bullet stated "Deduplication only happens within the same partition" and then said "FINAL still deduplicates across partitions" in the same sentence, which is internally contradictory and also glosses over the `do_not_merge_across_partitions_select_final` setting. Rewrote the bullet to clearly separate (a) physical merges and `OPTIMIZE TABLE` only collapse data within a single partition, (b) `SELECT ... FINAL` does reconcile across partitions at query time by default but with a performance cost, (c) the `do_not_merge_across_partitions_select_final` setting disables that cross-partition work at query time, and (d) best practice is to partition so the same sorting key never appears in more than one partition.

## Review Notes

- The `is_deleted UInt8` soft-delete pattern shown in the post is still valid. ClickHouse 23.2+ also supports a native `ReplacingMergeTree(ver, is_deleted)` parameter form where the engine recognizes tombstone rows (cleaned up via `OPTIMIZE TABLE ... FINAL CLEANUP` when `allow_experimental_replacing_merge_with_cleanup` is enabled). Not a correction needed, but future revisions could mention the engine-native option.
- Using `DateTime` as the version column is supported (docs accept `UInt*`, `Date`, `DateTime`, `DateTime64`). For high-write workloads where multiple updates can land in the same second, a monotonic `UInt64` version or `DateTime64` is a safer tie-breaker since equal versions fall back to "last insert wins."
- The claim that "FINAL is slower than a regular scan" is still accurate as a general statement. Since ClickHouse 23.12 a number of optimizations have narrowed the gap (non-intersecting parts are read on a fast path), so "can be slower" would be more precise, but the original phrasing is not wrong.
- SQL in all examples is syntactically correct and would execute on current ClickHouse versions.
