# Validation Summary: How to Handle Wide Tables (1000+ Columns) in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree engine, column storage, Map type, Nullable type)
- SQL (DDL, DML, ALTER TABLE settings)

## Sources Consulted
- ClickHouse Cloud usage limits and best practices: https://clickhouse.com/docs/cloud/bestpractices/usage-limits
- ClickHouse Nullable(T) documentation: https://clickhouse.com/docs/sql-reference/data-types/nullable
- ClickHouse "Avoid Nullable Columns" best practices: https://clickhouse.com/docs/en/cloud/bestpractices/avoid-nullable-columns
- ClickHouse Map(K, V) documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse MergeTree settings documentation: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse part types and storage formats: https://clickhouse.com/docs/knowledgebase/understanding-part-types-and-storage-formats
- ClickHouse full sorting merge join: https://clickhouse.com/blog/clickhouse-fully-supports-joins-full-sort-partial-merge-part3

## Issues Found

1. **Column limit overstated**: The post originally claimed ClickHouse supports "up to ~10,000 columns per table." The official ClickHouse documentation recommends a maximum of ~1,000 columns per table. Changed to reflect the official recommendation.

2. **Merge settings were just defaults, not tuning recommendations**: The post presented `merge_max_block_size = 8192` and `max_bytes_to_merge_at_max_space_in_pool = 161061273600` as "tuning" values, but these are the ClickHouse defaults (8192 rows per block and ~150 GiB). Updated to show actually reduced values (4096 and ~50 GiB) with an explanation of why lowering them helps with wide tables.

3. **Minor clarification on column storage**: Added "(in Wide part format)" to the claim that each column is a separate file on disk, since ClickHouse also has a Compact part format where all columns are stored in a single file. Wide format is used for larger parts, so the original claim was practically correct but imprecise.

## Review Notes
- The `Nullable(T)` overhead description as "null bitmap" is slightly imprecise — ClickHouse uses a separate UInt8 column (one byte per row) rather than a true bit-level bitmap. This means the overhead is actually larger than a bitmap. The advice to avoid Nullable is sound and well-supported by official best practices.
- Map column access (`features['key']`) performs a linear scan of the map, so performance depends on map size. This is worth noting for very large maps but is acceptable for the sparse feature use case described.
- The JOIN optimization on sorted keys is accurate — ClickHouse's full sorting merge join skips the sort phase when data is already sorted by the join key.
