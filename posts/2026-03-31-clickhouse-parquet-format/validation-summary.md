# Validation Summary: How to Use Parquet Format in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Apache Parquet
- Amazon S3 (via ClickHouse s3() table function)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse official documentation — Parquet format page: https://clickhouse.com/docs/en/interfaces/formats/Parquet
- ClickHouse official documentation — Format settings: https://clickhouse.com/docs/en/operations/settings/formats
- Apache Parquet format specification (type system and compression codecs)

## Issues Found

1. **DateTime type mapping was incorrect**: The type mapping table listed `DateTime → INT64 (TIMESTAMP_MICROS)`. According to official ClickHouse documentation, ClickHouse DateTime (32-bit, second precision) maps to Parquet `TIMESTAMP (64-bit, milliseconds)`, i.e., `INT64 (TIMESTAMP_MILLIS)`, not `TIMESTAMP_MICROS`. Changed to `INT64 (TIMESTAMP_MILLIS)`.

2. **Default compression codec was incorrect**: The post stated `snappy` is the default for `output_format_parquet_compression_method`. The official ClickHouse documentation states the default is `zstd`. Updated the available codecs list to show `zstd` as the default.

3. **Obsolete setting `input_format_parquet_import_nested`**: The post recommended enabling `input_format_parquet_import_nested = 1` for handling nested Parquet structures (repeated groups / lists of structs). According to official documentation, this setting is obsolete and does nothing — ClickHouse now handles nested Parquet structures automatically. Removed the setting recommendation and replaced with a note that ClickHouse handles this automatically.

## Review Notes
- The type mapping table is a simplified view. For example, ClickHouse Date (16-bit) is widened to Parquet DATE (32-bit) on output, and unsigned integer types carry logical type annotations (e.g., UINT_8, UINT_32) that aren't shown in the table. These simplifications are acceptable for a tutorial-level blog post.
- The `output_format_parquet_string_as_string` setting (which controls whether String outputs as BINARY or UTF8-annotated BYTE_ARRAY) is version-dependent; the blog's claim of `BYTE_ARRAY (UTF8)` is correct for modern ClickHouse defaults.
- All SQL syntax examples (file(), s3(), DESCRIBE, INTO OUTFILE, INSERT INTO...SELECT) are correct and follow current ClickHouse conventions.
- The clickhouse-client CLI example using `--query` with FORMAT Parquet and stdout redirection is correct.
- Performance tips are sound and align with best practices.
