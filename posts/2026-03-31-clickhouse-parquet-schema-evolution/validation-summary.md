# Validation Summary: How to Handle Schema Evolution When Loading Parquet in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL syntax, settings, table functions)
- Apache Parquet (file format, schema, type system)
- Amazon S3 (via ClickHouse s3() table function)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse Parquet Format Documentation: https://clickhouse.com/docs/interfaces/formats/Parquet
- ClickHouse Format Settings Documentation: https://clickhouse.com/docs/operations/settings/formats
- ClickHouse Working with Parquet Guide: https://clickhouse.com/docs/integrations/data-formats/parquet
- ClickHouse s3 Table Function Documentation: https://clickhouse.com/docs/sql-reference/table-functions/s3

## Issues Found

### 1. Wrong setting for "Skipping Unknown Columns" section
- **What was wrong:** The post recommended `input_format_parquet_skip_columns_with_unsupported_types_in_schema_inference = 0` to make extra/unknown Parquet columns cause an error. This setting actually controls whether columns with unsupported Parquet data types are skipped during schema inference — it has nothing to do with extra columns not present in the target table.
- **What was changed:** Replaced with `input_format_skip_unknown_fields = 0` (the correct general setting that controls whether unknown fields in input data cause errors) and added clarification that for Parquet specifically, extra columns are typically not read since ClickHouse matches columns by name.
- **Why:** The original setting controls an unrelated behavior (schema inference for unsupported types), not unknown/extra column handling.

### 2. Wrong settings for "Type Coercion" section
- **What was wrong:** The post listed two settings as enabling type coercion: `input_format_parquet_enable_row_group_prefetch = 1` (a performance setting for prefetching row groups during Parquet parsing) and `input_format_max_rows_to_read_for_schema_inference = 1000` (controls how many rows are sampled during schema inference). Neither setting has anything to do with type coercion.
- **What was changed:** Removed both incorrect settings and replaced with a note explaining that ClickHouse performs type coercion automatically when the target column type differs from the Parquet column type but the types are compatible, with no special setting needed.
- **Why:** Type coercion is built-in behavior in ClickHouse and has no dedicated toggle setting.

### 3. Inaccurate description of INT64 → UInt32 cast behavior
- **What was wrong:** The type coercion table described INT64 → UInt32 as "Cast (truncation possible)", implying silent data loss.
- **What was changed:** Changed to "Cast (error if value exceeds UInt32 range)" to accurately reflect that ClickHouse throws an error rather than silently truncating.
- **Why:** ClickHouse does not silently truncate out-of-range values; it raises an error, which is an important distinction for data pipeline reliability.

## Review Notes
- The `input_format_parquet_allow_missing_columns` setting (line 61) is correctly named and the default value of 1 is accurate per current ClickHouse documentation.
- The `input_format_parquet_case_insensitive_column_matching` setting is correctly documented with the default of 0.
- The column rename strategy using `coalesce()` with Nullable columns is a sound approach.
- The schema drift validation query using DESCRIBE with groupArray is a creative and valid approach.
- The s3() function call syntax variations used throughout the post (with and without credentials) are all valid.
