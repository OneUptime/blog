# Validation Summary: How to Use File Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse `File` table engine
- ClickHouse `file()` table function
- ClickHouse data formats (CSV, TSV, JSONEachRow, Parquet, ORC, Native, LineAsString)
- `clickhouse-local`

## Sources Consulted
- ClickHouse docs - File table engine: https://clickhouse.com/docs/en/engines/table-engines/special/file
- ClickHouse docs - `file()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/file
- ClickHouse docs - server `path` setting: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings

## Issues Found
1. **Incorrect storage path for File engine tables.** The post claimed data was stored at `{user_files_path}/{table_name}.{format_extension}` (e.g. `/var/lib/clickhouse/user_files/csv_import.csv`). In ClickHouse Server the File engine always stores data at `{path}/data/{database}/{table_name}/data.{Format}` (e.g. `/var/lib/clickhouse/data/default/csv_import/data.CSV`). `user_files_path` is used by the `file()` table function, not by File engine tables. Updated the Syntax section, the "Creating a File Table (CSV)" section, the "Reading Data" section (including `cp`/`chown` commands), and the Parquet section to use the correct path.
2. **Incorrect claim that custom paths can be specified in CREATE TABLE.** The "Specifying a Custom File Path" section implied you could use `ENGINE = File(CSV)` with a custom path relative to `user_files_path`. Per the official docs, ClickHouse Server does not allow specifying a filesystem path for `File`; only `clickhouse-local` accepts a path argument. Rewrote the section to reflect this and to point users to `clickhouse-local` or the `file()` function.
3. **`file()` table function used an absolute path.** The example used `file('/var/lib/clickhouse/user_files/orders.csv', ...)`. The documented contract is that the path is relative to `user_files_path`. Changed the example to `file('orders.csv', ...)`.

## Review Notes
- The "Supported Formats" table lists conventional extensions (`.csv`, `.parquet`, etc.). These extensions are informational - File engine tables always store the backing file as `data.{FormatName}` regardless of the conventional extension - but the format names themselves (CSV, TSV, JSONEachRow, Parquet, ORC, Native, LineAsString) are valid ClickHouse format identifiers.
- `INSERT` behavior for File engine is append (existing files get new rows appended), which is not explicitly noted but is not contradicted either.
- Limitation about "one writer at a time" is technically stated as concurrent INSERTs waiting on each other (serialized) in the docs, which matches the spirit of the post's wording.
- The post does not mention that the File engine is not available in ClickHouse Cloud - worth noting in a future revision but not a technical inaccuracy.
