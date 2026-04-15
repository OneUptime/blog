# Validation Summary: What Are Data Parts and Granules in ClickHouse

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse sparse primary index
- ClickHouse data parts and granules
- ClickHouse system.parts table
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation on primary indexes: https://clickhouse.com/docs/en/optimize/sparse-primary-indexes
- ClickHouse official documentation on data parts: https://clickhouse.com/docs/en/parts
- ClickHouse official documentation on system.parts table: https://clickhouse.com/docs/en/operations/system-tables/parts

## Issues Found
1. **Partition ID mismatch in directory example (line 19)**: The part directory was named `20240101_1_1_0/` but the inline comment said `partition=202401`, implying a monthly partition. The partition ID embedded in the directory name is `20240101`, which corresponds to a daily partition (e.g., `PARTITION BY toYYYYMMDD(ts)`). Fixed the comment to read `partition=20240101` for consistency.

## Review Notes
- The post simplifies the on-disk format by only showing `.bin` files. In practice, Wide format parts also contain `.mrk2` (or `.mrk3` for adaptive granularity) mark files alongside each `.bin` file. This simplification is acceptable for an introductory explainer and does not constitute an error.
- The statement "It contains one binary file per column" is accurate for Wide format parts but not for Compact format parts (where all columns are stored in a single file). Since Wide is the default for larger parts and this is an introductory post, the simplification is reasonable.
- The `HAVING parts > 300` threshold in the "Too Many Parts" query aligns with ClickHouse's default `parts_to_throw_insert` setting of 300. The post could mention `parts_to_delay_insert` (default 150) as an earlier warning threshold, but this is not an error.
- All SQL syntax is valid ClickHouse SQL. The CREATE TABLE statement, system table queries, and SETTINGS clause are all correct.
