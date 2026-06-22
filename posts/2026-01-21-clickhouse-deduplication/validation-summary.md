# Validation Summary: How to Implement Deduplication in ClickHouse

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- MergeTree table engines
- ReplacingMergeTree
- CollapsingMergeTree
- VersionedCollapsingMergeTree
- FINAL queries
- argMax aggregation
- LIMIT BY
- Materialized views
- Python ClickHouse client usage patterns

## Sources Consulted
- ClickHouse ReplacingMergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse ReplacingMergeTree guide: https://clickhouse.com/docs/guides/replacing-merge-tree
- ClickHouse deduplicating inserts on retries guide: https://clickhouse.com/docs/guides/developer/deduplicating-inserts-on-retries
- ClickHouse deduplication strategies guide: https://clickhouse.com/docs/guides/developer/deduplication
- ClickHouse MergeTree table settings documentation: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse FINAL modifier documentation: https://clickhouse.com/docs/sql-reference/statements/select/from#final-modifier
- ClickHouse CollapsingMergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse VersionedCollapsingMergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/versionedcollapsingmergetree
- ClickHouse argMax aggregate function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax
- ClickHouse LIMIT BY clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/limit-by

## Issues Found
- The insert deduplication introduction referenced a non-existent `insert_deduplicate_block_hash_size` byte limit. Replaced it with the documented behavior: `*MergeTree` insert blocks are deduplicated by `block_id` while the ID remains in the deduplication log.
- The duplicate insert examples used `now()`, which can produce different inserted data and prevent block-level deduplication. Replaced those values with fixed timestamps.
- The `ReplacingMergeTree` description did not state that duplicates are identified by the `ORDER BY` key. Updated the comment to match ClickHouse's documented uniqueness rule.
- The `is_deleted` example claimed the query should filter `WHERE is_deleted = 0`. For `ReplacingMergeTree(ver, is_deleted)`, `FINAL` performs deletion removal for latest deleted rows. Updated the query and comment accordingly.
- The `argMax` example omitted the documented nondeterministic behavior when multiple rows tie on the maximum value. Added a short caveat.
- The "Custom Deduplication Key" section only configured the replicated deduplication window. Renamed it to a custom deduplication token example and added `insert_deduplication_token`.
- The `OPTIMIZE TABLE users` comment implied it triggers background merges. Updated it to describe the command as requesting an unscheduled merge.
- The `uniqExact` example was labeled as an estimate and "fast"; `uniqExact` is exact and can use more memory. Updated the wording.
- The Python upsert snippet was labeled "check-then-insert" but did not check first, and used placeholder syntax that may not match the common ClickHouse client insert pattern. Updated it to an append-only insert with a tuple batch and clarified eventual deduplication.
- The conclusion recommended periodic forced merges too broadly. Updated it to recommend forced merges sparingly when the operational cost is acceptable.

## Review Notes
The materialized view examples are valid as eventual deduplication patterns, but future revisions could explain that materialized views process inserted blocks and that ReplacingMergeTree-backed destination tables may still need `FINAL` or background merges before reads are fully deduplicated.
