# Validation Summary: How to Use system.parts Table for Partition Analysis in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse `system.parts` system table
- MergeTree engine family partition and part internals
- ClickHouse SQL functions (`formatReadableSize`, `nullIf`, `toDate`, `today()`)
- `ALTER TABLE ... DROP PARTITION` DDL
- `clickhouse-client` CLI

## Sources Consulted
- ClickHouse official documentation: system.parts table (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse official documentation: MergeTree settings — `parts_to_delay_insert` and `parts_to_throw_insert` (https://clickhouse.com/docs/en/operations/settings/merge-tree-settings)
- ClickHouse official documentation: ALTER TABLE DROP PARTITION (https://clickhouse.com/docs/en/sql-reference/statements/alter/partition)
- ClickHouse official documentation: formatReadableSize function (https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize)

## Issues Found

1. **Inconsistent compression ratio formula (line 61-62)**: The "Summary Per Table" query calculated `data_compressed_bytes / data_uncompressed_bytes`, yielding values < 1 (e.g., 0.3). The later "Compression Ratio Per Partition" section calculated `data_uncompressed_bytes / data_compressed_bytes`, yielding values > 1 (e.g., 5x). Both columns were named `compression_ratio`, which is confusing. Fixed the Summary Per Table query to use `uncompressed / compressed` for consistency with the rest of the post and the conventional meaning of "compression ratio" (higher = better compression).

2. **Misleading section title "Compression Ratio Per Column Group" (line 107)**: The query in this section groups by `database, table, partition` — it does not break down by column groups. Renamed to "Compression Ratio Per Partition" to accurately describe the query.

3. **Misleading section title "Find the Oldest and Newest Parts" (line 125)**: The query only retrieves the oldest parts (`ORDER BY modification_time ASC LIMIT 10`). Renamed to "Find the Oldest Parts" to match the actual query and surrounding text.

4. **Imprecise "Too many parts" threshold description (line 104)**: The post stated ClickHouse "slow[s] down writes with 'Too many parts' errors at 300 parts," conflating two separate thresholds. ClickHouse begins throttling (delaying) inserts at 150 active parts per partition (`parts_to_delay_insert` default) and throws errors rejecting inserts at 300 parts (`parts_to_throw_insert` default). Fixed to describe both thresholds with their setting names.

## Review Notes
- All SQL queries are syntactically valid ClickHouse SQL and use appropriate functions (`formatReadableSize`, `nullIf`, `toDate`, `today()`).
- The column names and types listed in the table are accurate for current ClickHouse versions. `min_time`/`max_time` were added in later versions but are present in all currently supported releases.
- The shell script uses `FORMAT PrettyCompactNoEscapes`, which is a valid ClickHouse output format for terminal use.
- The "Common Pitfalls" section correctly notes that `bytes_on_disk` includes checksums and index files beyond raw data, and that `min_date`/`max_date` show `1970-01-01` for non-date partition keys.
- The advice to pair `system.parts` with `system.merges` in the summary is sound guidance.
