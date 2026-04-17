# Validation Summary: How ClickHouse Column-Oriented Storage Works

## Status
validated

## Post Type
Guide / Internal architecture explainer

## Technologies Covered
- ClickHouse
- MergeTree table engine
- Columnar storage (.bin, .mrk3, primary.idx)
- LZ4 / ZSTD compression
- Delta / DoubleDelta encoding codecs
- Vectorized (SIMD) execution
- `system.columns` system table

## Sources Consulted
- ClickHouse `system.columns` documentation: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse `system.parts_columns` documentation: https://clickhouse.com/docs/en/operations/system-tables/parts_columns
- ClickHouse MergeTree storage documentation (data parts, .bin/.mrk3 files, primary.idx, columns.txt, count.txt, checksums.txt)
- ClickHouse `index_granularity` setting (default 8192 rows)

## Issues Found
- **First SQL query referenced a non-existent column `marks` in `system.columns`.** The `system.columns` system table exposes `marks_bytes` (size of the mark file in bytes) rather than a `marks` count column. Changed `marks` to `marks_bytes` so the query is syntactically valid. The count-of-marks value lives in `system.parts_columns`, but the minimal correction keeps the surrounding query shape intact.

## Review Notes
- The second SQL query uses `column` as a field of `system.columns`, which is correct — ClickHouse documents it as an alias for `name`.
- The on-disk file list (`.bin`, `.mrk3`, `primary.idx`, `columns.txt`, `count.txt`, `checksums.txt`) matches the layout of a Wide-format MergeTree part with adaptive granularity. For Compact-format parts the per-column `.bin`/`.mrk3` files are collapsed into `data.bin`/`data.mrk3`; this isn't wrong for the post but is worth noting for readers who inspect small parts.
- The `8192` default for `index_granularity`, LZ4 as the default compressor, ZSTD as an optional compressor, and Delta / DoubleDelta codecs for integer columns are all accurate.
- Vectorized execution with batches of up to 8192 values and SIMD is consistent with ClickHouse's architecture.
- The general performance claims (5–20x compression, 10–100x faster than row-oriented DBs for analytical workloads) are within the range ClickHouse's own benchmarks and marketing cite; they are qualitative order-of-magnitude statements rather than precise numbers.
