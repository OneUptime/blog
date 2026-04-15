# Validation Summary: What Is a MergeTree Engine and How It Works in ClickHouse

## Status
validated

## Post Type
Tutorial / Conceptual Guide

## Technologies Covered
- ClickHouse
- MergeTree storage engine and its variants (ReplicatedMergeTree, ReplacingMergeTree, AggregatingMergeTree, SummingMergeTree, CollapsingMergeTree)
- ClickHouse sparse primary index and granule-based indexing
- ClickHouse partitioning

## Sources Consulted
- ClickHouse official documentation — MergeTree engine family: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation — ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse official documentation — Custom partitioning key: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse official documentation — Data storage and parts: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#mergetree-data-storage
- ClickHouse official documentation — Primary keys and indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#primary-keys-and-indexes-in-queries

## Issues Found
- **Incorrect partition ID in part directory name**: The table is defined with `PARTITION BY toYYYYMM(ts)`, which produces a 6-digit partition ID (e.g., `202401` for January 2024). The example directory name was `20240101_1_1_0/` (8 digits, corresponding to `toYYYYMMDD`). Fixed to `202401_1_1_0/` to match the partition expression.

## Review Notes
- The ReplicatedMergeTree description says "via ZooKeeper." While ZooKeeper is still supported, modern ClickHouse deployments increasingly use ClickHouse Keeper (a built-in, ZooKeeper-compatible coordination service). This is not incorrect but could be updated in the future to mention ClickHouse Keeper as an alternative.
- The ReplacingMergeTree description says "Deduplicates by primary key on merge." Technically, it deduplicates by the sorting key (ORDER BY columns), which equals the primary key by default but can differ when PRIMARY KEY is explicitly set as a prefix of ORDER BY. Since the post does not introduce PRIMARY KEY as a separate concept, this simplification is acceptable for the audience level.
- The part directory file listing omits mark files (`.mrk2`/`.mrk3`) that exist alongside each `.bin` file. This is an acceptable simplification for an introductory post but readers building deeper mental models should know these exist.
