# Validation Summary: How to Convert Between Data Formats with clickhouse-local

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- clickhouse-local (CLI utility)
- Data formats: CSV, CSVWithNames, JSON (JSONEachRow), Parquet, TSV, TSVWithNames, Avro, ORC, Arrow

## Sources Consulted
- [clickhouse-local documentation](https://clickhouse.com/docs/operations/utilities/clickhouse-local)
- [Formats for Input and Output Data](https://clickhouse.com/docs/sql-reference/formats) (official ClickHouse format reference)
- [File table function documentation](https://clickhouse.com/docs/sql-reference/table-functions/file)
- [JSONEachRow format documentation](https://clickhouse.com/docs/interfaces/formats/JSONEachRow)
- [JSONObjectEachRow format documentation](https://clickhouse.com/docs/interfaces/formats/JSONObjectEachRow)
- [system.formats table documentation](https://clickhouse.com/docs/operations/system-tables/formats)
- [Extracting, Converting, and Querying Data in Local Files using clickhouse-local](https://clickhouse.com/blog/extracting-converting-querying-local-files-with-sql-clickhouse-local)
- [Working with Parquet in ClickHouse](https://clickhouse.com/docs/integrations/data-formats/parquet)
- [Working with CSV and TSV data in ClickHouse](https://clickhouse.com/docs/integrations/data-formats/csv-tsv)

## Issues Found
1. **Invalid format name `JSONArrayEachRow`**: In the "Available Formats" section, the post listed `JSONArrayEachRow` as a key ClickHouse format. This format does not exist in ClickHouse. The valid JSON row-oriented formats are `JSONEachRow`, `JSONCompactEachRow`, `JSONObjectEachRow`, and their string variants. Changed `JSONArrayEachRow` to `JSONCompactEachRow`.

## Review Notes
- The post states ClickHouse supports "over 20 input and output formats." ClickHouse actually supports 70+ formats, so while technically correct, this understates the capability. Not changed since it is not incorrect.
- The `clickhouse local` (space-separated) command syntax is correct for modern ClickHouse versions (22.x+), where the unified `clickhouse` binary accepts subcommands.
- The `--format` flag correctly specifies the output format when the input format is already defined via the `file()` table function.
- The type casting example correctly uses `CSV` (not `CSVWithNames`) with an explicit schema, which is appropriate for headerless CSV files. Users with header-bearing CSVs would need `CSVWithNames` instead, but this is implied by the format choice.
- All ClickHouse functions used (`toUInt64`, `toFloat64`, `toDate`, `parseDateTimeBestEffort`) are valid and current.
- The `system.formats` query is correct; the table has a `name` column as used.
