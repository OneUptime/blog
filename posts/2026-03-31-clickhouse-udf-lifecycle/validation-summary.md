# Validation Summary: How to Manage UDF Lifecycle in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL UDFs via CREATE FUNCTION, executable UDFs via XML config)
- SQL (DDL statements: CREATE FUNCTION, CREATE OR REPLACE FUNCTION, DROP FUNCTION)
- ClickHouse system tables (system.functions)
- ClickHouse SYSTEM commands (SYSTEM RELOAD FUNCTIONS)

## Sources Consulted
- ClickHouse CREATE FUNCTION documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/function
- ClickHouse DROP FUNCTION documentation: https://clickhouse.com/docs/en/sql-reference/statements/drop
- ClickHouse SYSTEM statements documentation: https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse UDF (executable) documentation: https://clickhouse.com/docs/en/sql-reference/functions/udf
- ClickHouse system.functions table documentation: https://clickhouse.com/docs/en/operations/system-tables/functions
- ClickHouse INTO OUTFILE documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/into-outfile

## Issues Found
- **Inaccurate claim about automatic directory watching**: The post stated "ClickHouse watches the `user_defined` directory and reloads definitions automatically when files change." The official documentation does not confirm automatic file-watching behavior for executable UDF configs. The documented mechanism is `SYSTEM RELOAD FUNCTIONS`. The `lifetime` parameter in UDF XML config defaults to 0 (no automatic reload). Fixed by removing the unsubstantiated auto-reload claim and keeping the focus on the explicit `SYSTEM RELOAD FUNCTIONS` command, which the post already included.

## Review Notes
- The `create_query` and `origin` columns in `system.functions` are marked as **obsolete** in the official ClickHouse documentation. The queries using these columns (listing UDFs and backup/export) still work today but may break in future ClickHouse versions. Worth noting for future updates.
- The backup query using `INTO OUTFILE` is client-side only (works in `clickhouse-client` and `clickhouse-local`, but not via the HTTP interface). The post does not mention this limitation.
- Running the backup query a second time without `TRUNCATE` or `APPEND` would fail because the output file already exists. This is a minor practical caveat.
- Executable UDFs can also be defined in YAML format, not only XML. The post only mentions XML, which is not wrong but is incomplete.
- The `DROP FUNCTION` command supports an `IF EXISTS` clause that could be useful in migration scripts; the post omits this but it is not an error.
