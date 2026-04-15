# Validation Summary: How to Use system.parts_columns in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system.parts_columns system table)
- ClickHouse SQL query syntax
- ClickHouse compression codecs (ZSTD, Delta)
- ClickHouse LowCardinality data type modifier
- ClickHouse formatReadableSize() function

## Sources Consulted
- ClickHouse official documentation for system.parts_columns: https://clickhouse.com/docs/operations/system-tables/parts_columns
- ClickHouse official documentation for system.parts: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse official documentation for compression codecs: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse official documentation for LowCardinality: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse official documentation for formatReadableSize: https://clickhouse.com/docs/sql-reference/functions/other-functions

## Issues Found

### 1. Incorrect column names in all SQL queries
**What was wrong:** The blog used `part_name`, `column_name`, and `column_type` as column names for `system.parts_columns`. The actual column names in ClickHouse are `name` (for the part name), `column` (for the column name), and `type` (for the column type). All six SQL queries in the post would have failed with "Unknown identifier" errors if run against a real ClickHouse instance.

**What was changed:** Replaced all occurrences of `part_name` with `name` (aliased as `part_name` in SELECT for readability), `column_name` with `column`, and `column_type` with `type` across all SQL queries (SELECT lists, WHERE clauses, GROUP BY clauses, and IN filters).

**Why:** These are the actual column names defined in the ClickHouse system table schema. The incorrect names would cause query execution errors.

### 2. Contradictory sentence about compression ratios
**What was wrong:** The section "Find Parts With Poorly Compressed Columns" opened with "Large uncompressed-to-compressed ratios below 1.0" — a ratio below 1.0 is by definition not "large," making the sentence self-contradictory.

**What was changed:** Reworded to "Uncompressed-to-compressed ratios below 1.0 indicate cases where compression actually increased the data size" which accurately describes the scenario the query detects.

**Why:** The original phrasing was confusing and contradictory. The query correctly looks for `column_data_compressed_bytes > column_data_uncompressed_bytes`, so the explanation should match.

## Review Notes
- The `avg_compression_ratio` alias in the "Evaluate Compression Per Column Type" query uses `avg()` of per-part ratios rather than the ratio of sums. This is technically a different metric than the ratio of totals used in the "Find the Most Storage-Heavy Columns" query. Both approaches are valid but produce different results — the avg-of-ratios can be skewed by small parts. This is a stylistic choice and not incorrect, but readers should be aware of the distinction.
- The division `column_data_uncompressed_bytes / column_data_compressed_bytes` in the Basic Query could produce a division-by-zero error if a column has zero compressed bytes (e.g., an empty part). Adding `AND column_data_compressed_bytes > 0` to the WHERE clause would be safer, but this is an edge case and not a correctness error in the post's context.
