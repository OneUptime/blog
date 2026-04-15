# Validation Summary: How to Use ORC Format in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Apache ORC file format
- Apache Hive ecosystem
- Amazon S3 integration

## Sources Consulted
- [ORC Format | ClickHouse Docs](https://clickhouse.com/docs/interfaces/formats/ORC)
- [Format Settings | ClickHouse Docs](https://clickhouse.com/docs/operations/settings/formats)
- [s3 Table Function | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/table-functions/s3)
- [INTO OUTFILE Clause | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/select/into-outfile)
- [Working with Avro, Arrow, and ORC data in ClickHouse](https://clickhouse.com/docs/integrations/data-formats/arrow-avro-orc)
- [ORC Specification v1](https://orc.apache.org/specification/ORCv1/)
- [ORC ACID Support](https://orc.apache.org/docs/acid.html)

## Issues Found

1. **Type mapping used Java/Hive API names instead of ORC spec names**: The table listed BYTE, SHORT, and LONG as ORC types. These are Java/Hive ORC API names; the official ORC specification uses Tinyint, Smallint, and Bigint. Fixed to use ORC spec names throughout.

2. **Incorrect ClickHouse type for ORC Date**: The table mapped `Date` to ORC's Date type. ClickHouse actually maps ORC Date to `Date32` (which supports the wider range 1900-01-01 to 2299-12-31). Fixed to `Date32`.

3. **Incorrect ClickHouse type for ORC Timestamp**: The table mapped `DateTime` to ORC's Timestamp type. ClickHouse maps ORC Timestamp to `DateTime64` (which preserves sub-second precision). Fixed to `DateTime64`.

4. **Missing Decimal type**: The type mapping table omitted the Decimal type, which ClickHouse supports for ORC. Added `Decimal` to the table.

5. **Removed Nullable(T) → optional row**: ORC does not have a separate "optional" type. Nullability is handled via presence bits in each column, not through a type wrapper. Removed this misleading row from the table.

6. **Missing ZSTD compression method**: Both the introductory ORC features list and the compression settings section omitted `zstd`, which is a supported compression method in both the ORC spec and ClickHouse's ORC implementation. Added `zstd` to both locations.

7. **Deprecated setting not flagged**: `input_format_orc_import_nested` is marked as obsolete/deprecated in current ClickHouse versions. Added a note indicating the deprecation.

## Review Notes
- The `file()`, `s3()`, `DESCRIBE`, `INSERT INTO ... SELECT`, `INTO OUTFILE`, and `clickhouse-client` examples are all syntactically correct and use proper ClickHouse SQL.
- The S3 glob pattern `**/*.orc` is correctly supported by ClickHouse's s3() function.
- The `output_format_orc_row_index_stride` setting exists and the default of 10000 rows is correct per the ORC specification.
- General ORC claims (bloom filters per stripe, ACID semantics for Hive, predicate pushdown) are all accurate.
- The performance tips section is sound advice.
