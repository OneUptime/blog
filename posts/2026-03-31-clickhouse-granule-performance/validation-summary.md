# Validation Summary: What Is Granule in ClickHouse and Why It Matters for Performance

## Status
validated

## Post Type
Technical guide / reference explainer on ClickHouse internals (granules, sparse primary index, marks files, adaptive granularity).

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL (DDL and queries)
- ClickHouse system tables: `system.query_log`, `system.parts`, `system.parts_columns`
- ClickHouse `EXPLAIN indexes = 1`
- ProfileEvents: `SelectedMarks`, `SelectedRanges`
- Compression codecs (LZ4, ZSTD)

## Sources Consulted
- ClickHouse sparse primary indexes guide: https://clickhouse.com/docs/en/guides/best-practices/sparse-primary-indexes
- MergeTree settings reference: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- `system.parts` docs: https://clickhouse.com/docs/en/operations/system-tables/parts
- `system.events` / ProfileEvents docs: https://clickhouse.com/docs/operations/system-tables/events
- `system.query_log` docs: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse ProfileEvents source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp
- Adaptive granularity PR (`enable_mixed_granularity_parts`, `.mrk2`): https://github.com/ClickHouse/ClickHouse/pull/4826

## Issues Found
1. **Incorrect claim that compression is applied per granule.** The original "Granules and Compression" section stated that each granule is compressed independently and that smaller granules compress less efficiently because the compressor has less data per block. This conflates granules with compression blocks. In ClickHouse, compression is applied per *compression block*, controlled by `min_compress_block_size` (default 64KB) and `max_compress_block_size` (default 1MB). A single compression block typically contains multiple granules, and block sizes are independent of `index_granularity`, so shrinking granules does not by itself reduce the compression ratio.

   **Fix:** Rewrote the opening paragraph of the "Granules and Compression" section to describe compression blocks accurately and note that increasing compression block size is the correct lever for improving compression ratio. The accompanying `system.parts_columns` query was left unchanged because it is correct.

## Review Notes
- Approximate granule counts (122 for 1M rows, 122,000 for 1B rows at 8192 rows/granule) are fine because they are explicitly labeled "approximately".
- `.mrk2` is correct for Wide-format parts with adaptive granularity. Compact parts use `.mrk3` and non-adaptive Wide parts use `.mrk`; the post simplifies to `.mrk2` which matches the default modern MergeTree case, so not flagged.
- The primary index entry description (one entry per granule, storing the primary key values of the granule's first row) matches official docs.
- `EXPLAIN indexes = 1` output example (`Granules: 4/122`, `Parts: 1/3`) matches the current ClickHouse format.
- `SelectedMarks` and `SelectedRanges` ProfileEvents are valid; the query pattern against `system.query_log` is correct.
- The `sum(rows) / sum(marks)` ratio for avg rows per granule is correct in practice (marks ≈ granules per the docs, which say to multiply marks by index granularity to get approximate row count).
- The adaptive granularity example (`index_granularity_bytes = 10485760`, `enable_mixed_granularity_parts = 1`) is accurate; 10MB is the documented default for `index_granularity_bytes`.
