# Validation Summary: How to Use SharedMergeTree Engine in ClickHouse Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SharedMergeTree table engine
- ClickHouse Cloud
- Object storage (Amazon S3, GCS)
- ClickHouse Keeper
- Lightweight deletes

## Sources Consulted
- ClickHouse SharedMergeTree documentation: https://clickhouse.com/docs/cloud/reference/shared-merge-tree
- ClickHouse MergeTree engine family documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse DELETE statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse 23.3 release blog post: https://clickhouse.com/blog/clickhouse-release-23-03
- ClickHouse Cloud SharedMergeTree blog post: https://clickhouse.com/blog/clickhouse-cloud-boosts-performance-with-sharedmergetree-and-lightweight-updates

## Issues Found
1. **Lightweight deletes version inaccuracy**: The post stated lightweight deletes were "introduced in ClickHouse 23.3." Lightweight deletes were actually introduced experimentally in ClickHouse 22.8 and became generally available in 23.3. Fixed to: "available since ClickHouse 22.8 and generally available since 23.3."

2. **Incomplete engine variant mapping**: The post listed only four MergeTree-to-SharedMergeTree mappings (MergeTree, ReplacingMergeTree, SummingMergeTree, AggregatingMergeTree). The official documentation lists additional variants. Added the missing mappings: CollapsingMergeTree -> SharedCollapsingMergeTree, VersionedCollapsingMergeTree -> SharedVersionedCollapsingMergeTree, and GraphiteMergeTree -> SharedGraphiteMergeTree.

## Review Notes
- All SQL syntax is correct and uses valid ClickHouse functions (toYYYYMM, count(), uniq(), now(), INTERVAL).
- The CREATE TABLE example correctly demonstrates how ClickHouse Cloud transparently converts MergeTree to SharedMergeTree.
- The system.tables query to verify the engine is a valid approach.
- The system.mutations query for checking mutation status is correct.
- The architectural explanation of shared object storage vs. per-replica storage is accurate.
- The limitation about SharedMergeTree being Cloud-only is correct as of the time of writing.
