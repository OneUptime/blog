# Validation Summary: How to Monitor Index Usage and Effectiveness in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine, primary keys, skip indexes)
- SQL (EXPLAIN statement, system table queries)
- ClickHouse system tables: `system.query_log`, `system.parts`, `system.data_skipping_indices`
- ClickHouse ProfileEvents

## Sources Consulted
- ClickHouse EXPLAIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse system.parts documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse system.data_skipping_indices documentation: https://clickhouse.com/docs/en/operations/system-tables/data_skipping_indices
- ClickHouse system.events / ProfileEvents documentation: https://clickhouse.com/docs/en/operations/system-tables/events
- ClickHouse ProfileEvents source (ProfileEvents.cpp): https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp
- ClickHouse Sparse Primary Indexes guide: https://clickhouse.com/docs/guides/best-practices/sparse-primary-indexes

## Issues Found

1. **`SkippedMarks` ProfileEvent does not exist.** The "Granule Skipping Ratio" section used `ProfileEvents['SkippedMarks']`, which is not a real ClickHouse ProfileEvent. Fixed by replacing with a calculation using `SelectedMarksTotal` (total marks before index filtering) minus `SelectedMarks` (marks actually read after filtering) to derive the number of skipped marks.

2. **`MergeTreeDataSelectorsSkippedGranules` ProfileEvent does not exist.** The "Measure Skip Index Effectiveness" section referenced a nonexistent ProfileEvent. Fixed by replacing the query with one that uses `SelectedMarksTotal` and `SelectedMarks` to compute skipped marks, which is the correct way to measure index filtering effectiveness.

3. **`secondary_indices_size` column does not exist in `system.parts`.** The "Part-Level Index Stats" section referenced a nonexistent column. ClickHouse provides three separate columns instead: `secondary_indices_compressed_bytes`, `secondary_indices_uncompressed_bytes`, and `secondary_indices_marks_bytes`. Fixed by replacing with `secondary_indices_compressed_bytes` and `secondary_indices_uncompressed_bytes`.

4. **Summary section referenced nonexistent `SkippedMarks`.** Updated to reference `SelectedMarksTotal` instead.

## Review Notes
- The `EXPLAIN indexes = 1` syntax and sample output format are correct and well-presented.
- The `system.query_log` queries for `SelectedParts`, `SelectedRanges`, and `SelectedMarks` ProfileEvents are correct.
- The `system.data_skipping_indices` table name and all queried columns are correct.
- The `tables` column in `system.query_log` is correctly used as an Array with both `has()` and array indexing.
- The `part_name` column in `system.parts` works (it's an alias for `name`), though `name` is the canonical column name.
- The division in the skipping ratio calculation could produce a division-by-zero if `SelectedMarksTotal` is 0; a production query might want to add `IF(SelectedMarksTotal > 0, ..., 0)` protection, but this is a minor concern for a tutorial context.
