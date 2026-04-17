# Validation Summary: How to Calculate Storage Requirements for ClickHouse

## Status
validated

## Post Type
Guide / Capacity Planning Tutorial

## Technologies Covered
- ClickHouse (system.parts, TTL, ALTER TABLE, tiered storage)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse `system.parts` reference: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `formatReadableSize` function: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse TTL for columns and tables: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse multi-volume / tiered storage (`TO DISK`): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse `ALTER TABLE ... MODIFY TTL`: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl

## Issues Found
- **Partition-size query sorted lexicographically by a formatted string.** The "Account for Parts During Merges" query used `ORDER BY partition_size DESC`, where `partition_size` is the output of `formatReadableSize(...)` — a string like "10.5 GiB". String ordering would misrank partitions (e.g., "9 GiB" > "10 GiB" alphabetically, and "1 TiB" < "9 GiB"). Changed to `ORDER BY sum(bytes_on_disk) DESC` so the ranking is by actual byte size.

## Review Notes
- All `system.parts` columns referenced (`active`, `table`, `database`, `bytes_on_disk`, `data_compressed_bytes`, `data_uncompressed_bytes`, `rows`, `partition`, `min_date`, `max_date`) are valid in current ClickHouse. `min_date` / `max_date` are only populated when the partition key is a `Date` column; on purely `DateTime`/`DateTime64` partitioned tables those fields are zero, in which case `min_time` / `max_time` would be more informative. This is worth noting but not a correctness error since the query still runs.
- The storage formula math checks out: `(2 TB / 8) * 60 * 2 * 1.3 = 39 TB`.
- The claim that "ClickHouse temporarily doubles disk usage during large merges" is a reasonable worst-case approximation for a full-partition merge; in practice merges happen between a subset of parts, so 2x the largest *partition* as free space is a conservatively safe rule.
- The multi-rule TTL syntax (`TO DISK 's3_cold'`, `DELETE`) is valid and matches current ClickHouse documentation; it assumes a storage policy with a disk named `s3_cold` is configured in `storage_configuration`.
- The compression ratio ranges cited (logs 8–12x, metrics 5–8x, wide-NULL 15–20x) are plausible heuristics consistent with public ClickHouse case studies; the post correctly tells readers to measure rather than rely on them.
